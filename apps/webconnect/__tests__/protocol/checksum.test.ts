import { describe, expect, test } from 'bun:test';
import { calculateChecksum, verifyChecksum } from '../../src/lib/protocol/checksum';

describe('Protocol Checksum', () => {
	test('calculates XOR checksum correctly', () => {
		const data = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
		const checksum = calculateChecksum(data);
		expect(checksum).toBe(0x04); // 1 ^ 2 ^ 3 ^ 4 = 4
	});

	test('calculates checksum for empty array', () => {
		const data = new Uint8Array([]);
		const checksum = calculateChecksum(data);
		expect(checksum).toBe(0);
	});

	test('verifies correct checksum', () => {
		const data = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
		const checksum = calculateChecksum(data);
		expect(verifyChecksum(data, checksum)).toBe(true);
	});

	test('rejects incorrect checksum', () => {
		const data = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
		expect(verifyChecksum(data, 0xff)).toBe(false);
	});

	test('checksum is within byte range', () => {
		const data = new Uint8Array([0xff, 0xff, 0xff]);
		const checksum = calculateChecksum(data);
		expect(checksum).toBeGreaterThanOrEqual(0);
		expect(checksum).toBeLessThanOrEqual(255);
	});
});
