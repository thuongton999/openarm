/**
 * Math utilities with memoization for performance
 */

// Memoized conversion functions
const degreeCache = new Map<number, number>();
const radianCache = new Map<number, number>();

/**
 * Convert radians to degrees (memoized)
 * @param radians Angle in radians
 * @returns Angle in degrees
 */
export function toDegrees(radians: number): number {
	if (!degreeCache.has(radians)) {
		degreeCache.set(radians, (radians * 180) / Math.PI);
	}
	return degreeCache.get(radians)!;
}

/**
 * Convert degrees to radians (memoized)
 * @param degrees Angle in degrees
 * @returns Angle in radians
 */
export function toRadians(degrees: number): number {
	if (!radianCache.has(degrees)) {
		radianCache.set(degrees, (degrees * Math.PI) / 180);
	}
	return radianCache.get(degrees)!;
}

/**
 * Clamp a value between min and max
 * @param value Value to clamp
 * @param min Minimum value
 * @param max Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 * @param a Start value
 * @param b End value
 * @param t Interpolation factor (0-1)
 * @returns Interpolated value
 */
export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Map a value from one range to another
 * @param value Value to map
 * @param inMin Input range minimum
 * @param inMax Input range maximum
 * @param outMin Output range minimum
 * @param outMax Output range maximum
 * @returns Mapped value
 */
export function mapRange(
	value: number,
	inMin: number,
	inMax: number,
	outMin: number,
	outMax: number
): number {
	return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Round to specified decimal places
 * @param value Value to round
 * @param decimals Number of decimal places
 * @returns Rounded value
 */
export function roundTo(value: number, decimals: number): number {
	const multiplier = 10 ** decimals;
	return Math.round(value * multiplier) / multiplier;
}

/**
 * Check if two numbers are approximately equal
 * @param a First number
 * @param b Second number
 * @param epsilon Tolerance
 * @returns True if approximately equal
 */
export function approximately(a: number, b: number, epsilon = 0.0001): boolean {
	return Math.abs(a - b) < epsilon;
}

/**
 * Clear memoization caches (for memory management)
 */
export function clearMathCaches(): void {
	degreeCache.clear();
	radianCache.clear();
}
