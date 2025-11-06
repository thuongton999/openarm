# ISR-to-Task Communication Architecture

## Problem Statement

The original implementation attempted to acquire a FreeRTOS mutex (`RxBufferMutexHandle`) directly from the USB CDC receive callback (`CDC_Receive_FS`), which executes in **Interrupt Service Routine (ISR)** context. This is not allowed in FreeRTOS because:

1. **Blocking operations are forbidden in ISRs**: Functions like `osMutexAcquire()` with a timeout can cause the calling context to block, which is illegal in an ISR.
2. **ISRs must be fast**: They should do minimal work and return quickly.
3. **Priority inversion**: ISRs run at higher priority than tasks, and blocking in an ISR defeats the purpose of the RTOS scheduler.

## Solution: Deferred Interrupt Processing

We implement a **deferred interrupt processing** pattern using a binary semaphore to signal a dedicated task.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      USB CDC ISR                             │
│                   (CDC_Receive_FS)                           │
│                                                              │
│  1. Copy data to circular buffer (fast, no blocking)        │
│  2. Signal semaphore (osSemaphoreRelease)                   │
│  3. Return immediately                                       │
└──────────────────────┬───────────────────────────────────────┘
                       │ Signal via
                       │ UsbDataAvailableHandle
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  TProtocolParser Task                        │
│              (StartProtocolParser)                           │
│                                                              │
│  1. Wait on semaphore (osSemaphoreAcquire)                  │
│  2. Acquire mutex for buffer access                          │
│  3. Read data from circular buffer                           │
│  4. Decode protobuf message                                  │
│  5. Validate and clamp angles                                │
│  6. Send command to queue                                    │
│  7. Release mutex                                            │
│  8. Go back to waiting                                       │
└──────────────────────┬───────────────────────────────────────┘
                       │ Send command via
                       │ CommandQueueHandle
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  TServoControl Task                          │
│               (StartServoControl)                            │
│                                                              │
│  1. Wait for command from queue                              │
│  2. Control servos via PCA9685                               │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. USB CDC ISR (`CDC_Receive_FS`)

**Location**: `apps/firmware/USB_DEVICE/App/usbd_cdc_if.c`

```c
static int8_t CDC_Receive_FS(uint8_t* Buf, uint32_t *Len)
{
  // Copy received data to circular buffer (no mutex needed)
  // This is safe because only ISR writes, only task reads
  for (uint32_t i = 0; i < *Len; i++) {
    usb_rx_buffer[rx_write_idx] = Buf[i];
    rx_write_idx = (rx_write_idx + 1) % PROTOCOL_BUFFER_SIZE;
    
    if (rx_write_idx == rx_read_idx) {
      // Buffer overflow - drop oldest data
      rx_read_idx = (rx_read_idx + 1) % PROTOCOL_BUFFER_SIZE;
    }
  }
  
  // Signal the task (safe from ISR)
  osSemaphoreRelease(UsbDataAvailableHandle);
  
  // Continue receiving
  USBD_CDC_SetRxBuffer(&hUsbDeviceFS, &Buf[0]);
  USBD_CDC_ReceivePacket(&hUsbDeviceFS);
  return (USBD_OK);
}
```

**Key Points**:
- No mutex acquisition (would block)
- Fast copy to circular buffer
- Signal semaphore to wake up task
- Return immediately

### 2. Protocol Parser Task (`StartProtocolParser`)

**Location**: `apps/firmware/Core/Src/freertos.c`

```c
void StartProtocolParser(void *argument)
{
  extern void USB_ProcessReceivedData(void);
  
  for(;;)
  {
    // Block until ISR signals data availability
    if (osSemaphoreAcquire(UsbDataAvailableHandle, osWaitForever) == osOK)
    {
      // Process in task context (can use mutex, blocking calls)
      USB_ProcessReceivedData();
    }
  }
}
```

**Key Points**:
- Runs in task context (not ISR)
- Can safely use mutexes and blocking operations
- Waits indefinitely for signal from ISR
- Calls processing function when data is available

### 3. Data Processing Function (`USB_ProcessReceivedData`)

**Location**: `apps/firmware/USB_DEVICE/App/usbd_cdc_if.c`

