import { PROTOCOL_CONFIG, SERIAL_CONFIG } from '$lib/config';

export const SYNC_WORD = PROTOCOL_CONFIG.syncWord;
export const CMD_SET_JOINT_ANGLE = PROTOCOL_CONFIG.commands.setJointAngle;
export const CMD_ACK = PROTOCOL_CONFIG.commands.ack;
export const CMD_TELEMETRY = PROTOCOL_CONFIG.commands.telemetry;

export const PACKET_MIN_SIZE = SERIAL_CONFIG.minPacketSize;
export const PACKET_MAX_SIZE = SERIAL_CONFIG.maxPacketSize;
