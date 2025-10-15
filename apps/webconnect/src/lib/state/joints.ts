import { ROBOT_CONFIG } from '$lib/config';
import { logger } from '$lib/core';
import type { JointAngles } from '$lib/protocol';
import { clamp, throttle, debounce } from '$lib/utils';
import { derived, get, writable } from 'svelte/store';
import { connection } from './connection';
import { robot } from './robot';

export interface JointState {
	base: number; // radians
	arm1: number; // radians
	arm2: number; // radians
}

export interface JointLimitState {
	base: { lower: number; upper: number };
	arm1: { lower: number; upper: number };
	arm2: { lower: number; upper: number };
}

const DEFAULT_LIMITS: JointLimitState = ROBOT_CONFIG.defaultLimits;

function createJointsStore() {
	const { subscribe, set, update } = writable<JointState>({
		base: 0,
		arm1: 0,
		arm2: 0
	});

	const limits = writable<JointLimitState>(DEFAULT_LIMITS);

	// Throttle serial communication to prevent overwhelming the STM32
	let lastSerialSend = 0;
	const SERIAL_THROTTLE_MS = 10; // 100Hz max serial update rate
	
	const throttledSendAngles = (angles: JointAngles) => {
		const now = Date.now();
		if (now - lastSerialSend >= SERIAL_THROTTLE_MS) {
			lastSerialSend = now;
			connection.sendAngles(angles);
		}
	};

	return {
		subscribe,
		limits,

		setJoint(joint: keyof JointState, angle: number) {
			update((state) => {
				const limitState = get(limits);
				const limit = limitState[joint];

				// Clamp to limits using utility function
				const clamped = clamp(angle, limit.lower, limit.upper);

				const newState = { ...state, [joint]: clamped };

				// Update URDF model immediately for smooth visual feedback
				const robotState = get(robot);
				if (robotState.model && robotState.solver) {
					try {
						robotState.solver.setJointAngle(joint, clamped);
					} catch (err) {
						logger.error(`Failed to set joint ${joint}`, err);
					}
				}

				// Send to serial with throttling to prevent overwhelming STM32
				const angles: JointAngles = [newState.base, newState.arm1, newState.arm2];
				throttledSendAngles(angles);

				return newState;
			});
		},

		setAll(angles: Partial<JointState>) {
			update((state) => {
				const newState = { ...state, ...angles };

				// Update URDF model immediately for smooth visual feedback
				const robotState = get(robot);
				if (robotState.model && robotState.solver) {
					try {
						if (angles.base !== undefined) robotState.solver.setJointAngle('base', angles.base);
						if (angles.arm1 !== undefined) robotState.solver.setJointAngle('arm1', angles.arm1);
						if (angles.arm2 !== undefined) robotState.solver.setJointAngle('arm2', angles.arm2);
					} catch (err) {
						logger.error('Failed to set joints', err);
					}
				}

				// Send to serial with throttling
				const jointAngles: JointAngles = [newState.base, newState.arm1, newState.arm2];
				throttledSendAngles(jointAngles);

				return newState;
			});
		},

		reset() {
			set({ base: 0, arm1: 0, arm2: 0 });
		},

		updateLimits(newLimits: Partial<JointLimitState>) {
			limits.update((state) => ({ ...state, ...newLimits }));
		}
	};
}

export const joints = createJointsStore();

export const jointAngles = derived(joints, ($joints) => {
	return [$joints.base, $joints.arm1, $joints.arm2] as JointAngles;
});
