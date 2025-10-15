<script lang="ts">
import { APP_CONFIG, UI_CONFIG } from '$lib/config';
import { ConnectButton, JointSliders, RobotCanvas } from '$lib/ui';
import {
	Content,
	Header,
	Theme
} from 'carbon-components-svelte';
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
				<JointSliders />
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
