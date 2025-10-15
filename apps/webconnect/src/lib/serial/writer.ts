import { SERIAL_CONFIG } from '$lib/config';
import { SerialError, logger } from '$lib/core';
import { sleep } from '$lib/utils';

export class SerialWriter {
	private queue: Uint8Array[] = [];
	private isWriting = false;
	private readonly throttleMs: number;
	private lastWriteTime = 0;
	private readonly maxQueueSize = 10; // Limit queue to prevent memory issues

	constructor(
		private readonly writer: WritableStreamDefaultWriter<Uint8Array>,
		throttleHz: number = SERIAL_CONFIG.writeThrottleHz
	) {
		this.throttleMs = 1000 / throttleHz;
	}

	async write(data: Uint8Array): Promise<void> {
		// Limit queue size to prevent memory buildup during rapid updates
		if (this.queue.length >= this.maxQueueSize) {
			// Remove oldest entries, keep only the latest
			this.queue = this.queue.slice(-this.maxQueueSize + 1);
		}
		
		this.queue.push(data);
		if (!this.isWriting) {
			await this.processQueue();
		}
	}

	private async processQueue(): Promise<void> {
		this.isWriting = true;

		while (this.queue.length > 0) {
			const now = Date.now();
			const timeSinceLastWrite = now - this.lastWriteTime;

			if (timeSinceLastWrite < this.throttleMs) {
				await sleep(this.throttleMs - timeSinceLastWrite);
			}

			const data = this.queue.shift();
			if (data) {
				try {
					await this.writer.write(data);
					this.lastWriteTime = Date.now();
					logger.debug('Data written', { size: data.length });
				} catch (err) {
					logger.error('Write error', err);
					throw new SerialError('Failed to write data', { error: String(err) });
				}
			}
		}

		this.isWriting = false;
	}

	getQueueSize(): number {
		return this.queue.length;
	}

	clearQueue(): void {
		this.queue = [];
	}
}
