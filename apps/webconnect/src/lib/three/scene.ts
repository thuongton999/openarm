import { SCENE_CONFIG } from '$lib/config';
import { logger } from '$lib/core';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';

export interface SceneConfig {
	antialias?: boolean;
	alpha?: boolean;
}

export class RobotScene {
	public readonly scene: THREE.Scene;
	public readonly camera: THREE.PerspectiveCamera;
	public readonly renderer: THREE.WebGLRenderer;
	public readonly controls: OrbitControls;
	private animationId: number | null = null;

	constructor(canvas: HTMLCanvasElement, config: SceneConfig = {}) {
		// Scene
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x1a1a1a);

		// Camera
		const { fov, near, far, position } = SCENE_CONFIG.camera;
		this.camera = new THREE.PerspectiveCamera(
			fov,
			canvas.clientWidth / canvas.clientHeight,
			near,
			far
		);
		this.camera.position.set(position.x, position.y, position.z);
		this.camera.lookAt(0, 0, 0);

		// Renderer
		const rendererConfig = SCENE_CONFIG.renderer;
		this.renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: config.antialias ?? rendererConfig.antialias,
			alpha: config.alpha ?? rendererConfig.alpha
		});
		this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		// Controls
		const controlsConfig = SCENE_CONFIG.controls;
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = controlsConfig.enableDamping;
		this.controls.dampingFactor = controlsConfig.dampingFactor;
		this.controls.minDistance = controlsConfig.minDistance;
		this.controls.maxDistance = controlsConfig.maxDistance;

		// Lights
		this.setupLights();

		// Grid helper
		const gridHelper = new THREE.GridHelper(1, 10, 0x444444, 0x222222);
		this.scene.add(gridHelper);

		logger.info('Scene initialized');
	}

	private setupLights(): void {
		const { ambient, directional, hemisphere } = SCENE_CONFIG.lighting;

		// Ambient light
		const ambientLight = new THREE.AmbientLight(ambient.color, ambient.intensity);
		this.scene.add(ambientLight);

		// Directional light
		const directionalLight = new THREE.DirectionalLight(directional.color, directional.intensity);
		directionalLight.position.set(
			directional.position.x,
			directional.position.y,
			directional.position.z
		);
		directionalLight.castShadow = true;
		directionalLight.shadow.mapSize.width = 2048;
		directionalLight.shadow.mapSize.height = 2048;
		this.scene.add(directionalLight);

		// Hemisphere light
		const hemisphereLight = new THREE.HemisphereLight(
			hemisphere.skyColor,
			hemisphere.groundColor,
			hemisphere.intensity
		);
		this.scene.add(hemisphereLight);
	}

	start(): void {
		if (this.animationId !== null) {
			return;
		}

		const animate = () => {
			this.animationId = requestAnimationFrame(animate);
			this.controls.update();
			this.renderer.render(this.scene, this.camera);
		};

		animate();
		logger.info('Animation loop started');
	}

	stop(): void {
		if (this.animationId !== null) {
			cancelAnimationFrame(this.animationId);
			this.animationId = null;
			logger.info('Animation loop stopped');
		}
	}

	resize(width: number, height: number): void {
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height);
	}

	dispose(): void {
		this.stop();
		this.controls.dispose();
		this.renderer.dispose();
		logger.info('Scene disposed');
	}

	addObject(object: THREE.Object3D): void {
		this.scene.add(object);
	}

	removeObject(object: THREE.Object3D): void {
		this.scene.remove(object);
	}
}
