import { SERIAL_CONFIG } from '$lib/config';
import { SerialError, logger } from '$lib/core';

export interface SerialPortOptions {
	baudRate: number;
	dataBits?: 7 | 8;
	stopBits?: 1 | 2;
	parity?: 'none' | 'even' | 'odd';
	flowControl?: 'none' | 'hardware';
}

export const DEFAULT_PORT_OPTIONS: SerialPortOptions = {
	baudRate: SERIAL_CONFIG.defaultBaudRate,
	dataBits: SERIAL_CONFIG.defaultDataBits,
	stopBits: SERIAL_CONFIG.defaultStopBits,
	parity: SERIAL_CONFIG.defaultParity,
	flowControl: SERIAL_CONFIG.defaultFlowControl
};

export class SerialPortManager {
	private port: SerialPort | null = null;
	private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
	private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

	async requestPort(): Promise<SerialPort> {
		if (!navigator.serial) {
			throw new SerialError('Web Serial API not supported');
		}

		try {
			this.port = await navigator.serial.requestPort();
			logger.info('Serial port selected');
			return this.port;
		} catch (err) {
			throw new SerialError('Failed to request port', { error: String(err) });
		}
	}

	async open(options: SerialPortOptions = DEFAULT_PORT_OPTIONS): Promise<void> {
		if (!this.port) {
			throw new SerialError('No port selected');
		}

		try {
			await this.port.open(options);
			logger.info('Serial port opened', options);
		} catch (err) {
			throw new SerialError('Failed to open port', { error: String(err) });
		}
	}

	async close(): Promise<void> {
		if (this.reader) {
			await this.reader.cancel();
			this.reader.releaseLock();
			this.reader = null;
		}

		if (this.writer) {
			await this.writer.close();
			this.writer = null;
		}

		if (this.port) {
			await this.port.close();
			logger.info('Serial port closed');
			this.port = null;
		}
	}

	getReader(): ReadableStreamDefaultReader<Uint8Array> {
		if (!this.port || !this.port.readable) {
			throw new SerialError('Port not open for reading');
		}

		if (!this.reader) {
			this.reader = this.port.readable.getReader();
		}

		if (!this.reader) {
			throw new SerialError('Failed to create reader');
		}

		return this.reader;
	}

	getWriter(): WritableStreamDefaultWriter<Uint8Array> {
		if (!this.port || !this.port.writable) {
			throw new SerialError('Port not open for writing');
		}

		if (!this.writer) {
			this.writer = this.port.writable.getWriter();
		}

		if (!this.writer) {
			throw new SerialError('Failed to create writer');
		}

		return this.writer;
	}

	isOpen(): boolean {
		return this.port !== null;
	}

	getPort(): SerialPort | null {
		return this.port;
	}
}
