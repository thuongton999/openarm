import { logger } from '$lib/core';
import { ProtoClient, Message, Status } from '$lib/proto';
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

	const handleMessage = (message: Message) => {
		logger.debug('Received message', message);
		update((state) => ({ ...state, lastMessageTime: Date.now() }));

		// Handle different message types
		switch (message.payload.case) {
			case 'ack':
				const ack = message.payload.value;
				logger.info('Received ack', { seqAck: ack.seqAck, status: ack.status, message: ack.message });
				break;
			case 'heartbeat':
				logger.debug('Received heartbeat');
				break;
			default:
				logger.warn('Received unknown message type', message.payload.case);
		}
	};

	const handleError = (error: Error) => {
		logger.error('Serial error', error);
		update((state) => ({ ...state, status: ConnectionStatus.ERROR, error: error.message }));
	};

	return {
		subscribe,

		async connect() {
			try {
				update((state) => ({ ...state, status: ConnectionStatus.CONNECTING, error: null }));

				// Request serial port
				port = await navigator.serial.requestPort();
				await port.open({ baudRate: 115200 });

				protoClient = new ProtoClient();

				// Start reading loop
				this.startReading();

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

		startReading() {
			if (!port || !protoClient) return;

			const readLoop = async () => {
				try {
					const reader = port.readable?.getReader();
					if (!reader) return;

					const buffer: Uint8Array[] = [];
					let bufferSize = 0;

					while (true) {
						const { value, done } = await reader.read();
						if (done) break;

						buffer.push(value);
						bufferSize += value.length;

						// Try to decode messages from accumulated buffer
						let offset = 0;
						while (offset < bufferSize) {
							try {
								// Find message boundary (protobuf varint length prefix)
								const view = new Uint8Array(bufferSize);
								let viewOffset = 0;

								// Copy all buffer chunks into a single view
								for (const chunk of buffer) {
									view.set(chunk, viewOffset);
									viewOffset += chunk.length;
								}

								const message = protoClient.decodeDelimited(view.slice(offset));
								handleMessage(message);

								// Skip the consumed bytes
								const consumed = protoClient.encodeMessage(message).length;
								offset += consumed;

								// Clean up consumed chunks
								while (buffer.length > 0 && offset >= buffer[0].length) {
									offset -= buffer[0].length;
									buffer.shift();
								}
								bufferSize -= consumed;

							} catch (err) {
								// Not enough data for a complete message, wait for more
								break;
							}
						}
					}

					reader.releaseLock();
				} catch (err) {
					handleError(err instanceof Error ? err : new Error(String(err)));
				}
			};

			readLoop();
		},

		async disconnect() {
			try {
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
		},

		async sendAngles(angles: { baseRad: number; shoulderRad: number; elbowRad: number }) {
			if (!port || !protoClient) {
				logger.warn('Cannot send angles: not connected');
				return;
			}

			try {
				const message = protoClient.createSetJointAngles(angles);
				await protoClient.validateMessage(message);

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
		},
	};
}

export const connection = createConnectionStore();

export const isConnected = derived(connection, ($connection) => {
	return $connection.status === ConnectionStatus.CONNECTED;
});
