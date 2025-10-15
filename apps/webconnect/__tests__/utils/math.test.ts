import { describe, expect, test } from 'bun:test';
import {
	approximately,
	clamp,
	lerp,
	mapRange,
	roundTo,
	toDegrees,
	toRadians
} from '../../src/lib/utils/math';

describe('Math Utilities', () => {
	describe('toDegrees', () => {
		test('converts radians to degrees', () => {
			expect(toDegrees(Math.PI)).toBeCloseTo(180, 5);
			expect(toDegrees(Math.PI / 2)).toBeCloseTo(90, 5);
			expect(toDegrees(0)).toBe(0);
		});

		test('memoizes results', () => {
			const result1 = toDegrees(Math.PI);
			const result2 = toDegrees(Math.PI);
			expect(result1).toBe(result2); // Same reference due to memoization
		});
	});

	describe('toRadians', () => {
		test('converts degrees to radians', () => {
			expect(toRadians(180)).toBeCloseTo(Math.PI, 5);
			expect(toRadians(90)).toBeCloseTo(Math.PI / 2, 5);
			expect(toRadians(0)).toBe(0);
		});

		test('memoizes results', () => {
			const result1 = toRadians(180);
			const result2 = toRadians(180);
			expect(result1).toBe(result2);
		});
	});

	describe('clamp', () => {
		test('clamps value within range', () => {
			expect(clamp(5, 0, 10)).toBe(5);
			expect(clamp(-5, 0, 10)).toBe(0);
			expect(clamp(15, 0, 10)).toBe(10);
		});

		test('handles edge cases', () => {
			expect(clamp(0, 0, 10)).toBe(0);
			expect(clamp(10, 0, 10)).toBe(10);
		});
	});

	describe('lerp', () => {
		test('interpolates between values', () => {
			expect(lerp(0, 10, 0)).toBe(0);
			expect(lerp(0, 10, 0.5)).toBe(5);
			expect(lerp(0, 10, 1)).toBe(10);
		});

		test('clamps interpolation factor', () => {
			expect(lerp(0, 10, -0.5)).toBe(0);
			expect(lerp(0, 10, 1.5)).toBe(10);
		});
	});

	describe('mapRange', () => {
		test('maps value from one range to another', () => {
			expect(mapRange(5, 0, 10, 0, 100)).toBe(50);
			expect(mapRange(0, 0, 10, 0, 100)).toBe(0);
			expect(mapRange(10, 0, 10, 0, 100)).toBe(100);
		});

		test('maps negative ranges', () => {
			expect(mapRange(0, -10, 10, 0, 100)).toBe(50);
		});
	});

	describe('roundTo', () => {
		test('rounds to decimal places', () => {
			expect(roundTo(3.14159, 2)).toBe(3.14);
			expect(roundTo(3.14159, 0)).toBe(3);
			expect(roundTo(3.14159, 4)).toBe(3.1416);
		});
	});

	describe('approximately', () => {
		test('checks approximate equality', () => {
			expect(approximately(1.0001, 1.0002, 0.001)).toBe(true);
			expect(approximately(1.0001, 1.0002, 0.00001)).toBe(false);
			expect(approximately(Math.PI, 3.14159, 0.001)).toBe(true);
		});
	});
});
