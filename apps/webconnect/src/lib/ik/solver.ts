import { ROBOT_CONFIG } from '@lib/config';
import { IKError, logger } from '@lib/core';
import { clamp } from '@lib/utils';
import { CCDIKSolver } from 'three-stdlib';
import { Object3D, Quaternion, Vector3 } from 'three';
import type { URDFJoint } from 'urdf-loader';
import type { RobotModel } from '@lib/urdf';

export interface JointLimits {
	lower: number;
	upper: number;
}

export interface RobotIKSolverOptions {
	chain?: string[];
	endEffector?: string;
	iterations?: number;
}

interface CCDMesh {
	skeleton: {
		bones: Object3D[];
	};
}

const WORK_VEC = new Vector3();

export class RobotIKSolver {
	private readonly model: RobotModel;
	private readonly joints: Map<string, URDFJoint>;
	private readonly jointLimits: Map<string, JointLimits>;
	private readonly jointAxes: Map<string, Vector3>;
	private readonly jointInitialQuats: Map<string, Quaternion>;
	private readonly chain: string[];
	private readonly jointChain: URDFJoint[];
	private readonly hierarchy: Object3D[];

	private readonly targetObject: Object3D;
	private readonly effector: Object3D;
	private readonly meshProxy: CCDMesh;
	private readonly solver: CCDIKSolver;
	private readonly iterations: number;

	constructor(model: RobotModel, options: RobotIKSolverOptions = {}) {
		this.model = model;
		this.joints = model.joints;
		this.chain = options.chain ?? Object.values(ROBOT_CONFIG.jointNames);
		this.iterations = options.iterations ?? 10;

		this.jointLimits = new Map();
		this.jointAxes = new Map();
		this.jointInitialQuats = new Map();

		this.ensureChain();
		this.extractJointMetadata();

		this.effector = this.resolveEndEffector(options.endEffector);
		this.hierarchy = this.buildHierarchy(this.effector);
		const jointOrderMap = new Map<string, number>();
		this.hierarchy.forEach((node, index) => {
			if (this.isURDFJoint(node)) {
				jointOrderMap.set(node.name, index);
			}
		});

		const orderedChainNames = this.chain
			.filter((name) => {
				if (!jointOrderMap.has(name)) {
					logger.warn('Joint not found in kinematic chain, ignoring', { name });
					return false;
				}
				return true;
			})
			.sort((a, b) => (jointOrderMap.get(a) ?? 0) - (jointOrderMap.get(b) ?? 0));
		if (!orderedChainNames.length) {
			throw new IKError('No valid joints found in kinematic chain');
		}
		this.chain = orderedChainNames;
		this.jointChain = this.chain.map((name) => this.requireJoint(name));
		this.targetObject = this.createTargetObject();

		const bones = this.createBoneList();
		this.meshProxy = { skeleton: { bones } };
		const links = this.hierarchy
			.slice(0, -1)
			.reverse()
			.map((node) => {
				const link = {
					index: bones.indexOf(node),
					enabled: true
				};

				return link;
			});

		this.solver = new CCDIKSolver(
			this.meshProxy as unknown as any,
			[
				{
					target: bones.indexOf(this.targetObject),
					effector: bones.indexOf(this.effector),
					links,
					iteration: this.iterations
				} as any
			]
		);

		logger.info('IK solver initialized with CCDIKSolver', {
			chain: this.chain,
			effector: this.effector.name,
			target: this.targetObject.name
		});
	}

	get target(): Object3D {
		return this.targetObject;
	}

	get iterationCount(): number {
		return this.iterations;
	}

	setJointAngle(jointName: string, angle: number): void {
		const joint = this.requireJoint(jointName);
		const limits = this.jointLimits.get(jointName);
		const clamped = limits ? clamp(angle, limits.lower, limits.upper) : angle;

		joint.setJointValue(clamped);
		joint.updateMatrixWorld(true);
	}

	getJointAngle(jointName: string): number {
		const joint = this.requireJoint(jointName);
		return joint.angle ?? 0;
	}

	setTarget(position: Vector3): void {
		this.alignTarget(position);
		this.updateChainMatrices();
	}

	solve(target: Vector3): void {
		this.alignTarget(target);
		this.updateChainMatrices();
		this.solver.update();
		this.syncJointValuesFromPose();
		this.updateChainMatrices();
	}

