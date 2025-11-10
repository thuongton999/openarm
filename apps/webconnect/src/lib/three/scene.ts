import { SCENE_CONFIG } from '@lib/config';
import { logger } from '@lib/core';
import * as THREE from 'three';
import { OrbitControls, TransformControls } from 'three-stdlib';

export interface SceneConfig {
	antialias?: boolean;
	alpha?: boolean;
}

export class RobotScene {
	public readonly scene: THREE.Scene;
	public readonly camera: THREE.PerspectiveCamera;
	public readonly renderer: THREE.WebGLRenderer;
	public readonly controls: OrbitControls;
	public readonly transformControls: TransformControls;

	private readonly ikHelper: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
	private ikSource: THREE.Object3D | null = null;
	private ikChangeCallback: ((position: THREE.Vector3) => void) | null = null;
	private ikObjectChangeHandler: (() => void) | null = null;
	private ikDraggingHandler: ((event: { value: boolean }) => void) | null = null;
	private animationId: number | null = null;

	private setTransformControlsEnabled(enabled: boolean): void {
		(this.transformControls as unknown as { enabled: boolean }).enabled = enabled;
	}

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

		this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
		this.transformControls.visible = false;
		this.transformControls.setSize(0.6);
		this.scene.add(this.transformControls);

		this.ikHelper = new THREE.Mesh(
			new THREE.SphereGeometry(0.01, 24, 16),
			new THREE.MeshStandardMaterial({
				color: 0xff3366,
				emissive: new THREE.Color(0xff3366),
				emissiveIntensity: 0.5
			})
		);
		this.ikHelper.visible = false;
		this.ikHelper.name = 'ik-target-handle';
		this.scene.add(this.ikHelper);

		// Lights
		this.setupLights();

		// Grid helper
		const gridHelper = new THREE.GridHelper(1, 10, 0x444444, 0x222222);
		this.scene.add(gridHelper);

		logger.info('Scene initialized');
	}

	configureIkTarget(target: THREE.Object3D, onChange: (position: THREE.Vector3) => void): void {
		this.ikSource = target;
		this.ikChangeCallback = onChange;

		this.syncIkHandleToTarget();
		this.ensureIkControlEvents();

		this.transformControls.setMode('translate');
		this.transformControls.setSpace('world');
		this.setTransformControlsEnabled(true);
		this.transformControls.attach(this.ikHelper);
		this.transformControls.visible = true;
		this.ikHelper.visible = true;
	}

	setIkMode(enabled: boolean): void {
		this.setTransformControlsEnabled(enabled);
		this.transformControls.visible = enabled;
		this.ikHelper.visible = enabled;
	}

	updateIkHandlePosition(worldPosition: THREE.Vector3): void {
		this.ikHelper.position.copy(worldPosition);
		this.ikHelper.updateMatrixWorld(true);
	}

	getIkHandleWorldPosition(target = new THREE.Vector3()): THREE.Vector3 {
		return this.ikHelper.getWorldPosition(target);
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
		if (this.ikObjectChangeHandler) {
			(this.transformControls as any).removeEventListener('objectChange', this.ikObjectChangeHandler);
			this.ikObjectChangeHandler = null;
		}
		if (this.ikDraggingHandler) {
			(this.transformControls as any).removeEventListener('dragging-changed', this.ikDraggingHandler);
			this.ikDraggingHandler = null;
		}
		this.transformControls.detach();
		this.scene.remove(this.transformControls);
		this.transformControls.dispose();
		this.scene.remove(this.ikHelper);
		this.ikHelper.geometry.dispose();
		this.ikHelper.material.dispose();
		this.renderer.dispose();
		logger.info('Scene disposed');
	}

	addObject(object: THREE.Object3D): void {
		this.scene.add(object);
	}

	removeObject(object: THREE.Object3D): void {
		this.scene.remove(object);
	}

	private syncIkHandleToTarget(): void {
		if (!this.ikSource) {
			return;
		}

		const worldPosition = new THREE.Vector3();
		this.ikSource.getWorldPosition(worldPosition);
		this.updateIkHandlePosition(worldPosition);
	}

	private ensureIkControlEvents(): void {
		if (!this.ikObjectChangeHandler) {
			this.ikObjectChangeHandler = () => {
				const worldPos = this.getIkHandleWorldPosition();
				this.ikChangeCallback?.(worldPos);
			};
			(this.transformControls as any).addEventListener('objectChange', this.ikObjectChangeHandler);
		}

		if (!this.ikDraggingHandler) {
			this.ikDraggingHandler = (event: { value: boolean }) => {
				this.controls.enabled = !event.value;
			};
			(this.transformControls as any).addEventListener('dragging-changed', this.ikDraggingHandler);
		}
	}
}
