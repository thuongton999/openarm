import { logger } from '@lib/core';
import { ProtoClient } from '@lib/proto';
import type { Message } from '@openarm/proto-es';
import { derived, writable } from 'svelte/store';

export enum ConnectionStatus {
	DISCONNECTED = 'disconnected',
	CONNECTING = 'connecting',
	CONNECTED = 'connected',
	ERROR = 'error'
}

interface ConnectionState {
	status: ConnectionStatus;
	error: string | null;
	lastMessageTime: number | null;
}

function createConnectionStore() {
	const { subscribe, set, update } = writable<ConnectionState>({
		status: ConnectionStatus.DISCONNECTED,
		error: null,
		lastMessageTime: null
	});

	let port: SerialPort | null = null;
	let protoClient: ProtoClient | null = null;
	let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
	let keepReading = false;

	const handleMessage = (message: Message) => {
		logger.debug('Received message', message);
		update((state) => ({ ...state, lastMessageTime: Date.now() }));

		// Handle different message types
		switch (message.payload.case) {
			case 'ack':
				const ack = message.payload.value;
				logger.info('Received ack', {
					seqAck: ack.seqAck,
					status: ack.status,
					message: ack.message
				});
				break;
			case 'heartbeat':
				logger.debug('Received heartbeat');
				break;
			default:
				logger.warn('Received unknown message type', message.payload.case);
		}
	};

	const disconnect = async () => {
		try {
			await stopReading();

			if (port?.writable) {
				const writer = port.writable.getWriter();
				await writer.close();
				writer.releaseLock();
			}

			if (port) {
				await port.close();
				port = null;
			}

			protoClient = null;

			set({ status: ConnectionStatus.DISCONNECTED, error: null, lastMessageTime: null });
			logger.info('Disconnected from serial port');
		} catch (err) {
			logger.error('Disconnect error', err);
		}
	};

	const handleError = (error: Error) => {
		logger.error('Serial error', error);
		set({ status: ConnectionStatus.ERROR, error: error.message, lastMessageTime: null });
		void disconnect();
	};

	const startReading = async () => {
		if (!port || !protoClient) return;
		keepReading = true;

		reader = port.readable?.getReader() ?? null;
		if (!reader) {
			handleError(new Error('Failed to get reader'));
			return;
		}

		let buffer = new Uint8Array(0);

		while (port.readable && keepReading) {
			try {
				const { value, done } = await reader.read();
				if (done) {
					break;
				}

				const newBuffer = new Uint8Array(buffer.length + value.length);
				newBuffer.set(buffer);
				newBuffer.set(value, buffer.length);
				buffer = newBuffer;

				// Try to decode one or more messages from the buffer
				while (buffer.length > 0) {
					try {
						const { message, consumed } = protoClient.decodeDelimited(buffer);
						handleMessage(message);
						buffer = buffer.slice(consumed);
					} catch (err) {
						// Not enough data for a complete message, wait for more
						break;
					}
				}
			} catch (err) {
				if (keepReading) {
					handleError(err instanceof Error ? err : new Error(String(err)));
				}
				break;
			}
		}

		reader.releaseLock();
		reader = null;
	};

	const stopReading = async () => {
		keepReading = false;
		if (reader) {
			try {
				await reader.cancel();
			} catch (err) {
				// Ignore errors on cancel, as the port might already be closed
			}
		}
	};

	return {
		subscribe,

		async connect() {
			try {
				update((state) => ({ ...state, status: ConnectionStatus.CONNECTING, error: null }));

				// Request serial port
				port = await navigator.serial.requestPort({
					filters: [{ usbVendorId: 0x0483, usbProductId: 0x5740 }]
				});
				await port.open({ baudRate: 115200 });

				protoClient = new ProtoClient();

				// Start reading loop
				startReading();

				update((state) => ({ ...state, status: ConnectionStatus.CONNECTED }));
				logger.info('Connected to serial port');
			} catch (err) {
				const error = err instanceof Error ? err : new Error(String(err));
				update((state) => ({
					...state,
					status: ConnectionStatus.ERROR,
					error: error.message
				}));
				logger.error('Connection failed', err);
			}
		},

		disconnect,

		async sendAngles(angles: { baseRad: number; shoulderRad: number; elbowRad: number }) {
			if (!port || !protoClient) {
				logger.warn('Cannot send angles: not connected');
				return;
			}

			try {
				const message = protoClient.createSetJointAngles(angles);

				const writer = port.writable?.getWriter();
				if (!writer) {
					throw new Error('Failed to get writer');
				}

				const bytes = protoClient.encodeMessage(message);
				await writer.write(bytes);
				writer.releaseLock();

				logger.debug('Sent joint angles', angles);
			} catch (err) {
				logger.error('Failed to send angles', err);
				handleError(err instanceof Error ? err : new Error(String(err)));
			}
		}
	};
}

export const connection = createConnectionStore();

export const isConnected = derived(connection, ($connection) => {
	return $connection.status === ConnectionStatus.CONNECTED;
});