```c
void USB_ProcessReceivedData(void)
{
  static uint8_t temp_buffer[PROTOCOL_MAX_MESSAGE_SIZE];
  openarm_v1_Message msg;
  
  // Now safe to acquire mutex (we're in task context)
  if (osMutexAcquire(RxBufferMutexHandle, 10) != osOK) {
    return;
  }
  
  // Read from circular buffer
  uint16_t available = USB_GetAvailableBytes();
  if (available > 0) {
    uint16_t to_read = (available > PROTOCOL_MAX_MESSAGE_SIZE) 
                       ? PROTOCOL_MAX_MESSAGE_SIZE : available;
    uint16_t bytes_read = USB_ReadBuffer(temp_buffer, to_read);
    
    // Try to decode protobuf message
    if (Protocol_DecodeMessage(temp_buffer, bytes_read, &msg)) {
      if (msg.which_payload == openarm_v1_Message_set_joint_angles_tag) {
        // Create and send command
        RobotCommand_t cmd;
        cmd.seq = msg.seq;
        cmd.timestamp_ms = msg.timestamp_ms;
        cmd.angles.base_rad = msg.payload.set_joint_angles.base_rad;
        cmd.angles.shoulder_rad = msg.payload.set_joint_angles.shoulder_rad;
        cmd.angles.elbow_rad = msg.payload.set_joint_angles.elbow_rad;
        
        Protocol_ClampAngles(&cmd.angles);
        osMessageQueuePut(CommandQueueHandle, &cmd, 0, 0);
      }
    }
  }
  
  osMutexRelease(RxBufferMutexHandle);
}
```

**Key Points**:
- Runs in task context
- Can safely acquire mutex
- Decodes protobuf messages
- Validates and sends commands to servo control task

## Circular Buffer Thread Safety

The circular buffer is designed to be **lock-free** for single-producer, single-consumer scenarios:

- **Producer (ISR)**: Only writes to `rx_write_idx`
- **Consumer (Task)**: Only reads from `rx_read_idx`

This eliminates the need for a mutex during the ISR write operation, making it fast and non-blocking.

The mutex (`RxBufferMutexHandle`) is only used in the task context to protect the read operation.

## FreeRTOS Configuration

### Semaphore: `UsbDataAvailable`

- **Type**: Binary Semaphore
- **Initial Count**: 0 (no data available at startup)
- **Purpose**: Signal from ISR to task

Configured in STM32CubeMX:
1. Middleware → FREERTOS → Timers and Semaphores
2. Add Binary Semaphore named `UsbDataAvailable`

### Task: `TProtocolParser`

- **Priority**: Normal
- **Stack Size**: 256 words (1024 bytes)
- **Entry Function**: `StartProtocolParser`

Configured in STM32CubeMX:
1. Middleware → FREERTOS → Tasks and Queues
2. Add Task named `TProtocolParser`

## Benefits of This Architecture

1. **ISR Efficiency**: ISR does minimal work and returns quickly
2. **No Blocking in ISR**: All blocking operations happen in task context
3. **Proper Priority Management**: RTOS scheduler manages task priorities
4. **Scalability**: Easy to add more processing or filtering in the task
5. **Debugging**: Easier to debug task code than ISR code
6. **Thread Safety**: Lock-free circular buffer for ISR writes

## Troubleshooting

### Semaphore Never Acquired

**Symptom**: Task never wakes up, no data processing
**Cause**: ISR not signaling semaphore
**Solution**: 
- Verify `osSemaphoreRelease(UsbDataAvailableHandle)` is called in ISR
- Check that semaphore was created successfully
- Use debugger to verify ISR is being called

### Mutex Deadlock

**Symptom**: Task hangs when acquiring mutex
**Cause**: Mutex held by another task or not released
**Solution**:
- Use timeout on `osMutexAcquire()` (e.g., 10ms)
- Ensure all code paths release the mutex
- Check for exceptions/errors that skip mutex release

### Buffer Overflow

**Symptom**: Lost messages, corrupted data
**Cause**: Task not processing fast enough
**Solution**:
- Increase `PROTOCOL_BUFFER_SIZE`
- Optimize processing function
- Increase task priority
- Check for blocking operations in processing

## References

- [FreeRTOS ISR Best Practices](https://www.freertos.org/RTOS-interrupt-service-routine.html)
- [Deferred Interrupt Processing](https://www.freertos.org/deferred_interrupt_processing.html)
- [FreeRTOS Semaphores](https://www.freertos.org/a00113.html)

---

**Last Updated**: November 5, 2025
**Firmware Version**: 1.0.0

