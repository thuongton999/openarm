<script lang="ts">
import { APP_CONFIG, UI_CONFIG } from '@lib/config';
import { robot } from '@lib/state';
import { ConnectButton, IKButton, JointSliders, RobotCanvas } from '@lib/ui';
import { Content, Header, Theme } from 'carbon-components-svelte';
</script>

<svelte:head>
	<title>WebConnect - Robot Control</title>
</svelte:head>

<Theme theme={UI_CONFIG.theme}>
	<Header company={APP_CONFIG.company} platformName={APP_CONFIG.name}>
	</Header>

	<Content class="main-content">
		<div class="app-layout">
			<div class="canvas-section">
				<RobotCanvas />
			</div>

			<aside class="control-panel">
				<ConnectButton />
				<IKButton />
				{#if !$robot.isIKMode}
					<JointSliders />
				{:else}
					<div class="ik-disabled-hint">
						Joint sliders are disabled while IK mode is active.
					</div>
				{/if}
			</aside>
		</div>
	</Content>
</Theme>

<style>
	:global(.main-content) {
		padding: 0 !important;
		height: calc(100vh - 3rem);
	}

	.app-layout {
		display: flex;
		height: 100%;
		overflow: hidden;
		gap: 1rem;
		padding: 1rem;
	}

	.canvas-section {
		flex: 1;
		min-width: 0;
		background: var(--cds-layer-01);
		border: 1px solid var(--cds-border-subtle-00);
		overflow: hidden;
	}

	.control-panel {
		width: 320px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		background: var(--cds-layer-01);
		border: 1px solid var(--cds-border-subtle-00);
		overflow-y: auto;
	}

	.ik-disabled-hint {
		padding: 0.75rem;
		background: color-mix(in srgb, var(--cds-layer-02) 80%, transparent);
		border-radius: 0.25rem;
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
		border: 1px dashed var(--cds-border-subtle-01);
	}

	@media (max-width: 1024px) {
		.app-layout {
			flex-direction: column;
		}

		.canvas-section {
			height: 60vh;
		}

		.control-panel {
			width: 100%;
			height: auto;
		}
	}
</style>
