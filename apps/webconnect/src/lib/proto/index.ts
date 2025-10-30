import { create, toBinary, fromBinary } from '@bufbuild/protobuf';
import { MessageSchema, SetJointAnglesSchema, AckSchema, HeartbeatSchema, Status } from '@openarm/proto-es';

export class ProtoClient {
  private seq = 0;

  /**
   * Create a heartbeat message
   */
  createHeartbeat() {
    const msg = create(MessageSchema);
    msg.seq = ++this.seq;
    msg.timestampMs = BigInt(Date.now());
    msg.payload = { case: 'heartbeat', value: create(HeartbeatSchema) };
    return msg;
  }

  /**
   * Create a set joint angles message
   */
  createSetJointAngles(angles: { baseRad: number; shoulderRad: number; elbowRad: number }) {
    const msg = create(MessageSchema);
    msg.seq = ++this.seq;
    msg.timestampMs = BigInt(Date.now());

    const setAngles = create(SetJointAnglesSchema);
    setAngles.baseRad = angles.baseRad;
    setAngles.shoulderRad = angles.shoulderRad;
    setAngles.elbowRad = angles.elbowRad;

    msg.payload = { case: 'setJointAngles', value: setAngles };
    return msg;
  }

  /**
   * Create an ack message
   */
  createAck(seqAck: number, status: Status, message: string = '') {
    const msg = create(MessageSchema);
    msg.seq = ++this.seq;
    msg.timestampMs = BigInt(Date.now());

    const ack = create(AckSchema);
    ack.seqAck = seqAck;
    ack.status = status;
    ack.message = message;

    msg.payload = { case: 'ack', value: ack };
    return msg;
  }

  /**
   * Validate a message before sending
   */
  async validateMessage(msg): Promise<void> {
    // Manual validation for joint angles
    if (msg.payload.case === 'setJointAngles') {
      const angles = msg.payload.value;
      if (angles.baseRad < 0.0 || angles.baseRad > 6.283185307179586) {
        throw new Error(`Base angle ${angles.baseRad} out of range [0, 2π]`);
      }
      if (angles.shoulderRad < -1.5707963267948966 || angles.shoulderRad > 1.5707963267948966) {
        throw new Error(`Shoulder angle ${angles.shoulderRad} out of range [-π/2, π/2]`);
      }
      if (angles.elbowRad < -1.5707963267948966 || angles.elbowRad > 1.5707963267948966) {
        throw new Error(`Elbow angle ${angles.elbowRad} out of range [-π/2, π/2]`);
      }
    }
  }

  /**
   * Encode a message to bytes
   */
  encodeMessage(msg): Uint8Array {
    return toBinary(MessageSchema, msg);
  }

  /**
   * Decode bytes to a message
   */
  decodeMessage(bytes: Uint8Array) {
    return fromBinary(MessageSchema, bytes);
  }

  /**
   * Encode message with varint length prefix for transport
   */
  encodeDelimited(msg): Uint8Array {
    return toBinary(MessageSchema, msg);
  }

  /**
   * Decode message from varint length-prefixed bytes
   */
  decodeDelimited(bytes: Uint8Array) {
    return fromBinary(MessageSchema, bytes);
  }
}

// Export status enum for convenience
export { Status };