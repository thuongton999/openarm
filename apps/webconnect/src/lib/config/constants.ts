/**
 * Application Configuration Constants
 * Single source of truth for all configuration values
 */

export const APP_CONFIG = {
	name: 'OpenArm WebConnect',
	company: 'MinhVT',
	version: '0.1.0'
} as const;

export const SERIAL_CONFIG = {
	defaultBaudRate: 115200,
	defaultDataBits: 8 as 7 | 8,
	defaultStopBits: 1 as 1 | 2,
	defaultParity: 'none' as 'none' | 'even' | 'odd',
	defaultFlowControl: 'none' as 'none' | 'hardware',
	writeThrottleHz: 100, // Increased from 50Hz to 100Hz for smoother real-time control
	maxPacketSize: 256,
	minPacketSize: 6
} as const;

export const PROTOCOL_CONFIG = {
	syncWord: 0xaa55,
	commands: {
		setJointAngle: 0x01,
		ack: 0x02,
		telemetry: 0x03
	}
} as const;

export const CDN_CONFIG = {
	manifestUrl: import.meta.env.VITE_CDN_MANIFEST_URL || 'https://assets.openarm.dev/manifest.json',
	publicUrl: import.meta.env.VITE_CDN_PUBLIC_URL || 'https://assets.openarm.dev',
	cacheTimeout: 5 * 60 * 1000, // 5 minutes
	retryAttempts: 3,
	retryDelay: 1000 // milliseconds
} as const;

export const ROBOT_CONFIG = {
	// URDF will be resolved from manifest (robot.urdf → robot.hash.urdf)
	urdfFilename: 'robot.urdf',
	jointNames: {
		base: 'base',
		arm1: 'arm1',
		arm2: 'arm2'
	},
	defaultLimits: {
		base: { lower: 0, upper: 2 * Math.PI },
		arm1: { lower: -Math.PI / 2, upper: Math.PI / 2 },
		arm2: { lower: -Math.PI / 2, upper: Math.PI / 2 }
	}
} as const;

export const SCENE_CONFIG = {
	camera: {
		fov: 50,
		near: 0.01,
		far: 100,
		position: { x: 0.3, y: 0.3, z: 0.3 }
	},
	renderer: {
		antialias: true,
		alpha: false
	},
	controls: {
		enableDamping: true,
		dampingFactor: 0.05,
		minDistance: 0.1,
		maxDistance: 10
	},
	lighting: {
		ambient: { color: 0xffffff, intensity: 0.6 },
		directional: { color: 0xffffff, intensity: 0.8, position: { x: 1, y: 2, z: 1 } },
		hemisphere: { skyColor: 0xffffff, groundColor: 0x444444, intensity: 0.4 }
	}
} as const;

export const UI_CONFIG = {
	theme: 'g100' as const,
	controlPanelWidth: 320,
	canvasMinHeight: '60vh'
} as const;

// Type exports for type safety
export type AppConfig = typeof APP_CONFIG;
export type SerialConfig = typeof SERIAL_CONFIG;
export type ProtocolConfig = typeof PROTOCOL_CONFIG;
export type RobotConfig = typeof ROBOT_CONFIG;
export type SceneConfig = typeof SCENE_CONFIG;
export type UIConfig = typeof UI_CONFIG;
