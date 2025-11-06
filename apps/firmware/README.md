# Open Arm Firmware

STM32F103C8T6 firmware for controlling a 3DOF robot arm via USB CDC with Protocol Buffers.

## Overview

This firmware enables control of a 3-degree-of-freedom robot arm through a web interface. It receives joint angle commands via USB CDC using Protocol Buffers (nanopb) and controls servo motors through a PCA9685 PWM driver via I2C.

## Hardware Requirements

- **MCU**: STM32F103C8T6 (Blue Pill)
- **PWM Driver**: PCA9685 16-channel PWM/Servo driver
- **Servos**: 3x MG90S servos (or compatible)
- **Communication**: USB CDC (Virtual COM Port)
- **I2C**: Connected to PCA9685 (PB6=SCL, PB7=SDA)

### Wiring

```
STM32F103C8T6 → PCA9685
  PB6 (I2C1_SCL) → SCL
  PB7 (I2C1_SDA) → SDA
  GND → GND
  3.3V → VCC

PCA9685 → Servos
  Channel 0 → Base servo
  Channel 1 → Shoulder servo
  Channel 2 → Elbow servo
  V+ → External 5V power supply for servos
```

## Software Architecture

### FreeRTOS Tasks

1. **DefaultTask** (Normal Priority)
   - Initializes USB device
   - Idle task

2. **TProtocolParser** (Normal Priority)
   - Waits for USB data signal from ISR
   - Decodes Protocol Buffer messages in task context
   - Validates and queues commands for servo control
   - **See `ISR_TASK_ARCHITECTURE.md` for detailed explanation**

3. **TServoControl** (High Priority)
   - Reads commands from queue
   - Controls servos via PCA9685
   - Thread-safe with mutex protection

4. **TSafetyMonitor** (Realtime Priority)
   - Monitors command timeout (2 seconds)
   - Can trigger emergency stop if needed

### Communication Protocol

The firmware uses Protocol Buffers (nanopb) for communication:

```protobuf
message Message {
  uint32 seq = 1;
  uint64 timestamp_ms = 2;
  oneof payload {
    SetJointAngles set_joint_angles = 11;
    // ... other message types
  }
}

message SetJointAngles {
  float base_rad = 1;       // Base angle in radians
  float shoulder_rad = 2;   // Shoulder angle in radians
  float elbow_rad = 3;      // Elbow angle in radians
}
```

### Data Flow (ISR-to-Task Pattern)

1. Web interface sends protobuf-encoded message via USB CDC
2. `CDC_Receive_FS()` **ISR** stores data in circular buffer (fast, non-blocking)
3. ISR signals `UsbDataAvailable` semaphore to wake up task
4. `TProtocolParser` **task** wakes up and calls `USB_ProcessReceivedData()`
5. Task decodes protobuf message (can use mutex, blocking operations)
6. Angles are validated and clamped to safe limits
7. Command is queued to FreeRTOS message queue
8. `TServoControl` task processes command
9. PCA9685 driver converts angles to PWM signals
10. Servos move to target positions

**Important**: This architecture ensures no blocking operations occur in ISR context. See `ISR_TASK_ARCHITECTURE.md` for detailed explanation.

## Building the Project

### Prerequisites

- Keil MDK-ARM (μVision)
- STM32CubeMX (for regenerating peripheral code if needed)

### Setup Steps

1. **Add Protocol Buffers files to Keil project**
   
   Follow instructions in `PROTO_INTEGRATION.md`:
   - Add nanopb library files
   - Add generated protobuf files
   - Configure include paths

2. **Build the project**
   
   ```
   Open firmware.uvprojx in Keil MDK
   Build → Rebuild All Target Files
   ```

3. **Flash to STM32**
   
   ```
   Flash → Download
   ```
   
   Or use ST-Link Utility / OpenOCD

## Configuration

### Servo Calibration

Edit `apps/firmware/Core/Inc/pca9685.h`:

```c
#define SERVO_MIN_PULSE_US    500   // Minimum pulse width
#define SERVO_MAX_PULSE_US    2500  // Maximum pulse width
#define SERVO_CENTER_PULSE_US 1500  // Center position
```

