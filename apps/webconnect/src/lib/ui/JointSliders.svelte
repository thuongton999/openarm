<script lang="ts">
import { joints } from '@lib/state';
import { ikEnabled } from '@lib/state/ik';
import { toDegrees, toRadians } from '@lib/utils';
import { Button, Slider, Tile } from 'carbon-components-svelte';
import { Locked, Reset, Unlocked } from 'carbon-icons-svelte';

let _baseAngle = $state(0);
let _arm1Angle = $state(0);
let _arm2Angle = $state(0);

let baseLocked = $state(false);
let arm1Locked = $state(false);
let arm2Locked = $state(false);

// Subscribe to store
$effect(() => {
	const unsubscribe = joints.subscribe((state) => {
		_baseAngle = state.base;
		_arm1Angle = state.arm1;
		_arm2Angle = state.arm2;
	});
	return unsubscribe;
});

function handleBaseChange(event: CustomEvent<number>) {
	if (!baseLocked && !$ikEnabled) {
		joints.setJoint('base', toRadians(event.detail));
	}
}

function handleArm1Change(event: CustomEvent<number>) {
	if (!arm1Locked && !$ikEnabled) {
		joints.setJoint('arm1', toRadians(event.detail));
	}
}

function handleArm2Change(event: CustomEvent<number>) {
	if (!arm2Locked && !$ikEnabled) {
		joints.setJoint('arm2', toRadians(event.detail));
	}
}

function resetJoints() {
	if (!$ikEnabled) {
	joints.reset();
	}
}
</script>

<Tile class="joint-control-tile">
	<h4 style="margin-top: 0; margin-bottom: 1rem;">Joint Control</h4>

	{#if $ikEnabled}
		<p class="ik-disabled-message">Joint sliders are disabled while IK mode is active.</p>
	{/if}

	<div class="slider-container">
		<Slider
			labelText="Base Joint: {toDegrees(_baseAngle).toFixed(1)}°"
			min={0}
			max={180}
			step={1}
			value={toDegrees(_baseAngle)}
			on:input={handleBaseChange}
			disabled={baseLocked || $ikEnabled}
			fullWidth
			hideTextInput
		/>
		<Button
			kind="ghost"
			icon={baseLocked ? Locked : Unlocked}
			on:click={() => (baseLocked = !baseLocked)}
			iconDescription={baseLocked ? 'Unlock Base Joint' : 'Lock Base Joint'}
			disabled={$ikEnabled}
		/>
	</div>

	<div class="slider-container">
		<Slider
			labelText="Arm 1: {toDegrees(_arm1Angle).toFixed(1)}°"
			min={0}
			max={180}
			step={1}
			value={toDegrees(_arm1Angle)}
			on:input={handleArm1Change}
			disabled={arm1Locked || $ikEnabled}
			fullWidth
			hideTextInput
		/>
		<Button
			kind="ghost"
			icon={arm1Locked ? Locked : Unlocked}
			on:click={() => (arm1Locked = !arm1Locked)}
			iconDescription={arm1Locked ? 'Unlock Arm 1' : 'Lock Arm 1'}
			disabled={$ikEnabled}
		/>
	</div>

	<div class="slider-container">
		<Slider
			labelText="Arm 2: {toDegrees(_arm2Angle).toFixed(1)}°"
			min={0}
			max={180}
			step={1}
			value={toDegrees(_arm2Angle)}
			on:input={handleArm2Change}
			disabled={arm2Locked || $ikEnabled}
			fullWidth
			hideTextInput
		/>
		<Button
			kind="ghost"
			icon={arm2Locked ? Locked : Unlocked}
			on:click={() => (arm2Locked = !arm2Locked)}
			iconDescription={arm2Locked ? 'Unlock Arm 2' : 'Lock Arm 2'}
			disabled={$ikEnabled}
		/>
	</div>

	<Button
		kind="secondary"
		icon={Reset}
		on:click={resetJoints}
		size="field"
		style="width: 100%; margin-top: 1rem;"
		disabled={$ikEnabled}
	>
		Reset Joints
	</Button>
</Tile>

<style>
	.slider-container {
		display: flex;
		align-items: center;
		margin-bottom: 1rem;
		overflow: hidden;
	}
	:global(.joint-control-tile .bx--slider) {
		min-width: 0 !important;
	}
	.ik-disabled-message {
		margin: 0 0 1rem;
		font-size: 0.85rem;
		color: var(--cds-text-secondary);
	}
</style>
