import { describe, expect, test } from 'bun:test';
import { CMD_SET_JOINT_ANGLE, SYNC_WORD } from '../../src/lib/protocol/constants';
import { encodeAngles, parsePacket } from '../../src/lib/protocol/packet';
import type { JointAngles } from '../../src/lib/protocol/types';

describe('Protocol Packet Encoding', () => {
	test('encodes joint angles correctly', () => {
		const angles: JointAngles = [0.5, 1.0, -0.5];
		const packet = encodeAngles(angles);

		expect(packet.length).toBe(17); // 2 + 1 + 1 + 12 + 1

		// Check sync word
		const view = new DataView(packet.buffer);
		expect(view.getUint16(0, false)).toBe(SYNC_WORD);

		// Check length
		expect(view.getUint8(2)).toBe(12);

		// Check command
		expect(view.getUint8(3)).toBe(CMD_SET_JOINT_ANGLE);

		// Check angles
		expect(view.getFloat32(4, true)).toBeCloseTo(0.5, 5);
		expect(view.getFloat32(8, true)).toBeCloseTo(1.0, 5);
		expect(view.getFloat32(12, true)).toBeCloseTo(-0.5, 5);
	});

	test('encodes zero angles', () => {
		const angles: JointAngles = [0, 0, 0];
		const packet = encodeAngles(angles);

		const view = new DataView(packet.buffer);
		expect(view.getFloat32(4, true)).toBe(0);
		expect(view.getFloat32(8, true)).toBe(0);
		expect(view.getFloat32(12, true)).toBe(0);
	});

	test('encodes extreme angles', () => {
		const angles: JointAngles = [Math.PI, -Math.PI, Math.PI / 2];
		const packet = encodeAngles(angles);

		const view = new DataView(packet.buffer);
		expect(view.getFloat32(4, true)).toBeCloseTo(Math.PI, 5);
		expect(view.getFloat32(8, true)).toBeCloseTo(-Math.PI, 5);
		expect(view.getFloat32(12, true)).toBeCloseTo(Math.PI / 2, 5);
	});
});

describe('Protocol Packet Parsing', () => {
	test('parses valid packet', () => {
		// Create a simple test packet
		const buffer = new Uint8Array(10);
		const view = new DataView(buffer.buffer);

		view.setUint16(0, SYNC_WORD, false); // Sync
		view.setUint8(2, 5); // Length
		view.setUint8(3, 0x02); // Command
		// Payload: 5 bytes
		buffer[4] = 0x01;
		buffer[5] = 0x02;
		buffer[6] = 0x03;
		buffer[7] = 0x04;
		buffer[8] = 0x05;
		// Checksum
		buffer[9] = 0x03; // XOR of cmd and payload

		const packet = parsePacket(buffer);

		expect(packet.sync).toBe(SYNC_WORD);
		expect(packet.length).toBe(5);
		expect(packet.command).toBe(0x02);
		expect(packet.payload.length).toBe(5);
		expect(packet.checksum).toBe(0x03);
	});

	test('throws on invalid sync word', () => {
		const buffer = new Uint8Array(10);
		const view = new DataView(buffer.buffer);
		view.setUint16(0, 0x1234, false); // Wrong sync

		expect(() => parsePacket(buffer)).toThrow('Invalid sync word');
	});

	test('throws on packet too small', () => {
		const buffer = new Uint8Array(3);

		expect(() => parsePacket(buffer)).toThrow('Packet too small');
	});

	test('throws on incomplete packet', () => {
		const buffer = new Uint8Array(5);
		const view = new DataView(buffer.buffer);

		view.setUint16(0, SYNC_WORD, false);
		view.setUint8(2, 10); // Says 10 bytes payload
		view.setUint8(3, 0x01);
		// But only 5 bytes total

		expect(() => parsePacket(buffer)).toThrow('Incomplete packet');
	});
});