Adjust these values based on your servo specifications.

### Joint Angle Limits

Edit `apps/firmware/Core/Inc/protocol.h`:

```c
#define BASE_MIN_RAD        (-3.14159f)  // Base minimum angle
#define BASE_MAX_RAD        (3.14159f)   // Base maximum angle
#define SHOULDER_MIN_RAD    (0.0f)       // Shoulder minimum angle
#define SHOULDER_MAX_RAD    (3.14159f)   // Shoulder maximum angle
#define ELBOW_MIN_RAD       (0.0f)       // Elbow minimum angle
#define ELBOW_MAX_RAD       (3.14159f)   // Elbow maximum angle
```

### Safety Timeout

Edit `apps/firmware/Core/Src/freertos.c` in `StartSafetyMonitor()`:

```c
const uint32_t TIMEOUT_MS = 2000; // 2 second timeout
```

## File Structure

```
apps/firmware/
├── Core/
│   ├── Inc/
│   │   ├── main.h
│   │   ├── pca9685.h          # PCA9685 driver header
│   │   └── protocol.h         # Protocol Buffers helpers
│   └── Src/
│       ├── main.c             # Main initialization
│       ├── pca9685.c          # PCA9685 driver implementation
│       ├── protocol.c         # Protocol handling
│       ├── freertos.c         # FreeRTOS tasks
│       └── i2c.c              # I2C peripheral config
├── USB_DEVICE/
│   └── App/
│       └── usbd_cdc_if.c      # USB CDC interface
├── MDK-ARM/
│   └── firmware.uvprojx       # Keil project file
├── PROTO_INTEGRATION.md       # Protocol Buffers setup guide
└── README.md                  # This file
```

## Key Features

- ✅ USB CDC communication (Virtual COM Port)
- ✅ Protocol Buffers (nanopb) message encoding/decoding
- ✅ PCA9685 I2C PWM driver
- ✅ FreeRTOS multitasking
- ✅ Thread-safe servo control with mutexes
- ✅ Angle validation and clamping
- ✅ Safety monitoring with timeout detection
- ✅ Circular buffer for USB data reception

## Debugging

### USB CDC

- Check if device appears as Virtual COM Port in Device Manager
- Use serial terminal (115200 baud) to monitor communication
- LED indicators (if connected) can show USB status

### I2C Communication

- Verify I2C clock speed (400 kHz)
- Check pull-up resistors on SCL/SDA lines
- Use logic analyzer to verify I2C transactions

### Servo Issues

- Verify external power supply for servos (5V, sufficient current)
- Check PWM frequency (should be 50 Hz for analog servos)
- Verify pulse width ranges match servo specifications

## Troubleshooting

**Problem**: Servos don't move
- Check I2C connection to PCA9685
- Verify servo power supply
- Check if PCA9685 is properly initialized
- Verify PWM signals with oscilloscope

**Problem**: USB not recognized
- Check USB cable (must support data, not just power)
- Verify USB peripheral is enabled in STM32CubeMX
- Check if USB CDC driver is installed on host

**Problem**: Erratic servo movement
- Check for noise on I2C lines
- Verify servo power supply is stable
- Add decoupling capacitors near servos
- Check for buffer overflow in USB reception

## Future Enhancements

- [ ] Implement ACK messages back to host
- [ ] Add position feedback with encoders
- [ ] Implement trajectory planning
- [ ] Add emergency stop button support
- [ ] Implement current sensing for overload detection
- [ ] Add EEPROM storage for calibration data

## License

See project root LICENSE file.

## References

- [STM32F103C8T6 Datasheet](https://www.st.com/resource/en/datasheet/stm32f103c8.pdf)
- [PCA9685 Datasheet](https://www.nxp.com/docs/en/data-sheet/PCA9685.pdf)
- [Nanopb Documentation](https://jpa.kapsi.fi/nanopb/)
- [FreeRTOS Documentation](https://www.freertos.org/Documentation/RTOS_book.html)

