/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file           : protocol.h
  * @brief          : Protocol handling for robot arm commands
  ******************************************************************************
  * @attention
  *
  * This file provides helper functions and definitions for handling
  * Protocol Buffer messages for the robot arm control system.
  *
  ******************************************************************************
  */
/* USER CODE END Header */

#ifndef __PROTOCOL_H
#define __PROTOCOL_H

#ifdef __cplusplus
extern "C" {
#endif

/* Includes ------------------------------------------------------------------*/
#include "stm32f1xx_hal.h"
#include <stdint.h>
#include <stdbool.h>

// Protocol Buffers includes
#include "openarm/v1/messages.pb.h"
#include "pb_decode.h"
#include "pb_encode.h"

/* Exported types ------------------------------------------------------------*/

/**
 * @brief Joint angles structure (in radians)
 */
typedef struct {
    float base_rad;
    float shoulder_rad;
    float elbow_rad;
} JointAngles_t;

/**
 * @brief Command structure for inter-task communication
 */
typedef struct {
    uint32_t seq;
    JointAngles_t angles;
    uint32_t timestamp_ms;
} RobotCommand_t;

/* Exported constants --------------------------------------------------------*/
#define PROTOCOL_MAX_MESSAGE_SIZE   256  /**< Maximum message size in bytes */
#define PROTOCOL_BUFFER_SIZE        512  /**< Receive buffer size */

/* Joint angle limits (in radians) -------------------------------------------*/
#define BASE_MIN_RAD        (-3.14159f)  /**< Base minimum angle (approx -180°) */
#define BASE_MAX_RAD        (3.14159f)   /**< Base maximum angle (approx +180°) */
#define SHOULDER_MIN_RAD    (0.0f)       /**< Shoulder minimum angle (0°) */
#define SHOULDER_MAX_RAD    (3.14159f)   /**< Shoulder maximum angle (approx 180°) */
#define ELBOW_MIN_RAD       (0.0f)       /**< Elbow minimum angle (0°) */
#define ELBOW_MAX_RAD       (3.14159f)   /**< Elbow maximum angle (approx 180°) */

/* Exported functions prototypes ---------------------------------------------*/

/**
 * @brief Decode a protobuf message from buffer
 * @param buffer: Pointer to buffer containing encoded message
 * @param length: Length of the buffer
 * @param msg: Pointer to message structure to decode into
 * @retval true if successful, false otherwise
 */
bool Protocol_DecodeMessage(const uint8_t *buffer, size_t length, openarm_v1_Message *msg);

/**
 * @brief Encode a protobuf message to buffer
 * @param msg: Pointer to message structure to encode
 * @param buffer: Pointer to buffer to store encoded message
 * @param buffer_size: Size of the buffer
 * @param bytes_written: Pointer to store number of bytes written
 * @retval true if successful, false otherwise
 */
bool Protocol_EncodeMessage(const openarm_v1_Message *msg, uint8_t *buffer, size_t buffer_size, size_t *bytes_written);

/**
 * @brief Validate joint angles are within safe limits
 * @param angles: Pointer to joint angles structure
 * @retval true if angles are valid, false otherwise
 */
bool Protocol_ValidateAngles(const JointAngles_t *angles);

/**
 * @brief Clamp joint angles to safe limits
 * @param angles: Pointer to joint angles structure (modified in place)
 */
void Protocol_ClampAngles(JointAngles_t *angles);

/**
 * @brief Create an ACK message
 * @param ack_msg: Pointer to message structure to fill
 * @param seq: Sequence number to acknowledge
 * @param status: Status code
 * @param message: Optional status message (can be NULL)
 */
void Protocol_CreateAck(openarm_v1_Message *ack_msg, uint32_t seq, openarm_v1_Status status, const char *message);

/**
 * @brief Decode a varint (variable-length integer) from a buffer.
 * @param buffer Pointer to the buffer containing the varint.
 * @param max_len The maximum number of bytes to read from the buffer.
 * @param value Pointer to store the decoded integer value.
 * @return The number of bytes consumed (offset), or 0 on failure.
 */
uint8_t Protocol_DecodeVarint(const uint8_t *buffer, size_t max_len, uint32_t *value);

#ifdef __cplusplus
}
#endif

#endif /* __PROTOCOL_H */

