/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file           : protocol.c
  * @brief          : Protocol handling implementation
  ******************************************************************************
  */
/* USER CODE END Header */

/* Includes ------------------------------------------------------------------*/
#include "protocol.h"
#include <string.h>

/* Private functions ---------------------------------------------------------*/

/**
 * @brief Clamp a float value between min and max
 */
static inline float clamp_float(float value, float min, float max)
{
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

/* Public functions ----------------------------------------------------------*/

/**
 * @brief Decode a protobuf message from buffer
 */
bool Protocol_DecodeMessage(const uint8_t *buffer, size_t length, openarm_v1_Message *msg)
{
    if (buffer == NULL || msg == NULL || length == 0) {
        return false;
    }
    
    // Initialize message structure
    openarm_v1_Message init_msg = openarm_v1_Message_init_zero;
    *msg = init_msg;
    
    // Create input stream
    pb_istream_t stream = pb_istream_from_buffer(buffer, length);
    
    // Decode message
    bool status = pb_decode(&stream, openarm_v1_Message_fields, msg);
    
    return status;
}

/**
 * @brief Encode a protobuf message to buffer
 */
bool Protocol_EncodeMessage(const openarm_v1_Message *msg, uint8_t *buffer, size_t buffer_size, size_t *bytes_written)
{
    if (msg == NULL || buffer == NULL || buffer_size == 0) {
        return false;
    }
    
    // Create output stream
    pb_ostream_t stream = pb_ostream_from_buffer(buffer, buffer_size);
    
    // Encode message
    bool status = pb_encode(&stream, openarm_v1_Message_fields, msg);
    
    if (status && bytes_written != NULL) {
        *bytes_written = stream.bytes_written;
    }
    
    return status;
}

/**
 * @brief Validate joint angles are within safe limits
 */
bool Protocol_ValidateAngles(const JointAngles_t *angles)
{
    if (angles == NULL) {
        return false;
    }
    
    // Check base angle
    if (angles->base_rad < BASE_MIN_RAD || angles->base_rad > BASE_MAX_RAD) {
        return false;
    }
    
    // Check shoulder angle
    if (angles->shoulder_rad < SHOULDER_MIN_RAD || angles->shoulder_rad > SHOULDER_MAX_RAD) {
        return false;
    }
    
    // Check elbow angle
    if (angles->elbow_rad < ELBOW_MIN_RAD || angles->elbow_rad > ELBOW_MAX_RAD) {
        return false;
    }
    
    return true;
}

/**
 * @brief Clamp joint angles to safe limits
 */
void Protocol_ClampAngles(JointAngles_t *angles)
{
    if (angles == NULL) {
        return;
    }
    
    angles->base_rad = clamp_float(angles->base_rad, BASE_MIN_RAD, BASE_MAX_RAD);
    angles->shoulder_rad = clamp_float(angles->shoulder_rad, SHOULDER_MIN_RAD, SHOULDER_MAX_RAD);
    angles->elbow_rad = clamp_float(angles->elbow_rad, ELBOW_MIN_RAD, ELBOW_MAX_RAD);
}

/**
 * @brief Create an ACK message
 */
void Protocol_CreateAck(openarm_v1_Message *ack_msg, uint32_t seq, openarm_v1_Status status, const char *message)
{
    if (ack_msg == NULL) {
        return;
    }
    
    // Initialize message
    openarm_v1_Message init_msg = openarm_v1_Message_init_zero;
    *ack_msg = init_msg;
    
    // Set message type to ACK
    ack_msg->which_payload = openarm_v1_Message_ack_tag;
    
    // Set sequence number
    ack_msg->seq = seq;
    ack_msg->timestamp_ms = HAL_GetTick();
    
    // Set ACK payload
    ack_msg->payload.ack.seq_ack = seq;
    ack_msg->payload.ack.status = status;
    
    // Set message string if provided
    if (message != NULL) {
        // Note: For callback fields, we would need to set up the callback
        // For now, we'll leave it as is since it's optional
    }
}

/**
 * @brief Decode a varint from a buffer.
 * Reads bytes sequentially until the MSB is 0.
 */
uint8_t Protocol_DecodeVarint(const uint8_t *buffer, size_t max_len, uint32_t *value)
{
    *value = 0;
    uint8_t offset = 0;
    uint8_t byte;
    int shift = 0;

    do {
        if (offset >= max_len || offset >= 5) { // Max 5 bytes for a 32-bit varint
            *value = 0;
            return 0; // Failure: buffer exhausted or varint too long
        }
        
        byte = buffer[offset++];
        *value |= (uint32_t)(byte & 0x7F) << shift;
        shift += 7;

    } while (byte & 0x80);

    return offset;
}
