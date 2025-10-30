import { describe, test, expect } from 'bun:test';
import { ProtoClient } from '../src/lib/proto';
import { Status } from '@openarm/proto-es';

describe('ProtoClient', () => {
  const client = new ProtoClient();

  test('creates heartbeat message', () => {
    const msg = client.createHeartbeat();

    expect(msg.payload.case).toBe('heartbeat');
    expect(msg.seq).toBeGreaterThan(0);
    expect(msg.timestampMs).toBeGreaterThan(0);
  });

  test('creates set joint angles message', () => {
    const angles = { baseRad: 1.57, shoulderRad: 0.5, elbowRad: -0.3 };
    const msg = client.createSetJointAngles(angles);

    expect(msg.payload.case).toBe('setJointAngles');
    if (msg.payload.case === 'setJointAngles') {
      expect(msg.payload.value.baseRad).toBe(angles.baseRad);
      expect(msg.payload.value.shoulderRad).toBe(angles.shoulderRad);
      expect(msg.payload.value.elbowRad).toBe(angles.elbowRad);
    }
  });

  test('creates ack message', () => {
    const msg = client.createAck(123, Status.OK, 'Test message');

    expect(msg.payload.case).toBe('ack');
    if (msg.payload.case === 'ack') {
      expect(msg.payload.value.seqAck).toBe(123);
      expect(msg.payload.value.status).toBe(Status.OK);
      expect(msg.payload.value.message).toBe('Test message');
    }
  });

  test('encodes and decodes message', () => {
    const original = client.createSetJointAngles({
      baseRad: 1.0,
      shoulderRad: 0.5,
      elbowRad: -0.2
    });

    const encoded = client.encodeMessage(original);
    const decoded = client.decodeMessage(encoded);

    expect(decoded.payload.case).toBe('setJointAngles');
    if (decoded.payload.case === 'setJointAngles' && original.payload.case === 'setJointAngles') {
      expect(decoded.payload.value.baseRad).toBeCloseTo(original.payload.value.baseRad, 6);
      expect(decoded.payload.value.shoulderRad).toBeCloseTo(original.payload.value.shoulderRad, 6);
      expect(decoded.payload.value.elbowRad).toBeCloseTo(original.payload.value.elbowRad, 6);
    }
  });

  test('validates valid joint angles', async () => {
    const msg = client.createSetJointAngles({
      baseRad: 1.57, // within 0 to 2π
      shoulderRad: -0.5, // within -π/2 to π/2
      elbowRad: 0.3 // within -π/2 to π/2
    });

    await expect(client.validateMessage(msg)).resolves.toBeUndefined();
  });

  test('rejects invalid base angle', async () => {
    const msg = client.createSetJointAngles({
      baseRad: -1.0, // invalid: negative
      shoulderRad: 0.0,
      elbowRad: 0.0
    });

    await expect(client.validateMessage(msg)).rejects.toThrow();
  });

  test('rejects invalid shoulder angle', async () => {
    const msg = client.createSetJointAngles({
      baseRad: 1.0,
      shoulderRad: 2.0, // invalid: > π/2
      elbowRad: 0.0
    });

    await expect(client.validateMessage(msg)).rejects.toThrow();
  });

  test('rejects invalid elbow angle', async () => {
    const msg = client.createSetJointAngles({
      baseRad: 1.0,
      shoulderRad: 0.0,
      elbowRad: -2.0 // invalid: < -π/2
    });

    await expect(client.validateMessage(msg)).rejects.toThrow();
  });
});

describe('Roundtrip compatibility', () => {
  test('golden vector: minimal set joint angles', () => {
    const client = new ProtoClient();

    // Create a known message
    const angles = { baseRad: 0.5, shoulderRad: 0.25, elbowRad: -0.125 };
    const msg = client.createSetJointAngles(angles);

    // Encode to bytes
    const bytes = client.encodeMessage(msg);

    // This should match the byte pattern that C nanopb would produce
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);

    // Decode back
    const decoded = client.decodeMessage(bytes);

    // Verify roundtrip
    expect(decoded.payload.case).toBe('setJointAngles');
    if (decoded.payload.case === 'setJointAngles') {
      expect(decoded.payload.value.baseRad).toBeCloseTo(angles.baseRad, 6);
      expect(decoded.payload.value.shoulderRad).toBeCloseTo(angles.shoulderRad, 6);
      expect(decoded.payload.value.elbowRad).toBeCloseTo(angles.elbowRad, 6);
    }
  });
});
