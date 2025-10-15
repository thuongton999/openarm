<script lang="ts">
import { joints } from '$lib/state';
import { toDegrees, toRadians } from '$lib/utils';
import { Button, Slider, Tile } from 'carbon-components-svelte';
import { Reset } from 'carbon-icons-svelte';

let baseAngle = 0;
let arm1Angle = 0;
let arm2Angle = 0;

// Subscribe to store
joints.subscribe((state) => {
	baseAngle = state.base;
	arm1Angle = state.arm1;
	arm2Angle = state.arm2;
});

function handleBaseChange(event: CustomEvent) {
	joints.setJoint('base', toRadians(event.detail));
}

function handleArm1Change(event: CustomEvent) {
	joints.setJoint('arm1', toRadians(event.detail));
}

function handleArm2Change(event: CustomEvent) {
	joints.setJoint('arm2', toRadians(event.detail));
}

function resetJoints() {
	joints.reset();
}
</script>

<Tile class="joint-control-tile">
	<h4 style="margin-top: 0; margin-bottom: 1rem;">Joint Control</h4>

	<Slider
		labelText="Base Joint: {toDegrees(baseAngle).toFixed(1)}°"
		min={0}
		max={360}
		step={1}
		value={toDegrees(baseAngle)}
		on:input={handleBaseChange}
		fullWidth
	/>

	<Slider
		labelText="Arm 1: {toDegrees(arm1Angle).toFixed(1)}°"
		min={-90}
		max={90}
		step={1}
		value={toDegrees(arm1Angle)}
		on:input={handleArm1Change}
		fullWidth
	/>

	<Slider
		labelText="Arm 2: {toDegrees(arm2Angle).toFixed(1)}°"
		min={-90}
		max={90}
		step={1}
		value={toDegrees(arm2Angle)}
		on:input={handleArm2Change}
		fullWidth
	/>

	<Button
		kind="secondary"
		icon={Reset}
		on:click={resetJoints}
		size="field"
		style="width: 100%; margin-top: 1rem;"
	>
		Reset Joints
	</Button>
</Tile>

<style>
	:global(.joint-control-tile .bx--slider) {
		min-width: 0 !important;
	}
</style>
