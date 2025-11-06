/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file           : usbd_cdc_if.c
  * @version        : v2.0_Cube
  * @brief          : Usb device for Virtual Com Port.
  ******************************************************************************
  * @attention
  *
  * Copyright (c) 2025 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */
/* USER CODE END Header */

/* Includes ------------------------------------------------------------------*/
#include "usbd_cdc_if.h"

/* USER CODE BEGIN INCLUDE */
#include "protocol.h"
#include "cmsis_os.h"
/* USER CODE END INCLUDE */

/* Private typedef -----------------------------------------------------------*/
/* Private define ------------------------------------------------------------*/
/* Private macro -------------------------------------------------------------*/

/* USER CODE BEGIN PV */
/* Private variables ---------------------------------------------------------*/

/* USER CODE END PV */

/** @addtogroup STM32_USB_OTG_DEVICE_LIBRARY
  * @brief Usb device library.
  * @{
  */

/** @addtogroup USBD_CDC_IF
  * @{
  */

/** @defgroup USBD_CDC_IF_Private_TypesDefinitions USBD_CDC_IF_Private_TypesDefinitions
  * @brief Private types.
  * @{
  */

/* USER CODE BEGIN PRIVATE_TYPES */

/* USER CODE END PRIVATE_TYPES */

/**
  * @}
  */

/** @defgroup USBD_CDC_IF_Private_Defines USBD_CDC_IF_Private_Defines
  * @brief Private defines.
  * @{
  */

/* USER CODE BEGIN PRIVATE_DEFINES */
/* USER CODE END PRIVATE_DEFINES */

/**
  * @}
  */

/** @defgroup USBD_CDC_IF_Private_Macros USBD_CDC_IF_Private_Macros
  * @brief Private macros.
  * @{
  */

/* USER CODE BEGIN PRIVATE_MACRO */

/* USER CODE END PRIVATE_MACRO */

/**
  * @}
  */

/** @defgroup USBD_CDC_IF_Private_Variables USBD_CDC_IF_Private_Variables
  * @brief Private variables.
  * @{
  */
/* Create buffer for reception and transmission           */
/* It's up to user to redefine and/or remove those define */
/** Received data over USB are stored in this buffer      */
uint8_t UserRxBufferFS[APP_RX_DATA_SIZE];

/** Data to send over USB CDC are stored in this buffer   */
uint8_t UserTxBufferFS[APP_TX_DATA_SIZE];

/* USER CODE BEGIN PRIVATE_VARIABLES */

// Circular buffer for USB data reception
static uint8_t usb_rx_buffer[PROTOCOL_BUFFER_SIZE];
static volatile uint16_t rx_write_idx = 0;
static volatile uint16_t rx_read_idx = 0;

// External references to FreeRTOS objects
extern osMessageQueueId_t CommandQueueHandle;
extern osMutexId_t RxBufferMutexHandle;
extern osSemaphoreId_t UsbDataAvailableHandle;

/* USER CODE END PRIVATE_VARIABLES */

/**
  * @}
  */

/** @defgroup USBD_CDC_IF_Exported_Variables USBD_CDC_IF_Exported_Variables
  * @brief Public variables.
  * @{
  */

extern USBD_HandleTypeDef hUsbDeviceFS;

/* USER CODE BEGIN EXPORTED_VARIABLES */

/* USER CODE END EXPORTED_VARIABLES */

/**
  * @}
  */

/** @defgroup USBD_CDC_IF_Private_FunctionPrototypes USBD_CDC_IF_Private_FunctionPrototypes
  * @brief Private functions declaration.
  * @{
  */

static int8_t CDC_Init_FS(void);
static int8_t CDC_DeInit_FS(void);
static int8_t CDC_Control_FS(uint8_t cmd, uint8_t* pbuf, uint16_t length);
static int8_t CDC_Receive_FS(uint8_t* pbuf, uint32_t *Len);

/* USER CODE BEGIN PRIVATE_FUNCTIONS_DECLARATION */

/**
 * @brief Get number of bytes available in circular buffer
 */
static uint16_t USB_GetAvailableBytes(void);

/**
 * @brief Read bytes from circular buffer
 */
static uint16_t USB_ReadBuffer(uint8_t *dest, uint16_t max_len);
/* USER CODE END PRIVATE_FUNCTIONS_DECLARATION */

/**
  * @}
  */

USBD_CDC_ItfTypeDef USBD_Interface_fops_FS =
{
  CDC_Init_FS,
  CDC_DeInit_FS,
  CDC_Control_FS,
  CDC_Receive_FS
};

