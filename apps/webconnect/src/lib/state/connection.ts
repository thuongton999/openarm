import { logger } from '$lib/core';
import { type JointAngles, type Packet, encodeAngles } from '$lib/protocol';
import { SerialPortManager, SerialReader, SerialWriter } from '$lib/serial';
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
	lastPacketTime: number | null;
}

function createConnectionStore() {
	const { subscribe, set, update } = writable<ConnectionState>({
		status: ConnectionStatus.DISCONNECTED,
		error: null,
		lastPacketTime: null
	});

	let portManager: SerialPortManager | null = null;
	let reader: SerialReader | null = null;
	let writer: SerialWriter | null = null;

	const handlePacket = (packet: Packet) => {
		logger.debug('Received packet', packet);
		update((state) => ({ ...state, lastPacketTime: Date.now() }));
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

				portManager = new SerialPortManager();
				await portManager.requestPort();
				await portManager.open();

				const readerStream = portManager.getReader();
				const writerStream = portManager.getWriter();

				reader = new SerialReader(readerStream, handlePacket, handleError);
				writer = new SerialWriter(writerStream, 50);

				reader.start();

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

		async disconnect() {
			try {
				if (reader) {
					reader.stop();
					reader = null;
				}

				if (writer) {
					writer.clearQueue();
					writer = null;
				}

				if (portManager) {
					await portManager.close();
					portManager = null;
				}

				set({ status: ConnectionStatus.DISCONNECTED, error: null, lastPacketTime: null });
				logger.info('Disconnected from serial port');
			} catch (err) {
				logger.error('Disconnect error', err);
			}
		},

		async sendAngles(angles: JointAngles) {
			if (!writer) {
				logger.warn('Cannot send angles: not connected');
				return;
			}

			try {
				const packet = encodeAngles(angles);
				await writer.write(packet);
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
