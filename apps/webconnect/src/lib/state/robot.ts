import { ROBOT_CONFIG } from '@lib/config';
import type { RobotIKSolver } from '@lib/ik';
import type { RobotModel } from '@lib/urdf';
import { writable } from 'svelte/store';
import * as THREE from 'three';

interface RobotState {
	model: RobotModel | null;
	solver: RobotIKSolver | null;
	isLoaded: boolean;
	error: string | null;
	isIKMode: boolean;
	ikTargetPosition: THREE.Vector3;
	maxReach: number;
}

function createRobotStore() {
	const { subscribe, set, update } = writable<RobotState>({
		model: null,
		solver: null,
		isLoaded: false,
		error: null,
		isIKMode: false,
		ikTargetPosition: new THREE.Vector3(
			ROBOT_CONFIG.ik.targetInitialPosition.x,
			ROBOT_CONFIG.ik.targetInitialPosition.y,
			ROBOT_CONFIG.ik.targetInitialPosition.z
		),
		maxReach: ROBOT_CONFIG.ik.maxReach
	});

	return {
		subscribe,

		setModel(model: RobotModel) {
			update((state) => ({
				...state,
				model,
				isLoaded: true,
				error: null,
				maxReach: model.maxReach ?? state.maxReach
			}));
		},

		setSolver(solver: RobotIKSolver) {
			update((state) => ({ ...state, solver }));
		},

		setIKMode(isIKMode: boolean) {
			update((state) => ({ ...state, isIKMode }));
		},

		setIKTargetPosition(position: THREE.Vector3) {
			update((state) => ({ ...state, ikTargetPosition: position }));
		},

		setMaxReach(maxReach: number) {
			update((state) => ({ ...state, maxReach }));
		},

		setError(error: string) {
			update((state) => ({ ...state, error, isLoaded: false }));
		},

		reset() {
			set({
				model: null,
				solver: null,
				isLoaded: false,
				error: null,
				isIKMode: false,
				ikTargetPosition: new THREE.Vector3(
					ROBOT_CONFIG.ik.targetInitialPosition.x,
					ROBOT_CONFIG.ik.targetInitialPosition.y,
					ROBOT_CONFIG.ik.targetInitialPosition.z
				),
				maxReach: ROBOT_CONFIG.ik.maxReach
			});
		}
	};
}

export const robot = createRobotStore();
