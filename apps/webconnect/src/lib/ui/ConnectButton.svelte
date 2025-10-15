<script lang="ts">
import { features } from '$lib/core';
import { ConnectionStatus, connection, isConnected } from '$lib/state';
import { Button, InlineNotification, Tag } from 'carbon-components-svelte';
import { PlugFilled, Unlink } from 'carbon-icons-svelte';

let status = ConnectionStatus.DISCONNECTED;
let error: string | null = null;
let connected = false;

connection.subscribe((state) => {
	status = state.status;
	error = state.error;
});

isConnected.subscribe((value) => {
	connected = value;
});

async function handleConnect() {
	if (connected) {
		await connection.disconnect();
	} else {
		await connection.connect();
	}
}

function getButtonText(): string {
	switch (status) {
		case ConnectionStatus.CONNECTING:
			return 'Connecting...';
		case ConnectionStatus.CONNECTED:
			return 'Disconnect';
		case ConnectionStatus.ERROR:
			return 'Retry Connection';
		default:
			return 'Connect Serial';
	}
}

function getButtonKind(): 'primary' | 'danger' | 'tertiary' {
	if (status === ConnectionStatus.CONNECTED) return 'danger';
	if (status === ConnectionStatus.ERROR) return 'tertiary';
	return 'primary';
}
</script>

<div class="connect-section">
	{#if !features.hasWebSerial}
		<InlineNotification
			kind="warning"
			title="Web Serial API not supported"
			subtitle="Please use Chrome, Edge, or another Chromium-based browser."
			hideCloseButton
		/>
	{:else}
		<Button
			kind={getButtonKind()}
			icon={connected ? Unlink : PlugFilled}
			disabled={status === ConnectionStatus.CONNECTING}
			on:click={handleConnect}
			size="field"
			style="width: 100%;"
		>
			{getButtonText()}
		</Button>

		{#if error}
			<InlineNotification
				kind="error"
				title="Connection Error"
				subtitle={error}
				lowContrast
				hideCloseButton
			/>
		{/if}

		{#if connected}
			<div style="display: flex; align-items: center; gap: 0.5rem;">
				<Tag type="green" size="sm">Connected</Tag>
				<span class="pulse"></span>
			</div>
		{/if}
	{/if}
</div>

<style>
	.connect-section {
		display: flex;
		flex-direction: column;
	}

	.pulse {
		width: 8px;
		height: 8px;
		background: var(--cds-support-success);
		border-radius: 50%;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
	}
</style>
