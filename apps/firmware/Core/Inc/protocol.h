#ifndef __PROTOCOL_H
#define __PROTOCOL_H

#include "main.h"
#include "cmsis_os.h"
#include "../../../../packages/proto-c/index.h"

// Protocol status codes
typedef enum {
    PROTOCOL_OK = 0,
    PROTOCOL_INVALID_MESSAGE = 1,
    PROTOCOL_OUT_OF_RANGE = 2,
    PROTOCOL_TIMEOUT = 3,
    PROTOCOL_I2C_ERROR = 4,
    PROTOCOL_EMERGENCY_STOP = 5
} ProtocolStatus;

// Joint angles structure
typedef struct {
    float base_rad;
    float shoulder_rad;
    float elbow_rad;
} JointAngles;

// Protocol handler functions
ProtocolStatus Protocol_Init(void);
ProtocolStatus Protocol_ProcessMessage(const openarm_v1_Message* msg, JointAngles* angles);
ProtocolStatus Protocol_SendAck(uint32_t seq_ack, ProtocolStatus status, const char* message);
ProtocolStatus Protocol_SendHeartbeat(void);

#endif /* __PROTOCOL_H */

