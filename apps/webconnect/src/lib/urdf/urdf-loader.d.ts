declare module 'urdf-loader' {
	import type * as THREE from 'three';

	export interface URDFJoint extends THREE.Object3D {
		name: string;
		jointType: string;
		limit?: {
			lower: number;
			upper: number;
		};
		axis?: THREE.Vector3;
		angle?: number;
		ignoreLimits?: boolean;
		setJointValue(value: number): void;
		isURDFJoint: true;
	}

	export interface URDFLink extends THREE.Object3D {
		name: string;
		isURDFLink: true;
	}

	export interface URDFRobot extends THREE.Object3D {
		name: string;
		links: { [key: string]: URDFLink };
		joints: { [key: string]: URDFJoint };
		isURDFRobot: true;
	}

	export default class URDFLoader {
		constructor(manager?: THREE.LoadingManager);
		load(
			url: string,
			onLoad: (robot: URDFRobot) => void,
			onProgress?: (event: ProgressEvent) => void,
			onError?: (event: ErrorEvent) => void
		): void;
		parse(urdfText: string): URDFRobot;
	}
}
