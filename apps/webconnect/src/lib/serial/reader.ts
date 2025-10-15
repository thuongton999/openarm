import { logger } from '$lib/core';
import { PACKET_MAX_SIZE, type Packet, SYNC_WORD, parsePacket } from '$lib/protocol';

type PacketCallback = (packet: Packet) => void;
type ErrorCallback = (error: Error) => void;

enum ReaderState {
	IDLE = 0,
	SYNCING = 1,
	READING_HEADER = 2,
	READING_PAYLOAD = 3
}

export class SerialReader {
	private state: ReaderState = ReaderState.IDLE;
	private readonly buffer: Uint8Array = new Uint8Array(PACKET_MAX_SIZE);
	private bufferIndex = 0;
	private expectedLength = 0;
	private isReading = false;

	constructor(
		private readonly reader: ReadableStreamDefaultReader<Uint8Array>,
		private readonly onPacket: PacketCallback,
		private readonly onError: ErrorCallback
	) {}

	async start(): Promise<void> {
		if (this.isReading) {
			return;
		}

		this.isReading = true;
		this.state = ReaderState.SYNCING;
		this.bufferIndex = 0;

		try {
			while (this.isReading) {
				const { value, done } = await this.reader.read();

				if (done) {
					logger.info('Serial reader stream closed');
					break;
				}

				if (value) {
					this.processBytes(value);
				}
			}
		} catch (err) {
			logger.error('Serial reader error', err);
			this.onError(err instanceof Error ? err : new Error(String(err)));
		} finally {
			this.isReading = false;
		}
	}

	stop(): void {
		this.isReading = false;
	}

	private processBytes(data: Uint8Array): void {
		for (const byte of data) {
			switch (this.state) {
				case ReaderState.SYNCING:
					this.handleSyncing(byte);
					break;

				case ReaderState.READING_HEADER:
					this.handleReadingHeader(byte);
					break;

				case ReaderState.READING_PAYLOAD:
					this.handleReadingPayload(byte);
					break;
			}
		}
	}

	private handleSyncing(byte: number): void {
		this.buffer[this.bufferIndex++] = byte;

		if (this.bufferIndex >= 2) {
			const view = new DataView(this.buffer.buffer, 0, 2);
			const sync = view.getUint16(0, false);

			if (sync === SYNC_WORD) {
				logger.debug('Sync word found');
				this.state = ReaderState.READING_HEADER;
			} else {
				// Shift buffer and keep looking
				this.buffer[0] = this.buffer[1];
				this.bufferIndex = 1;
			}
		}
	}

	private handleReadingHeader(byte: number): void {
		this.buffer[this.bufferIndex++] = byte;

		if (this.bufferIndex >= 4) {
			// We have: sync(2) + length(1) + cmd(1)
			this.expectedLength = this.buffer[2];
			this.state = ReaderState.READING_PAYLOAD;
		}
	}

	private handleReadingPayload(byte: number): void {
		this.buffer[this.bufferIndex++] = byte;

		const totalExpected = 4 + this.expectedLength + 1; // header + payload + checksum

		if (this.bufferIndex >= totalExpected) {
			this.processPacket();
			this.resetState();
		}
	}

	private processPacket(): void {
		try {
			const packetData = this.buffer.slice(0, this.bufferIndex);
			const packet = parsePacket(packetData);
			logger.debug('Packet received', { cmd: packet.command, length: packet.length });
			this.onPacket(packet);
		} catch (err) {
			logger.error('Failed to parse packet', err);
			this.onError(err instanceof Error ? err : new Error(String(err)));
		}
	}

	private resetState(): void {
		this.state = ReaderState.SYNCING;
		this.bufferIndex = 0;
		this.expectedLength = 0;
	}
}
