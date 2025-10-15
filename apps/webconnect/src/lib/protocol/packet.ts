import { ProtocolError } from '$lib/core';
import { calculateChecksum } from './checksum';
import { CMD_SET_JOINT_ANGLE, SYNC_WORD } from './constants';
import type { JointAngles, Packet } from './types';

export function encodeAngles(angles: JointAngles): Uint8Array {
	// Packet format:
	// [sync_hi][sync_lo][length][cmd][joint1_float(4)][joint2_float(4)][joint3_float(4)][checksum]
	// Total: 2 + 1 + 1 + 12 + 1 = 17 bytes
	const buffer = new ArrayBuffer(17);
	const view = new DataView(buffer);
	const uint8View = new Uint8Array(buffer);

	// Sync word (big-endian)
	view.setUint16(0, SYNC_WORD, false);

	// Length (payload size = 12 bytes for 3 floats)
	view.setUint8(2, 12);

	// Command
	view.setUint8(3, CMD_SET_JOINT_ANGLE);

	// Joint angles as 32-bit floats (little-endian)
	view.setFloat32(4, angles[0], true);
	view.setFloat32(8, angles[1], true);
	view.setFloat32(12, angles[2], true);

	// Checksum of payload (bytes 3-15: cmd + angles)
	const payloadForChecksum = uint8View.slice(3, 16);
	const checksum = calculateChecksum(payloadForChecksum);
	view.setUint8(16, checksum);

	return uint8View;
}

export function parsePacket(buffer: Uint8Array): Packet {
	if (buffer.length < 5) {
		throw new ProtocolError('Packet too small', { size: buffer.length });
	}

	const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

	const sync = view.getUint16(0, false);
	if (sync !== SYNC_WORD) {
		throw new ProtocolError('Invalid sync word', { sync });
	}

	const length = view.getUint8(2);
	const command = view.getUint8(3);

	if (buffer.length < 4 + length + 1) {
		throw new ProtocolError('Incomplete packet', { expected: 4 + length + 1, got: buffer.length });
	}

	const payload = buffer.slice(4, 4 + length);
	const checksum = view.getUint8(4 + length);

	return { sync, length, command, payload, checksum };
}
