/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * File Name          : freertos.c
  * Description        : Code for freertos applications
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
#include "FreeRTOS.h"
#include "task.h"
#include "main.h"
#include "cmsis_os.h"

/* Private includes ----------------------------------------------------------*/
/* USER CODE BEGIN Includes */
#include "protocol.h"
#include "pca9685.h"
/* USER CODE END Includes */

/* Private typedef -----------------------------------------------------------*/
/* USER CODE BEGIN PTD */

/* USER CODE END PTD */

/* Private define ------------------------------------------------------------*/
/* USER CODE BEGIN PD */

/* USER CODE END PD */

/* Private macro -------------------------------------------------------------*/
/* USER CODE BEGIN PM */

/* USER CODE END PM */

/* Private variables ---------------------------------------------------------*/
/* USER CODE BEGIN Variables */

/* USER CODE END Variables */
/* Definitions for defaultTask */
osThreadId_t defaultTaskHandle;
const osThreadAttr_t defaultTask_attributes = {
  .name = "defaultTask",
  .stack_size = 128 * 4,
  .priority = (osPriority_t) osPriorityNormal,
};
/* Definitions for TServoControl */
osThreadId_t TServoControlHandle;
const osThreadAttr_t TServoControl_attributes = {
  .name = "TServoControl",
  .stack_size = 256 * 4,
  .priority = (osPriority_t) osPriorityHigh,
};
/* Definitions for TSafetyMonitor */
osThreadId_t TSafetyMonitorHandle;
const osThreadAttr_t TSafetyMonitor_attributes = {
  .name = "TSafetyMonitor",
  .stack_size = 128 * 4,
  .priority = (osPriority_t) osPriorityRealtime,
};
/* Definitions for TProtocolParser */
osThreadId_t TProtocolParserHandle;
const osThreadAttr_t TProtocolParser_attributes = {
  .name = "TProtocolParser",
  .stack_size = 256 * 4,
  .priority = (osPriority_t) osPriorityNormal,
};
/* Definitions for CommandQueue */
osMessageQueueId_t CommandQueueHandle;
const osMessageQueueAttr_t CommandQueue_attributes = {
  .name = "CommandQueue"
};
/* Definitions for ServoMutex */
osMutexId_t ServoMutexHandle;
const osMutexAttr_t ServoMutex_attributes = {
  .name = "ServoMutex"
};
/* Definitions for RxBufferMutex */
osMutexId_t RxBufferMutexHandle;
const osMutexAttr_t RxBufferMutex_attributes = {
  .name = "RxBufferMutex"
};
/* Definitions for UsbDataAvailable */
osSemaphoreId_t UsbDataAvailableHandle;
const osSemaphoreAttr_t UsbDataAvailable_attributes = {
  .name = "UsbDataAvailable"
};

/* Private function prototypes -----------------------------------------------*/
/* USER CODE BEGIN FunctionPrototypes */

/* USER CODE END FunctionPrototypes */

void StartDefaultTask(void *argument);
void StartServoControl(void *argument);
void StartSafetyMonitor(void *argument);
void StartProtocolParser(void *argument);

extern void MX_USB_DEVICE_Init(void);
void MX_FREERTOS_Init(void); /* (MISRA C 2004 rule 8.1) */

/* Hook prototypes */
void vApplicationStackOverflowHook(xTaskHandle xTask, signed char *pcTaskName);
void vApplicationMallocFailedHook(void);

/* USER CODE BEGIN 4 */
void vApplicationStackOverflowHook(xTaskHandle xTask, signed char *pcTaskName)
{
   /* Run time stack overflow checking is performed if
   configCHECK_FOR_STACK_OVERFLOW is defined to 1 or 2. This hook function is
   called if a stack overflow is detected. */
}
/* USER CODE END 4 */

/* USER CODE BEGIN 5 */
void vApplicationMallocFailedHook(void)
{
   /* vApplicationMallocFailedHook() will only be called if
   configUSE_MALLOC_FAILED_HOOK is set to 1 in FreeRTOSConfig.h. It is a hook
   function that will get called if a call to pvPortMalloc() fails.
   pvPortMalloc() is called internally by the kernel whenever a task, queue,
   timer or semaphore is created. It is also called by various parts of the
   demo application. If heap_1.c or heap_2.c are used, then the size of the
   heap available to pvPortMalloc() is defined by configTOTAL_HEAP_SIZE in
   FreeRTOSConfig.h, and the xPortGetFreeHeapSize() API function can be used
   to query the size of free heap space that remains (although it does not
   provide information on how the remaining heap might be fragmented). */
}
/* USER CODE END 5 */

/**
  * @brief  FreeRTOS initialization
  * @param  None
  * @retval None
  */
