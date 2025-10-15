import { IKError, logger } from '$lib/core';
import { clamp } from '$lib/utils';
import type { URDFJoint } from 'urdf-loader';

export interface JointLimits {
	lower: number;
	upper: number;
}

export class RobotIKSolver {
	private readonly joints: Map<string, URDFJoint>;
	private readonly limits: Map<string, JointLimits>;

	constructor(joints: Map<string, URDFJoint>) {
		this.joints = joints;
		this.limits = new Map();
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

	getJointAngle(jointName: string): number {
		const joint = this.joints.get(jointName);
		if (!joint) {
			throw new IKError(`Joint not found: ${jointName}`);
		}

		return joint.angle ?? 0;
	}

	dispose(): void {
		// Cleanup if needed
		logger.info('IK solver disposed');
	}
}
