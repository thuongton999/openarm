# Web Interface Integration Guide

This guide provides comprehensive instructions for integrating a web interface with the Open Arm firmware using WebUSB/WebSerial and Protocol Buffers.

## Overview

The communication between the web interface and the STM32 firmware relies on a simple, robust protocol:

1.  **Connection**: The browser connects to the STM32's USB Virtual COM Port (CDC) using the WebUSB or WebSerial API.
2.  **Data Format**: Commands are sent as Protocol Buffer messages. This ensures data is compact, type-safe, and versionable.
3.  **Protocol**: The web app encodes a `SetJointAngles` message, sends the binary data to the firmware, and the firmware decodes and executes the command.

## Prerequisites

Your web application project (like the one in `apps/webconnect`) should have the following dependencies:

-   **`@bufbuild/protobuf`**: The runtime library for Protocol Buffers in JavaScript/TypeScript.
-   **`@openarm/proto-es`**: The pre-generated TypeScript code from our `.proto` definitions. This package is already in this monorepo.

Your `package.json` should look something like this:

```json
{
  "dependencies": {
    "@bufbuild/protobuf": "^1.3.0",
    "@openarm/proto-es": "workspace:*"
  }
}
```

## Step 1: Connecting to the Device

You can use either the WebSerial API (recommended for simplicity) or the WebUSB API to connect to the device. The firmware enumerates as a standard USB CDC device (Virtual COM Port).

### Using the WebSerial API

The WebSerial API is straightforward for COM port communication.

```typescript
import { openarm } from '@openarm/proto-es';

class RobotConnection {
  private port: SerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  async connect() {
    try {
      // Prompt user to select a serial port.
      this.port = await navigator.serial.requestPort();
      
      // Open the port.
      await this.port.open({ baudRate: 115200 }); // Baud rate is not critical for USB CDC

      this.writer = this.port.writable!.getWriter();
      this.reader = this.port.readable!.getReader();
      
      console.log('Successfully connected to the robot arm.');
      
    } catch (error) {
      console.error('Error connecting to serial port:', error);
    }
  }

  async disconnect() {
    if (this.writer) {
      this.writer.releaseLock();
    }
    if (this.reader) {
      this.reader.releaseLock();
    }
    if (this.port) {
      await this.port.close();
    }
    this.port = null;
    console.log('Disconnected from the robot arm.');
  }
  
  // ... send methods will go here
}
```

## Step 2: Encoding and Sending Commands

Once connected, you can send commands. The process involves creating a message object, populating it, encoding it into a binary `Uint8Array`, and writing it to the serial port.

### Creating and Sending a `SetJointAngles` Message

The `packages/proto-es` provides the necessary TypeScript classes to construct messages.

```typescript
// Add this method to your RobotConnection class
async sendJointAngles(angles: { base: number; shoulder: number; elbow: number }, seq: number) {
  if (!this.writer) {
    console.error('Not connected.');
    return;
  }

  // 1. Create the message object from the generated code
  const message = new openarm.v1.Message({
    seq: seq,
    timestampMs: BigInt(Date.now()),
    payload: {
      case: 'setJointAngles',
      value: new openarm.v1.SetJointAngles({
        baseRad: angles.base,
        shoulderRad: angles.shoulder,
        elbowRad: angles.elbow,
      }),
    },
  });

  // 2. Encode the message to a Uint8Array
  const buffer = message.toBinary();

  // 3. Write the buffer to the serial port
  await this.writer.write(buffer);
}
```

## Step 3: Handling ACKs (Future Enhancement)

While the current firmware doesn't send acknowledgments, the protocol supports it. You can prepare your web application to handle them. The `Ack` message can be decoded similarly.

```typescript
// Example of a read loop to listen for incoming messages
async readLoop() {
  while (this.port?.readable) {
    try {
      const { value, done } = await this.reader!.read();
      if (done) {
        break;
      }
      
      // Decode the incoming message
      const ackMessage = openarm.v1.Message.fromBinary(value);
      
      if (ackMessage.payload.case === 'ack') {
        console.log('Received ACK:', ackMessage.payload.value);
      }
    } catch (error) {
      console.error('Read loop error:', error);
      break;
    }
  }
}
```

## Complete Example

Here is a complete example of a TypeScript class to manage the connection and communication.

```typescript
import { openarm } from '@openarm/proto-es';

export class RobotArm {
  private port: SerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private sequence = 0;

  public isConnected = false;

  async connect() {
    try {
      this.port = await navigator.serial.requestPort({
        // Filter for STMicroelectronics devices
        filters: [{ usbVendorId: 0x0483, usbProductId: 0x5740 }],
      });
      await this.port.open({ baudRate: 115200 });
      
      this.writer = this.port.writable!.getWriter();
      this.reader = this.port.readable!.getReader();
      this.isConnected = true;
      
      console.log('Connected to Open Arm');
      // this.startReadLoop(); // Uncomment when ACKs are implemented
    } catch (err) {
      console.error('Connection failed:', err);
    }
  }

  async disconnect() {
    if (this.writer) {
      await this.writer.close();
      this.writer = null;
    }
     if (this.reader) {
      await this.reader.cancel();
      this.reader = null;
    }
    if (this.port) {
      await this.port.close();
      this.port = null;
    }
    this.isConnected = false;
    console.log('Disconnected');
  }

  async setJoints(baseRad: number, shoulderRad: number, elbowRad: number) {
    if (!this.writer) {
      throw new Error('Not connected');
    }

    const message = new openarm.v1.Message({
      seq: this.sequence++,
      timestampMs: BigInt(Date.now()),
      payload: {
        case: 'setJointAngles',
        value: new openarm.v1.SetJointAngles({
          baseRad,
          shoulderRad,
          elbowRad,
        }),
      },
    });

    const buffer = message.toBinary();
    await this.writer.write(buffer);
  }
  
  // Example of a read loop
  private async startReadLoop() {
    while (this.port?.readable && this.isConnected) {
        try {
            const { value, done } = await this.reader!.read();
            if (done) break;
            
            const ack = openarm.v1.Message.fromBinary(value);
            console.log('Received:', ack.toJsonString());

        } catch (error) {
            console.error('Read error:', error);
            break;
        }
    }
  }
}
```

## Troubleshooting

-   **"No port selected" error**: The user must interact with the page (e.g., click a "Connect" button) to trigger `navigator.serial.requestPort()`. It cannot be called automatically.
-   **Device not found**: Ensure the STM32 is plugged in and the correct USB driver (usually built into the OS) is active. Make sure no other application (like a serial terminal) is using the port.
-   **Permission Denied**: The browser needs permission to access serial devices. This is usually handled when the user selects the port. On Linux, you might need to add your user to the `dialout` or `tty` group.
-   **Data Not Being Received**:
    -   Verify the physical USB connection.
    -   Check the browser's developer console for any errors.
    -   Ensure the firmware is flashed correctly and running.
    -   Double-check that you are sending a correctly formatted `Uint8Array`.

## References

-   [WebSerial API on MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
-   [WebUSB API on MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API)
-   [Bufbuild/protobuf-es library](https://github.com/bufbuild/protobuf-es)
-   [Proto-ES Generated Code (`packages/proto-es`)](./packages/proto-es)
