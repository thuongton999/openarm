<script lang="ts">
import { getCDNLoader } from '@lib/cdn';
import { CDN_CONFIG, ROBOT_CONFIG } from '@lib/config';
import { logger } from '@lib/core';
import { RobotIKSolver } from '@lib/ik';
import { joints, robot } from '@lib/state';
import { IKHelpers, RobotScene } from '@lib/three';
import { RobotURDFLoader } from '@lib/urdf';
import { InlineNotification, Loading } from 'carbon-components-svelte';
import { onDestroy, onMount } from 'svelte';
import { get } from 'svelte/store';
import * as THREE from 'three';

let canvas: HTMLCanvasElement;
let scene: RobotScene | null = null;
let resizeObserver: ResizeObserver | null = null;
let ikHelpers: IKHelpers | null = null;
let _loading = true;
let _loadingStatus = 'Initializing...';
let error = '';

onMount(async () => {
	try {
		// Initialize scene
		_loadingStatus = 'Setting up 3D scene...';
		scene = new RobotScene(canvas);
		scene.start();

		// Load CDN manifest first
		_loadingStatus = 'Loading CDN manifest...';
		const cdnLoader = getCDNLoader();
		await cdnLoader.loadManifest();

		// Optional: Preload assets for faster rendering
		_loadingStatus = 'Preloading robot assets...';
		await cdnLoader.preloadAssets();

		// Load URDF from CDN (resolved from manifest)
		_loadingStatus = 'Loading robot model from CDN...';
		const loader = new RobotURDFLoader();
		const model = await loader.load(ROBOT_CONFIG.urdfFilename);

		// Add robot to scene
		_loadingStatus = 'Rendering robot...';
		model.robot.rotation.x = -Math.PI / 2;
		scene.addObject(model.robot);

		// Initialize IK solver
		const solver = new RobotIKSolver(model.joints);
		initializeIKHelpers(model.maxReach);

		// Store in state
		robot.setModel(model);
		robot.setSolver(solver);
		robot.setMaxReach(model.maxReach);

		_loading = false;
		logger.info('Robot loaded successfully from CDN', {
			urdf: ROBOT_CONFIG.urdfFilename,
			cdn: CDN_CONFIG.publicUrl,
			joints: model.joints.size
		});

		// Setup resize observer
		resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				scene?.resize(width, height);
			}
		});

		resizeObserver.observe(canvas.parentElement!);
	} catch (err) {
		error = err instanceof Error ? err.message : String(err);
		robot.setError(error);
		_loading = false;
		logger.error('Failed to load robot from CDN', {
			error: err,
			cdnUrl: CDN_CONFIG.publicUrl,
			manifestUrl: CDN_CONFIG.manifestUrl
		});
	}
});

onDestroy(() => {
	resizeObserver?.disconnect();
	scene?.dispose();
	if (ikHelpers && scene) {
		ikHelpers.removeFromScene(scene.scene);
		ikHelpers.dispose();
	}
	robot.reset();
});

function initializeIKHelpers(maxReach: number) {
	if (!scene) {
		return;
	}

	if (ikHelpers) {
		ikHelpers.dispose();
		ikHelpers = null;
	}

	ikHelpers = new IKHelpers(
		scene.camera,
		scene.renderer.domElement,
		scene.controls,
		{
			initialPosition: new THREE.Vector3(
				ROBOT_CONFIG.ik.targetInitialPosition.x,
				ROBOT_CONFIG.ik.targetInitialPosition.y,
				ROBOT_CONFIG.ik.targetInitialPosition.z
			),
			maxReach,
			onTargetChange: handleIKTargetChange
		}
	);

	ikHelpers.addToScene(scene.scene);
	ikHelpers.setVisible(get(robot).isIKMode);
}

function handleIKTargetChange(position: THREE.Vector3) {
	robot.setIKTargetPosition(position.clone());

	const robotState = get(robot);
	if (!robotState.solver) {
		return;
	}

	const success = robotState.solver.solve(position.clone());
	if (!success) {
		logger.warn('IK solver failed to reach target', { position });
		return;
	}

	const newAngles = {
		base: robotState.solver.getJointAngle(ROBOT_CONFIG.jointNames.base),
		arm1: robotState.solver.getJointAngle(ROBOT_CONFIG.jointNames.arm1),
		arm2: robotState.solver.getJointAngle(ROBOT_CONFIG.jointNames.arm2)
	};

	joints.setAll(newAngles);
}

$: if (ikHelpers && scene) {
	ikHelpers.setVisible($robot.isIKMode && $robot.isLoaded);
}

$: if (ikHelpers && $robot.maxReach) {
	ikHelpers.setMaxReach($robot.maxReach);
}

$: if (ikHelpers && $robot.ikTargetPosition) {
	ikHelpers.setTargetPosition(new THREE.Vector3().copy($robot.ikTargetPosition));
}
</script>

<div class="canvas-container">
	{#if _loading}
		<div class="overlay">
			<div class="loading-content">
				<Loading withOverlay={false} />
				<p class="loading-status">{_loadingStatus}</p>
				<p class="loading-detail">
					Loading from: <code>{CDN_CONFIG.publicUrl}</code>
				</p>
			</div>
		</div>
	{/if}

	{#if error}
		<div class="overlay">
			<InlineNotification
				kind="error"
				title="Failed to load robot from CDN"
				subtitle={error}
				hideCloseButton
			>
				<div slot="subtitle">
					<p>{error}</p>
					<p class="error-hint">
						Check that CDN is accessible: <code>{CDN_CONFIG.manifestUrl}</code>
					</p>
				</div>
			</InlineNotification>
		</div>
	{/if}

	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.canvas-container {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}

	.overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--cds-layer-01);
		z-index: 10;
		padding: 2rem;
	}

	.loading-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		text-align: center;
	}

	.loading-status {
		font-size: 1rem;
		font-weight: 500;
		color: var(--cds-text-primary);
		margin: 0;
	}

	.loading-detail {
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
		margin: 0;
	}

	.error-hint {
		margin-top: 0.5rem;
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
	}

	code {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.875rem;
		padding: 0.125rem 0.25rem;
		background: var(--cds-layer-02);
		border-radius: 2px;
		color: var(--cds-text-primary);
	}
</style>
