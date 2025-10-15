export type JointAngles = [number, number, number];

export interface Packet {
	sync: number;
	length: number;
	command: number;
	payload: Uint8Array;
	checksum: number;
}

export interface SetJointAnglePayload {
	joint1: number; // radians
	joint2: number; // radians
	joint3: number; // radians
}

export interface TelemetryPayload {
	timestamp: number;
	joint1Current: number;
	joint2Current: number;
	joint3Current: number;
}