	dispose(): void {
		if (this.targetObject.parent) {
			this.targetObject.parent.remove(this.targetObject);
		}

		logger.info('IK solver disposed');
	}

	private ensureChain(): void {
		if (!this.chain.length) {
			throw new IKError('IK chain cannot be empty');
		}

		for (const jointName of this.chain) {
			if (!this.joints.has(jointName)) {
				throw new IKError(`Joint not found in model: ${jointName}`);
			}
		}
	}

	private extractJointMetadata(): void {
		for (const [name, joint] of this.joints.entries()) {
			if (joint.limit) {
				this.jointLimits.set(name, {
					lower: joint.limit.lower,
					upper: joint.limit.upper
				});
			}

			const axis = joint.axis?.clone().normalize() ?? new Vector3(0, 0, 1);
			this.jointAxes.set(name, axis);
			this.jointInitialQuats.set(name, joint.quaternion.clone());
		}
	}

	private resolveEndEffector(name?: string): Object3D {
		const targetName = name ?? 'end_tip';
		const effector = this.model.robot.getObjectByName(targetName);
		if (!effector) {
			throw new IKError(`End effector not found: ${targetName}`);
		}

		return effector;
	}

	private createTargetObject(): Object3D {
		const effectorWorld = new Vector3();
		this.model.robot.updateMatrixWorld(true);
		this.effector.getWorldPosition(effectorWorld);

		const target = new Object3D();
		target.name = 'ik-target';
		this.model.robot.add(target);
		target.position.copy(this.model.robot.worldToLocal(effectorWorld.clone()));
		target.updateMatrixWorld(true);

		return target;
	}

	private createBoneList(): Object3D[] {
		const bones: Object3D[] = [...this.hierarchy, this.targetObject];
		return bones;
	}

	private alignTarget(target: Vector3): void {
		const localTarget = target.clone();
		this.model.robot.worldToLocal(localTarget);
		this.targetObject.position.copy(localTarget);
		this.targetObject.updateMatrixWorld(true);
	}

	private updateChainMatrices(): void {
		this.model.robot.updateMatrixWorld(true);
		this.targetObject.updateMatrixWorld(true);
		this.effector.updateMatrixWorld(true);
		for (const node of this.hierarchy) {
			node.updateMatrixWorld(true);
		}
	}

	private syncJointValuesFromPose(): void {
		for (const joint of this.jointChain) {
			const initial = this.jointInitialQuats.get(joint.name);
			const axis = this.jointAxes.get(joint.name);

			if (!initial || !axis) {
				continue;
			}

			const delta = initial.clone().invert().multiply(joint.quaternion);
			const angle = this.axisAngleFromQuaternion(delta, axis);
			this.setJointAngle(joint.name, angle);
		}
	}

	private axisAngleFromQuaternion(quaternion: Quaternion, axis: Vector3): number {
		const normalizedAxis = axis.clone().normalize();
		const sinHalf = Math.sqrt(quaternion.x ** 2 + quaternion.y ** 2 + quaternion.z ** 2);
		let angle = 2 * Math.atan2(sinHalf, quaternion.w);

		if (angle > Math.PI) {
			angle -= 2 * Math.PI;
		} else if (angle < -Math.PI) {
			angle += 2 * Math.PI;
		}

		if (sinHalf > 1e-6) {
			const direction = WORK_VEC.set(quaternion.x, quaternion.y, quaternion.z).normalize();
			if (direction.dot(normalizedAxis) < 0) {
				angle = -angle;
			}
		}

		return angle;
	}

	private requireJoint(name: string): URDFJoint {
		const joint = this.joints.get(name);
		if (!joint) {
			throw new IKError(`Joint not found: ${name}`);
		}
		return joint;
	}

	private buildHierarchy(endNode: Object3D): Object3D[] {
		const path: Object3D[] = [endNode];
		let current: Object3D | null = endNode.parent;

		while (current) {
			path.push(current);
			if (current === this.model.robot) {
				break;
			}
			current = current.parent;
		}

		return path.reverse();
	}

	private isURDFJoint(object: Object3D): object is URDFJoint {
		return 'isURDFJoint' in object && (object as URDFJoint).isURDFJoint === true;
	}
}
