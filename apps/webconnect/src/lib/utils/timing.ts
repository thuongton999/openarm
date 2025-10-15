/**
 * Timing utilities for performance optimization
 */

/**
 * Debounce function calls to reduce frequency
 * @param fn Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
	fn: T,
	delay: number
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	return (...args: Parameters<T>) => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		timeoutId = setTimeout(() => {
			fn(...args);
			timeoutId = null;
		}, delay);
	};
}

/**
 * Throttle function calls to limit frequency
 * @param fn Function to throttle
 * @param limit Minimum time between calls in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
	fn: T,
	limit: number
): (...args: Parameters<T>) => void {
	let lastCall = 0;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	return (...args: Parameters<T>) => {
		const now = Date.now();
		const timeSinceLastCall = now - lastCall;

		if (timeSinceLastCall >= limit) {
			lastCall = now;
			fn(...args);
		} else {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			timeoutId = setTimeout(() => {
				lastCall = Date.now();
				fn(...args);
				timeoutId = null;
			}, limit - timeSinceLastCall);
		}
	};
}

/**
 * Request animation frame with fallback
 * @param callback Function to call on next frame
 * @returns Frame ID
 */
export function raf(callback: FrameRequestCallback): number {
	return window.requestAnimationFrame?.(callback) ?? window.setTimeout(callback, 16);
}

/**
 * Cancel animation frame with fallback
 * @param id Frame ID to cancel
 */
export function cancelRaf(id: number): void {
	if (window.cancelAnimationFrame) {
		window.cancelAnimationFrame(id);
	} else {
		window.clearTimeout(id);
	}
}

/**
 * Measure execution time of a function
 * @param fn Function to measure
 * @param label Optional label for logging
 * @returns Result and duration
 */
export async function measure<T>(
	fn: () => T | Promise<T>,
	label?: string
): Promise<{ result: T; duration: number }> {
	const start = performance.now();
	const result = await fn();
	const duration = performance.now() - start;

	if (label) {
		console.log(`[${label}] took ${duration.toFixed(2)}ms`);
	}

	return { result, duration };
}

/**
 * Create a memoized version of a function
 * @param fn Function to memoize
 * @returns Memoized function
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
	fn: T
): (...args: Parameters<T>) => ReturnType<T> {
	const cache = new Map<string, ReturnType<T>>();

	return (...args: Parameters<T>): ReturnType<T> => {
		const key = JSON.stringify(args);

		if (cache.has(key)) {
			return cache.get(key)!;
		}

		const result = fn(...args) as ReturnType<T>;
		cache.set(key, result);
		return result;
	};
}

/**
 * Wait for a specified duration
 * @param ms Milliseconds to wait
 * @returns Promise that resolves after delay
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a periodic timer
 * @param callback Function to call periodically
 * @param interval Interval in milliseconds
 * @returns Function to stop the timer
 */
export function createTimer(callback: () => void, interval: number): () => void {
	const intervalId = setInterval(callback, interval);
	return () => clearInterval(intervalId);
}
