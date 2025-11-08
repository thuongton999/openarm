<script lang="ts">
import { robot } from '@lib/state';
import { Button, TooltipIcon } from 'carbon-components-svelte';
import { Information } from 'carbon-icons-svelte';

function toggleIK() {
	robot.setIKMode(!$robot.isIKMode);
}
</script>

<div class="ik-toggle">
	<Button
		kind={$robot.isIKMode ? 'danger' : 'secondary'}
		disabled={!$robot.isLoaded}
		size="field"
		style="width: 100%;"
		on:click={toggleIK}
	>
		{$robot.isIKMode ? 'Disable IK Mode' : 'Enable IK Mode'}
	</Button>

	<div class="ik-hint">
	<TooltipIcon
		align="start"
		direction="right"
		icon={Information}
		tooltipText="Inverse Kinematics lets you drag the target in 3D. Joint sliders are disabled while active."
	/>
		<span>{$robot.isIKMode ? 'IK mode active' : 'IK mode ready'}</span>
	</div>
</div>

<style>
	.ik-toggle {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.ik-hint {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.8rem;
		color: var(--cds-text-secondary);
	}
</style>
 