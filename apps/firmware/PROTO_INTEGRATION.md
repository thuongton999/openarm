# Protocol Buffers Integration for Keil MDK

This document describes how to integrate the Protocol Buffers (nanopb) library into the Keil MDK project.

## Files to Add to Keil Project

### 1. Nanopb Library Files (from `packages/proto-c/vendors/nanopb/`)
Add these files to a new group called "nanopb":
- `pb_common.c`
- `pb_common.h`
- `pb_decode.c`
- `pb_decode.h`
- `pb_encode.c`
- `pb_encode.h`
- `pb.h`

### 2. Generated Protocol Buffer Files (from `packages/proto-c/openarm/v1/`)
Add these files to a new group called "proto":
- `messages.pb.c`
- `messages.pb.h`

### 3. Index Header (from `packages/proto-c/`)
Add this file to the "proto" group:
- `index.h`

## Include Paths to Add

Add the following include paths in Keil project settings (Options for Target > C/C++ > Include Paths):

1. `../../packages/proto-c` (relative to firmware directory)
2. `../../packages/proto-c/vendors/nanopb` (relative to firmware directory)

Or using absolute paths:
1. `D:\Projects\open_arm\packages\proto-c`
2. `D:\Projects\open_arm\packages\proto-c\vendors\nanopb`

## Steps to Integrate in Keil MDK

1. **Open the project**: Open `firmware.uvprojx` in Keil MDK
2. **Create nanopb group**:
   - Right-click on "Target 1" in Project window
   - Select "Add Group"
   - Name it "nanopb"
3. **Add nanopb files**:
   - Right-click on "nanopb" group
   - Select "Add Existing Files to Group 'nanopb'"
   - Navigate to `D:\Projects\open_arm\packages\proto-c\vendors\nanopb\`
   - Select all `.c` files (pb_common.c, pb_decode.c, pb_encode.c)
   - Click "Add"
4. **Create proto group**:
   - Right-click on "Target 1" in Project window
   - Select "Add Group"
   - Name it "proto"
5. **Add proto files**:
   - Right-click on "proto" group
   - Select "Add Existing Files to Group 'proto'"
   - Navigate to `D:\Projects\open_arm\packages\proto-c\openarm\v1\`
   - Select `messages.pb.c`
   - Click "Add"
6. **Add include paths**:
   - Right-click on "Target 1"
   - Select "Options for Target 'firmware'"
   - Go to "C/C++" tab
   - In "Include Paths", add:
     - `..\..\packages\proto-c`
     - `..\..\packages\proto-c\vendors\nanopb`
   - Click "OK"

## Verification

After integration, you should be able to include the protocol buffer headers in your code:

```c
#include "openarm/v1/messages.pb.h"
#include "pb_decode.h"
#include "pb_encode.h"
```

## Usage Example

```c
// Decode a message
openarm_v1_Message msg = openarm_v1_Message_init_zero;
pb_istream_t stream = pb_istream_from_buffer(buffer, buffer_length);
bool status = pb_decode(&stream, openarm_v1_Message_fields, &msg);

if (status && msg.which_payload == openarm_v1_Message_set_joint_angles_tag) {
    // Process joint angles
    float base_rad = msg.payload.set_joint_angles.base_rad;
    float shoulder_rad = msg.payload.set_joint_angles.shoulder_rad;
    float elbow_rad = msg.payload.set_joint_angles.elbow_rad;
}
```

## Notes

- The nanopb library is a lightweight Protocol Buffers implementation designed for embedded systems
- It has minimal memory footprint and no dynamic memory allocation by default
- All message structures are statically allocated

