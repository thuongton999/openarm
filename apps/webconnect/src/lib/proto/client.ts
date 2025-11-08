import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
	type Message,
	MessageSchema,
	type SetJointAngles,
	SetJointAnglesSchema
} from '@openarm/proto-es';

export class ProtoClient {
	private sequence = 0;

	public encodeMessage(message: Message): Uint8Array {
		const messageBytes = toBinary(MessageSchema, message);
		// A varint is used to prefix the length of the message
		const lengthBytes = this.encodeLength(messageBytes.length);
		const combined = new Uint8Array(lengthBytes.length + messageBytes.length);
		combined.set(lengthBytes);
		combined.set(messageBytes, lengthBytes.length);
		return combined;
	}

	public decodeDelimited(buffer: Uint8Array): { message: Message; consumed: number } {
		const { length, offset } = this.decodeLength(buffer);
		const totalLength = offset + length;
		if (buffer.length < totalLength) {
			throw new Error('Buffer is smaller than the delimited message length');
		}
		const messageBytes = buffer.slice(offset, totalLength);
		const message = fromBinary(MessageSchema, messageBytes);
		return { message, consumed: totalLength };
	}

	public createSetJointAngles(angles: {
		baseRad: number;
		shoulderRad: number;
		elbowRad: number;
	}): Message {
		const setJointAngles = create(SetJointAnglesSchema, {
			baseRad: angles.baseRad,
			shoulderRad: angles.shoulderRad,
			elbowRad: angles.elbowRad
		});

		return create(MessageSchema, {
			seq: this.sequence++,
			timestampMs: BigInt(Date.now()),
			payload: {
				case: 'setJointAngles',
				value: setJointAngles
			}
		});
	}

	/**
	 * Encodes a length value as a varint (variable-length integer).
	 *
	 * Varints encode integers using one or more bytes. Each byte uses 7 bits for data
	 * and 1 bit (the MSB) as a continuation flag. If the MSB is set (1), more bytes follow.
	 *
	 * Example: 300 (0x12C) encodes as [0xAC, 0x02]
	 * - First byte: 0xAC = 10101100 (MSB=1, data=0101100)
	 * - Second byte: 0x02 = 00000010 (MSB=0, data=0000010)
	 * - Decoded: (0101100) | (0000010 << 7) = 44 | 256 = 300
	 */
	private encodeLength(value: number): Uint8Array {
		const bytes = [];
		let remaining = value;
		// While the value is larger than 7 bits (127), we need more bytes
		while (remaining > 127) {
			// Take the lower 7 bits and set the MSB (continuation bit) to 1
			bytes.push((remaining & 127) | 128);
			// Shift right by 7 bits to process the next chunk
			remaining >>>= 7;
		}
		// Push the final byte (no continuation bit needed, so MSB = 0)
		bytes.push(remaining);
		return new Uint8Array(bytes);
	}

	/**
	 * Decodes a varint (variable-length integer) from a buffer.
	 *
	 * Reads bytes sequentially, extracting 7 bits of data from each byte.
	 * Continues reading while the MSB (bit 7) is set. Returns the decoded
	 * length and the number of bytes consumed.
	 *
	 * @returns Object containing the decoded length and offset (bytes consumed)
	 */
	private decodeLength(buffer: Uint8Array): { length: number; offset: number } {
		let length = 0;
		let offset = 0;
		let byte: number;
		do {
			// Ensure we haven't run out of buffer
			if (offset >= buffer.length) {
				throw new Error('Buffer exhausted while decoding varint');
			}
			// Read the next byte
			byte = buffer[offset++];
			// Extract the lower 7 bits and shift them into position
			// (offset * 7 - 7) calculates the bit position for this byte's data
			length |= (byte & 127) << (offset * 7 - 7);
		} while (byte > 127); // Continue if MSB is set (byte > 127 means bit 7 is 1)
		return { length, offset };
	}
}
