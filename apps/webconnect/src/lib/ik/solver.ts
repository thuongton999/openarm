import { ROBOT_CONFIG } from '@lib/config';
import { IKError, logger } from '@lib/core';
import { clamp } from '@lib/utils';
import * as THREE from 'three';
import type { URDFJoint } from 'urdf-loader';

export interface JointLimits {
	lower: number;
	upper: number;
}

interface SolveOptions {
	maxIterations?: number;
	tolerance?: number;
	stepFactor?: number;
}

export class RobotIKSolver {
	private readonly joints: Map<string, URDFJoint>;
	private readonly limits: Map<string, JointLimits>;
	private readonly chain: URDFJoint[];
	private readonly root: THREE.Object3D | null;
	private readonly endEffector: THREE.Object3D;
	private readonly tempVecA = new THREE.Vector3();
	private readonly tempVecB = new THREE.Vector3();
	private readonly tempVecC = new THREE.Vector3();
	private readonly tempQuat = new THREE.Quaternion();

	constructor(joints: Map<string, URDFJoint>) {
		this.joints = joints;
		this.limits = new Map();
		this.chain = this.buildChain();
		this.root = this.chain.length > 0 ? this.findRoot(this.chain[0]) : null;
		this.endEffector = this.findEndEffector();
		this.extractLimits();
	}

	private extractLimits(): void {
		this.joints.forEach((joint, name) => {
			if (joint.limit) {
				this.limits.set(name, {
					lower: joint.limit.lower,
					upper: joint.limit.upper
				});
				logger.debug('Joint limits', { name, lower: joint.limit.lower, upper: joint.limit.upper });
			}
		});
	}

	setJointAngle(jointName: string, angle: number): void {
		const joint = this.joints.get(jointName);
		if (!joint) {
			throw new IKError(`Joint not found: ${jointName}`);
		}

		// Clamp to limits using utility function
		const limits = this.limits.get(jointName);
		const clampedAngle = limits ? clamp(angle, limits.lower, limits.upper) : angle;

		joint.setJointValue(clampedAngle);
	}

	solve(target: THREE.Vector3, options: SolveOptions = {}): boolean {
		if (!this.endEffector) {
			throw new IKError('End effector not found for IK solver');
		}

		const maxIterations = options.maxIterations ?? 25;
		const tolerance = options.tolerance ?? 0.0025;
		const stepFactor = clamp(options.stepFactor ?? 1, 0.01, 1);
		const targetPos = target.clone();

		for (let iteration = 0; iteration < maxIterations; iteration++) {
			this.updateChainWorldMatrices();
			const effectorPos = this.getEndEffectorPosition();

			if (effectorPos.distanceTo(targetPos) <= tolerance) {
				logger.debug('IK converged', { iteration });
				return true;
			}

			for (let i = this.chain.length - 1; i >= 0; i--) {
				const joint = this.chain[i];
				const jointPos = this.getJointWorldPosition(joint);
				const toEffector = effectorPos.clone().sub(jointPos);
				const toTarget = targetPos.clone().sub(jointPos);

				if (toEffector.lengthSq() < 1e-10 || toTarget.lengthSq() < 1e-10) {
					continue;
				}

				toEffector.normalize();
				toTarget.normalize();

				const dot = clamp(toEffector.dot(toTarget), -1, 1);
				let angle = Math.acos(dot);

				if (angle < 1e-5) {
					continue;
				}

				const rotationAxis = this.tempVecA.copy(toEffector).cross(toTarget);
				if (rotationAxis.lengthSq() < 1e-10) {
					continue;
				}
				rotationAxis.normalize();

				const jointAxis = this.getJointWorldAxis(joint);
				const sign = Math.sign(rotationAxis.dot(jointAxis));
				if (sign === 0) {
					continue;
				}

				angle *= sign * stepFactor;

				const currentAngle = this.getJointAngle(joint.name);
				this.setJointAngle(joint.name, currentAngle + angle);
				this.updateChainWorldMatrices();

				const newEffectorPos = this.getEndEffectorPosition();
				if (newEffectorPos.distanceTo(targetPos) <= tolerance) {
					logger.debug('IK converged after joint update', { iteration, joint: joint.name });
					return true;
				}

				effectorPos.copy(newEffectorPos);
			}
		}

		logger.warn('IK did not converge within iteration limit', { maxIterations });
		return false;
	}

	private buildChain(): URDFJoint[] {
		const jointOrder = [
			ROBOT_CONFIG.jointNames.base,
			ROBOT_CONFIG.jointNames.arm1,
			ROBOT_CONFIG.jointNames.arm2
		];

		const chain: URDFJoint[] = [];
		for (const name of jointOrder) {
			const joint = this.joints.get(name);
			if (!joint) {
				logger.warn('Joint missing from IK chain', { name });
				continue;
			}

			chain.push(joint);
		}

		if (chain.length === 0) {
			throw new IKError('No joints found for IK solver chain');
		}

		return chain;
	}

	private findRoot(object: THREE.Object3D): THREE.Object3D {
		let current: THREE.Object3D = object;
		while (current.parent) {
			current = current.parent;
		}
		return current;
	}

	private findEndEffector(): THREE.Object3D {
		const lastJoint = this.chain[this.chain.length - 1];
		if (!lastJoint) {
			throw new IKError('Cannot determine end effector without joints');
		}

		const queue: THREE.Object3D[] = [...lastJoint.children];
		let candidate: THREE.Object3D = lastJoint;

		while (queue.length > 0) {
			const node = queue.shift()!;
			candidate = node;
			queue.push(...node.children);
		}

		return candidate;
	}

	private updateChainWorldMatrices(): void {
		if (this.root) {
			this.root.updateMatrixWorld(true);
		} else if (this.chain.length > 0) {
			this.chain[0].updateMatrixWorld(true);
		}
	}

	private getEndEffectorPosition(): THREE.Vector3 {
		return this.endEffector.getWorldPosition(this.tempVecB.clone());
	}

	getJointAngle(jointName: string): number {
		const joint = this.joints.get(jointName);
		if (!joint) {
			throw new IKError(`Joint not found: ${jointName}`);
		}

		return joint.angle ?? 0;
	}

	private getJointWorldPosition(joint: URDFJoint): THREE.Vector3 {
		return joint.getWorldPosition(this.tempVecC.clone());
	}

	private getJointWorldAxis(joint: URDFJoint): THREE.Vector3 {
		const axis = joint.axis ? joint.axis.clone() : new THREE.Vector3(0, 0, 1);
		const worldQuat = joint.getWorldQuaternion(this.tempQuat);
		return axis.applyQuaternion(worldQuat).normalize();
	}

	dispose(): void {
		// Cleanup if needed
		logger.info('IK solver disposed');
	}
}