/* Private functions ---------------------------------------------------------*/
/**
  * @brief  Initializes the CDC media low layer over the FS USB IP
  * @retval USBD_OK if all operations are OK else USBD_FAIL
  */
static int8_t CDC_Init_FS(void)
{
  /* USER CODE BEGIN 3 */
  /* Set Application Buffers */
  USBD_CDC_SetTxBuffer(&hUsbDeviceFS, UserTxBufferFS, 0);
  USBD_CDC_SetRxBuffer(&hUsbDeviceFS, UserRxBufferFS);
  return (USBD_OK);
  /* USER CODE END 3 */
}

/**
  * @brief  DeInitializes the CDC media low layer
  * @retval USBD_OK if all operations are OK else USBD_FAIL
  */
static int8_t CDC_DeInit_FS(void)
{
  /* USER CODE BEGIN 4 */
  return (USBD_OK);
  /* USER CODE END 4 */
}

/**
  * @brief  Manage the CDC class requests
  * @param  cmd: Command code
  * @param  pbuf: Buffer containing command data (request parameters)
  * @param  length: Number of data to be sent (in bytes)
  * @retval Result of the operation: USBD_OK if all operations are OK else USBD_FAIL
  */
static int8_t CDC_Control_FS(uint8_t cmd, uint8_t* pbuf, uint16_t length)
{
  /* USER CODE BEGIN 5 */
  switch(cmd)
  {
    case CDC_SEND_ENCAPSULATED_COMMAND:

    break;

    case CDC_GET_ENCAPSULATED_RESPONSE:

    break;

    case CDC_SET_COMM_FEATURE:

    break;

    case CDC_GET_COMM_FEATURE:

    break;

    case CDC_CLEAR_COMM_FEATURE:

    break;

  /*******************************************************************************/
  /* Line Coding Structure                                                       */
  /*-----------------------------------------------------------------------------*/
  /* Offset | Field       | Size | Value  | Description                          */
  /* 0      | dwDTERate   |   4  | Number |Data terminal rate, in bits per second*/
  /* 4      | bCharFormat |   1  | Number | Stop bits                            */
  /*                                        0 - 1 Stop bit                       */
  /*                                        1 - 1.5 Stop bits                    */
  /*                                        2 - 2 Stop bits                      */
  /* 5      | bParityType |  1   | Number | Parity                               */
  /*                                        0 - None                             */
  /*                                        1 - Odd                              */
  /*                                        2 - Even                             */
  /*                                        3 - Mark                             */
  /*                                        4 - Space                            */
  /* 6      | bDataBits  |   1   | Number Data bits (5, 6, 7, 8 or 16).          */
  /*******************************************************************************/
    case CDC_SET_LINE_CODING:

    break;

    case CDC_GET_LINE_CODING:

    break;

    case CDC_SET_CONTROL_LINE_STATE:

    break;

    case CDC_SEND_BREAK:

    break;

  default:
    break;
  }

  return (USBD_OK);
  /* USER CODE END 5 */
}

/**
  * @brief  Data received over USB OUT endpoint are sent over CDC interface
  *         through this function.
  *
  *         @note
  *         This function will issue a NAK packet on any OUT packet received on
  *         USB endpoint until exiting this function. If you exit this function
  *         before transfer is complete on CDC interface (ie. using DMA controller)
  *         it will result in receiving more data while previous ones are still
  *         not sent.
  *
  * @param  Buf: Buffer of data to be received
  * @param  Len: Number of data received (in bytes)
  * @retval Result of the operation: USBD_OK if all operations are OK else USBD_FAIL
  */
static int8_t CDC_Receive_FS(uint8_t* Buf, uint32_t *Len)
{
  /* USER CODE BEGIN 6 */
  
  // Copy received data to circular buffer (no mutex needed in ISR)
  // This is safe because only the ISR writes and only the task reads
  for (uint32_t i = 0; i < *Len; i++) {
    usb_rx_buffer[rx_write_idx] = Buf[i];
    rx_write_idx = (rx_write_idx + 1) % PROTOCOL_BUFFER_SIZE;
    
    // Check for buffer overflow
    if (rx_write_idx == rx_read_idx) {
      // Buffer full, drop oldest data
      rx_read_idx = (rx_read_idx + 1) % PROTOCOL_BUFFER_SIZE;
    }
  }
  
  // Signal the protocol parser task that data is available
  // This is safe to call from an ISR
  osSemaphoreRelease(UsbDataAvailableHandle);
  
  USBD_CDC_SetRxBuffer(&hUsbDeviceFS, &Buf[0]);
  USBD_CDC_ReceivePacket(&hUsbDeviceFS);
  return (USBD_OK);
  /* USER CODE END 6 */
}

