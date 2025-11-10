<script lang="ts">
import { Button, TooltipIcon } from 'carbon-components-svelte';
import { Information } from 'carbon-icons-svelte';
import { ikEnabled, toggleIK } from '@lib/state/ik';
</script>

<div class="ik-toggle">
	<Button kind={$ikEnabled ? 'danger' : 'secondary'} size="field" style="width: 100%;" on:click={toggleIK}>
		{$ikEnabled ? 'Disable IK Mode' : 'Enable IK Mode'}
	</Button>

	<div class="ik-hint">
		<TooltipIcon
			align="start"
			direction="right"
			icon={Information}
			tooltipText="Toggle inverse kinematics to control the end effector by dragging the target in the scene."
		/>
		<span>{$ikEnabled ? 'IK mode is active' : 'IK mode is inactive'}</span>
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
