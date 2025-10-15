import type { RobotIKSolver } from '$lib/ik';
import type { RobotModel } from '$lib/urdf';
import { writable } from 'svelte/store';

interface RobotState {
	model: RobotModel | null;
	solver: RobotIKSolver | null;
	isLoaded: boolean;
	error: string | null;
}

function createRobotStore() {
	const { subscribe, set, update } = writable<RobotState>({
		model: null,
		solver: null,
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

		setError(error: string) {
			update((state) => ({ ...state, error, isLoaded: false }));
		},

		reset() {
			set({ model: null, solver: null, isLoaded: false, error: null });
		}
	};
}

export const robot = createRobotStore();