void MX_FREERTOS_Init(void) {
  /* USER CODE BEGIN Init */

  /* USER CODE END Init */
  /* Create the mutex(es) */
  /* creation of ServoMutex */
  ServoMutexHandle = osMutexNew(&ServoMutex_attributes);

  /* creation of RxBufferMutex */
  RxBufferMutexHandle = osMutexNew(&RxBufferMutex_attributes);

  /* USER CODE BEGIN RTOS_MUTEX */
  /* add mutexes, ... */
  /* USER CODE END RTOS_MUTEX */

  /* Create the semaphores(s) */
  /* creation of UsbDataAvailable */
  UsbDataAvailableHandle = osSemaphoreNew(1, 0, &UsbDataAvailable_attributes);

  /* USER CODE BEGIN RTOS_SEMAPHORES */
  /* add semaphores, ... */
  /* USER CODE END RTOS_SEMAPHORES */

  /* USER CODE BEGIN RTOS_TIMERS */
  /* start timers, add new ones, ... */
  /* USER CODE END RTOS_TIMERS */

  /* Create the queue(s) */
  /* creation of CommandQueue */
  CommandQueueHandle = osMessageQueueNew (8, sizeof(RobotCommand_t), &CommandQueue_attributes);

  /* USER CODE BEGIN RTOS_QUEUES */
  /* add queues, ... */
  /* USER CODE END RTOS_QUEUES */

  /* Create the thread(s) */
  /* creation of defaultTask */
  defaultTaskHandle = osThreadNew(StartDefaultTask, NULL, &defaultTask_attributes);

  /* creation of TServoControl */
  TServoControlHandle = osThreadNew(StartServoControl, NULL, &TServoControl_attributes);

  /* creation of TSafetyMonitor */
  TSafetyMonitorHandle = osThreadNew(StartSafetyMonitor, NULL, &TSafetyMonitor_attributes);

  /* creation of TProtocolParser */
  TProtocolParserHandle = osThreadNew(StartProtocolParser, NULL, &TProtocolParser_attributes);

  /* USER CODE BEGIN RTOS_THREADS */
  /* add threads, ... */
  /* USER CODE END RTOS_THREADS */

  /* USER CODE BEGIN RTOS_EVENTS */
  /* add events, ... */
  /* USER CODE END RTOS_EVENTS */

}

/* USER CODE BEGIN Header_StartDefaultTask */
/**
  * @brief  Function implementing the defaultTask thread.
  * @param  argument: Not used
  * @retval None
  */
/* USER CODE END Header_StartDefaultTask */
void StartDefaultTask(void *argument)
{
  /* init code for USB_DEVICE */
  MX_USB_DEVICE_Init();
  /* USER CODE BEGIN StartDefaultTask */
  /* Infinite loop */
  for(;;)
  {
    osDelay(1);
  }
  /* USER CODE END StartDefaultTask */
}

/* USER CODE BEGIN Header_StartServoControl */
/**
* @brief Function implementing the TServoControl thread.
* @param argument: Not used
* @retval None
*/
/* USER CODE END Header_StartServoControl */
void StartServoControl(void *argument)
{
  /* USER CODE BEGIN StartServoControl */
  extern I2C_HandleTypeDef hi2c1;
  extern PCA9685_HandleTypeDef hpca9685;

  // Initialize PCA9685 PWM driver
  if (PCA9685_Init(&hpca9685, &hi2c1, PCA9685_I2C_ADDRESS) != HAL_OK) {
    Error_Handler();
  }

  // Set all servos to center position initially
  PCA9685_SetServoAngle(&hpca9685, SERVO_CHANNEL_BASE, 90.0f);
  PCA9685_SetServoAngle(&hpca9685, SERVO_CHANNEL_SHOULDER, 90.0f);
  PCA9685_SetServoAngle(&hpca9685, SERVO_CHANNEL_ELBOW, 90.0f);
  osDelay(500);

  /* Infinite loop */
  for(;;)
  {
    RobotCommand_t cmd;
    osStatus_t status = osMessageQueueGet(CommandQueueHandle, &cmd, NULL, 100);

    if (status == osOK) {
      if (osMutexAcquire(ServoMutexHandle, 50) == osOK) {
        // Set servo angles using defined channels
        PCA9685_SetServoAngleRad(&hpca9685, SERVO_CHANNEL_BASE, cmd.angles.base_rad);
        PCA9685_SetServoAngleRad(&hpca9685, SERVO_CHANNEL_SHOULDER, cmd.angles.shoulder_rad);
        PCA9685_SetServoAngleRad(&hpca9685, SERVO_CHANNEL_ELBOW, cmd.angles.elbow_rad);
        osMutexRelease(ServoMutexHandle);
      }
    }
    osDelay(10);
  }
  /* USER CODE END StartServoControl */
}

/* USER CODE BEGIN Header_StartSafetyMonitor */
/**
* @brief Function implementing the TSafetyMonitor thread.
* @param argument: Not used
* @retval None
*/
/* USER CODE END Header_StartSafetyMonitor */
void StartSafetyMonitor(void *argument)
{
  /* USER CODE BEGIN StartSafetyMonitor */
  static uint32_t last_command_time = 0;
  const uint32_t TIMEOUT_MS = 2000;

  osDelay(200);
  last_command_time = HAL_GetTick();

  for(;;)
  {
    uint32_t current_time = HAL_GetTick();

    if ((current_time - last_command_time) > TIMEOUT_MS) {
      // Safety action: could turn off all servos
      // PCA9685_AllOff(&hpca9685);
    }

    if (osMessageQueueGetCount(CommandQueueHandle) > 0) {
      last_command_time = current_time;
    }

    osDelay(100);
  }
  /* USER CODE END StartSafetyMonitor */
}

/* USER CODE BEGIN Header_StartProtocolParser */
/**
* @brief Function implementing the TProtocolParser thread.
* @param argument: Not used
* @retval None
*/
/* USER CODE END Header_StartProtocolParser */
__weak void StartProtocolParser(void *argument)
{
  /* USER CODE BEGIN StartProtocolParser */

  // External reference to USB processing function
  extern void USB_ProcessReceivedData(void);

  /* Infinite loop */
  for(;;)
  {
    // Wait for signal from USB ISR that data is available
    if (osSemaphoreAcquire(UsbDataAvailableHandle, osWaitForever) == osOK)
    {
      // Process the received data in task context (not ISR)
      USB_ProcessReceivedData();
    }
  }
  /* USER CODE END StartProtocolParser */
}

/* Private application code --------------------------------------------------*/
/* USER CODE BEGIN Application */

/* USER CODE END Application */

