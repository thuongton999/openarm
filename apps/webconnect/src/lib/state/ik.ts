import { writable } from 'svelte/store';
import { Vector3 } from 'three';

const DEFAULT_TARGET = new Vector3(0.2, 0.2, 0.2);

function cloneVector(vector: Vector3): Vector3 {
	return vector.clone();
}

const ikEnabledStore = writable(false);
const ikTargetStore = writable<Vector3>(cloneVector(DEFAULT_TARGET));

function toggleIK(): void {
	ikEnabledStore.update((value) => !value);
}

function setIKEnabled(enabled: boolean): void {
	ikEnabledStore.set(enabled);
}

function setIKTarget(target: Vector3): void {
	ikTargetStore.set(cloneVector(target));
}

function resetIKTarget(): void {
	ikTargetStore.set(cloneVector(DEFAULT_TARGET));
}

export const ik = {
	enabled: ikEnabledStore,
	target: ikTargetStore,
	toggle: toggleIK,
	setEnabled: setIKEnabled,
	setTarget: setIKTarget,
	resetTarget: resetIKTarget
};

export type IKStore = typeof ik;

export const ikEnabled = ikEnabledStore;
export const ikTarget = ikTargetStore;
export { toggleIK, setIKEnabled, setIKTarget, resetIKTarget };

