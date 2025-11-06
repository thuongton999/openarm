# Firmware Changelog

## Version 1.1.0 - ISR-to-Task Architecture Fix (November 5, 2025)

### Fixed
- **Critical**: Fixed mutex deadlock in USB CDC receive callback
  - Issue: `RxBufferMutexHandle` was never acquired because `osMutexAcquire()` cannot be called from ISR context
  - Solution: Implemented deferred interrupt processing pattern using semaphore

### Changed
- **USB CDC ISR (`CDC_Receive_FS`)**:
  - Removed blocking mutex acquisition
  - Now only copies data to circular buffer and signals semaphore
  - Fast, non-blocking operation suitable for ISR context

- **TProtocolParser Task**:
  - Restored and implemented properly
  - Waits on `UsbDataAvailable` semaphore
  - Processes protobuf messages in task context where blocking is allowed
  - Can safely use mutexes and other blocking operations

- **USB_ProcessReceivedData Function**:
  - Changed from `static` to public (exported in header)
  - Now called from task context instead of ISR
  - Can safely acquire mutex for buffer access

### Added
- **UsbDataAvailable Semaphore**:
  - Binary semaphore for ISR-to-task signaling
  - Configured in STM32CubeMX
  - Enables proper deferred interrupt processing

- **Documentation**:
  - `ISR_TASK_ARCHITECTURE.md`: Comprehensive explanation of the ISR-to-task pattern
  - Updated `README.md` with corrected data flow diagram
  - Added troubleshooting section for common issues

### Technical Details

**Before (Broken)**:
```
USB ISR → Acquire Mutex (BLOCKED!) → Process Data
```

**After (Working)**:
```
USB ISR → Copy to Buffer → Signal Semaphore → Return
                                ↓
                          Task Wakes Up
                                ↓
                      Acquire Mutex → Process Data
```

### Files Modified
- `apps/firmware/Core/Src/freertos.c`
  - Implemented `StartProtocolParser` task logic
  
- `apps/firmware/USB_DEVICE/App/usbd_cdc_if.c`
  - Modified `CDC_Receive_FS` to use semaphore instead of mutex
  - Made `USB_ProcessReceivedData` public
  
- `apps/firmware/USB_DEVICE/App/usbd_cdc_if.h`
  - Added declaration for `USB_ProcessReceivedData`

### Files Added
- `apps/firmware/ISR_TASK_ARCHITECTURE.md`
- `apps/firmware/CHANGELOG.md`

### STM32CubeMX Configuration
Added in `.ioc` file:
- Task: `TProtocolParser` (Normal priority, 256 words stack)
- Semaphore: `UsbDataAvailable` (Binary, initial count 0)

### Testing Notes
- Verify semaphore is created successfully at startup
- Check that `TProtocolParser` task is running
- Monitor that protobuf messages are decoded correctly
- Confirm servos respond to commands from web interface

### Migration Guide
If updating from version 1.0.0:
1. Open `firmware.ioc` in STM32CubeMX
2. Add `TProtocolParser` task (see `ISR_TASK_ARCHITECTURE.md`)
3. Add `UsbDataAvailable` binary semaphore
4. Regenerate code
5. Apply the code changes from this version
6. Rebuild and flash

---

## Version 1.0.0 - Initial Release (November 3, 2025)

### Added
- PCA9685 PWM driver for servo control
- Protocol Buffers (nanopb) integration
- USB CDC communication
- FreeRTOS task management
- Safety monitoring with timeout detection
- Angle validation and clamping
- Complete firmware implementation

### Features
- 3DOF robot arm control
- WebUSB/CDC communication
- I2C servo driver (PCA9685)
- Real-time operating system (FreeRTOS)
- Protocol Buffers messaging
- Safety features

### Known Issues
- Mutex deadlock in USB ISR (fixed in v1.1.0)