/**
  * @brief  CDC_Transmit_FS
  *         Data to send over USB IN endpoint are sent over CDC interface
  *         through this function.
  *         @note
  *
  *
  * @param  Buf: Buffer of data to be sent
  * @param  Len: Number of data to be sent (in bytes)
  * @retval USBD_OK if all operations are OK else USBD_FAIL or USBD_BUSY
  */
uint8_t CDC_Transmit_FS(uint8_t* Buf, uint16_t Len)
{
  uint8_t result = USBD_OK;
  /* USER CODE BEGIN 7 */
  USBD_CDC_HandleTypeDef *hcdc = (USBD_CDC_HandleTypeDef*)hUsbDeviceFS.pClassData;
  if (hcdc->TxState != 0){
    return USBD_BUSY;
  }
  USBD_CDC_SetTxBuffer(&hUsbDeviceFS, Buf, Len);
  result = USBD_CDC_TransmitPacket(&hUsbDeviceFS);
  /* USER CODE END 7 */
  return result;
}

/* USER CODE BEGIN PRIVATE_FUNCTIONS_IMPLEMENTATION */

/**
 * @brief Get number of bytes available in circular buffer
 */
static uint16_t USB_GetAvailableBytes(void)
{
    uint16_t write = rx_write_idx;
    uint16_t read = rx_read_idx;
    
    if (write >= read) {
        return write - read;
    } else {
        return PROTOCOL_BUFFER_SIZE - read + write;
    }
}

/**
 * @brief Read bytes from circular buffer
 */
static uint16_t USB_ReadBuffer(uint8_t *dest, uint16_t max_len)
{
    uint16_t bytes_read = 0;
    
    while (bytes_read < max_len && rx_read_idx != rx_write_idx) {
        dest[bytes_read++] = usb_rx_buffer[rx_read_idx];
        rx_read_idx = (rx_read_idx + 1) % PROTOCOL_BUFFER_SIZE;
    }
    
    return bytes_read;
}

/**
 * @brief Process received data and extract messages
 * 
 * This function looks for complete protobuf messages in the receive buffer.
 * Protocol Buffers uses varint encoding, so we need to try decoding and
 * check if we have a complete message.
 * 
 * NOTE: This function is called from the TProtocolParser task, not from ISR.
 */
void USB_ProcessReceivedData(void)
{
    static uint8_t temp_buffer[PROTOCOL_MAX_MESSAGE_SIZE];
    openarm_v1_Message msg;
    
    if (osMutexAcquire(RxBufferMutexHandle, 10) != osOK) {
        return;
    }
    
    // Check if we have enough data to try decoding
    uint16_t available = USB_GetAvailableBytes();
    
    if (available > 0) {
        // Read available data (up to max message size)
        uint16_t to_read = (available > PROTOCOL_MAX_MESSAGE_SIZE) ? PROTOCOL_MAX_MESSAGE_SIZE : available;
        uint16_t bytes_read = USB_ReadBuffer(temp_buffer, to_read);
        
        // Try to decode the message
        if (Protocol_DecodeMessage(temp_buffer, bytes_read, &msg)) {
            // Successfully decoded a message
            
            // Check if it's a SetJointAngles command
            if (msg.which_payload == openarm_v1_Message_set_joint_angles_tag) {
                // Create robot command
                RobotCommand_t cmd;
                cmd.seq = msg.seq;
                cmd.timestamp_ms = msg.timestamp_ms;
                cmd.angles.base_rad = msg.payload.set_joint_angles.base_rad;
                cmd.angles.shoulder_rad = msg.payload.set_joint_angles.shoulder_rad;
                cmd.angles.elbow_rad = msg.payload.set_joint_angles.elbow_rad;
                
                // Validate and clamp angles
                Protocol_ClampAngles(&cmd.angles);
                
                // Send to command queue (non-blocking)
                osMessageQueuePut(CommandQueueHandle, &cmd, 0, 0);
            }
            // Handle other message types here (heartbeat, etc.)
        }
        // If decode fails, we might not have a complete message yet
        // The data will be processed in the next call
    }
    
    osMutexRelease(RxBufferMutexHandle);
}

/* USER CODE END PRIVATE_FUNCTIONS_IMPLEMENTATION */

/**
  * @}
  */

/**
  * @}
  */
