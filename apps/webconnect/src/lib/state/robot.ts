import type { RobotIKSolver } from '@lib/ik';
import type { RobotModel } from '@lib/urdf';
import type { Object3D } from 'three';
import { writable } from 'svelte/store';

interface RobotState {
	model: RobotModel | null;
	solver: RobotIKSolver | null;
	target: Object3D | null;
	isLoaded: boolean;
	error: string | null;
}

function createRobotStore() {
	const { subscribe, set, update } = writable<RobotState>({
		model: null,
		solver: null,
		target: null,
		isLoaded: false,
		error: null
	});

	return {
		subscribe,

		setModel(model: RobotModel) {
			update((state) => ({ ...state, model, isLoaded: true, error: null }));
		},

		setSolver(solver: RobotIKSolver) {
			update((state) => ({ ...state, solver }));
		},

		setTarget(target: Object3D) {
			update((state) => ({ ...state, target }));
		},

		setError(error: string) {
			update((state) => ({ ...state, error, isLoaded: false }));
		},

		reset() {
			set({ model: null, solver: null, target: null, isLoaded: false, error: null });
		}
	};
}

export const robot = createRobotStore();
