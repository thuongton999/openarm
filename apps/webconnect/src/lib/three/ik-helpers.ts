import * as THREE from 'three';
import { TransformControls } from 'three-stdlib';
import type { OrbitControls } from 'three-stdlib';

export interface IKHelpersOptions {
	initialPosition: THREE.Vector3;
	maxReach: number;
	onTargetChange?: (position: THREE.Vector3) => void;
}

export class IKHelpers {
	public readonly group: THREE.Group;
	public readonly target: THREE.Mesh;
	public readonly controls: TransformControls;

	private reachIndicator: THREE.Object3D | null;
	private readonly onTargetChange?: (position: THREE.Vector3) => void;
	private readonly workingVector = new THREE.Vector3();

	constructor(
		camera: THREE.Camera,
		domElement: HTMLElement,
		orbitControls: OrbitControls,
		options: IKHelpersOptions
	) {
		this.onTargetChange = options.onTargetChange;

		this.group = new THREE.Group();

		this.target = this.createTargetMesh();
		this.target.position.copy(options.initialPosition);
		this.group.add(this.target);

		this.reachIndicator = this.createReachIndicator(options.maxReach);
		this.group.add(this.reachIndicator);

		this.controls = new TransformControls(camera, domElement);
		this.controls.setMode('translate');
		this.controls.attach(this.target);
		this.controls.addEventListener('dragging-changed', (event) => {
			orbitControls.enabled = !event.value;
		});
		this.controls.addEventListener('objectChange', () => {
			if (this.onTargetChange) {
				this.onTargetChange(this.workingVector.copy(this.target.position));
			}
		});

		this.group.visible = false;
	}

	addToScene(scene: THREE.Scene): void {
		scene.add(this.group);
		scene.add(this.controls);
	}

	removeFromScene(scene: THREE.Scene): void {
		scene.remove(this.group);
		scene.remove(this.controls);
	}

	setVisible(visible: boolean): void {
		this.group.visible = visible;
		// this.controls.enabled = visible;
		this.controls.visible = visible;
	}

	setTargetPosition(position: THREE.Vector3): void {
		this.target.position.copy(position);
		this.controls.update();
	}

	setMaxReach(radius: number): void {
		this.disposeReachIndicator();
		this.reachIndicator = this.createReachIndicator(radius);
		if (this.reachIndicator) {
			this.group.add(this.reachIndicator);
		}
	}

	dispose(): void {
		this.disposeReachIndicator();
		this.group.traverse((child) => {
			this.disposeObject(child);
		});

		this.controls.dispose();
	}

	private createTargetMesh(): THREE.Mesh {
		const geometry = new THREE.SphereGeometry(0.02, 32, 32);
		const material = new THREE.MeshStandardMaterial({
			color: 0xff6f61,
			emissive: 0x331111,
			transparent: true,
			opacity: 0.85
		});

		return new THREE.Mesh(geometry, material);
	}

	private createReachIndicator(radius: number): THREE.Object3D {
		const group = new THREE.Group();

		const sphereGeometry = new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
		const wireframe = new THREE.WireframeGeometry(sphereGeometry);

		const meshMaterial = new THREE.MeshBasicMaterial({
			color: 0x4fc3f7,
			transparent: true,
			opacity: 0.15,
			depthWrite: false
		});

		const lineMaterial = new THREE.LineBasicMaterial({
			color: 0x4fc3f7,
			transparent: true,
			opacity: 0.4
		});

		const mesh = new THREE.Mesh(sphereGeometry, meshMaterial);
		const grid = new THREE.LineSegments(wireframe, lineMaterial);

		group.add(mesh);
		group.add(grid);

		return group;
	}

	private disposeReachIndicator(): void {
		if (this.reachIndicator) {
			this.group.remove(this.reachIndicator);
			this.reachIndicator.traverse((child) => this.disposeObject(child));
			this.disposeObject(this.reachIndicator);
			this.reachIndicator = null;
		}
	}

	private disposeObject(object: THREE.Object3D): void {
		if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
			if (object.geometry) {
				object.geometry.dispose();
			}
			if (Array.isArray(object.material)) {
				object.material.forEach((material) => material.dispose());
			} else if (object.material) {
				object.material.dispose();
			}
		}
	}
}

