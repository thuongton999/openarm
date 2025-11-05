/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file           : pca9685.h
  * @brief          : Header for pca9685.c file.
  *                   PCA9685 16-channel PWM driver for servo control
  ******************************************************************************
  * @attention
  *
  * This driver is based on the Adafruit PCA9685 library, adapted for
  * STM32 HAL I2C interface.
  *
  ******************************************************************************
  */
/* USER CODE END Header */

#ifndef __PCA9685_H
#define __PCA9685_H

#ifdef __cplusplus
extern "C" {
#endif

/* Includes ------------------------------------------------------------------*/
#include "stm32f1xx_hal.h"
#include <stdint.h>
#include <stdbool.h>

/* PCA9685 Register Addresses ------------------------------------------------*/
#define PCA9685_MODE1         0x00  /**< Mode Register 1 */
#define PCA9685_MODE2         0x01  /**< Mode Register 2 */
#define PCA9685_SUBADR1       0x02  /**< I2C-bus subaddress 1 */
#define PCA9685_SUBADR2       0x03  /**< I2C-bus subaddress 2 */
#define PCA9685_SUBADR3       0x04  /**< I2C-bus subaddress 3 */
#define PCA9685_ALLCALLADR    0x05  /**< LED All Call I2C-bus address */
#define PCA9685_LED0_ON_L     0x06  /**< LED0 on tick, low byte */
#define PCA9685_LED0_ON_H     0x07  /**< LED0 on tick, high byte */
#define PCA9685_LED0_OFF_L    0x08  /**< LED0 off tick, low byte */
#define PCA9685_LED0_OFF_H    0x09  /**< LED0 off tick, high byte */
#define PCA9685_ALLLED_ON_L   0xFA  /**< load all the LEDn_ON registers, low */
#define PCA9685_ALLLED_ON_H   0xFB  /**< load all the LEDn_ON registers, high */
#define PCA9685_ALLLED_OFF_L  0xFC  /**< load all the LEDn_OFF registers, low */
#define PCA9685_ALLLED_OFF_H  0xFD  /**< load all the LEDn_OFF registers, high */
#define PCA9685_PRESCALE      0xFE  /**< Prescaler for PWM output frequency */
#define PCA9685_TESTMODE      0xFF  /**< defines the test mode to be entered */

/* MODE1 bits ----------------------------------------------------------------*/
#define MODE1_ALLCAL          0x01  /**< respond to LED All Call I2C-bus address */
#define MODE1_SUB3            0x02  /**< respond to I2C-bus subaddress 3 */
#define MODE1_SUB2            0x04  /**< respond to I2C-bus subaddress 2 */
#define MODE1_SUB1            0x08  /**< respond to I2C-bus subaddress 1 */
#define MODE1_SLEEP           0x10  /**< Low power mode. Oscillator off */
#define MODE1_AI              0x20  /**< Auto-Increment enabled */
#define MODE1_EXTCLK          0x40  /**< Use EXTCLK pin clock */
#define MODE1_RESTART         0x80  /**< Restart enabled */

/* MODE2 bits ----------------------------------------------------------------*/
#define MODE2_OUTNE_0         0x01  /**< Active LOW output enable input */
#define MODE2_OUTNE_1         0x02  /**< Active LOW output enable input - high impedance */
#define MODE2_OUTDRV          0x04  /**< totem pole structure vs open-drain */
#define MODE2_OCH             0x08  /**< Outputs change on ACK vs STOP */
#define MODE2_INVRT           0x10  /**< Output logic state inverted */

/* PCA9685 Constants ---------------------------------------------------------*/
#define PCA9685_I2C_ADDRESS   0x40  /**< Default PCA9685 I2C Slave Address (7-bit) */
#define FREQUENCY_OSCILLATOR  25000000  /**< Int. osc. frequency in datasheet */
#define PCA9685_PRESCALE_MIN  3     /**< minimum prescale value */
#define PCA9685_PRESCALE_MAX  255   /**< maximum prescale value */

/* Servo Constants (MG90S) ---------------------------------------------------*/
#define SERVO_FREQ            50    /**< Analog servos run at ~50 Hz */
#define SERVO_MIN_PULSE_US    500   /**< Minimum pulse width in microseconds */
#define SERVO_MAX_PULSE_US    2500  /**< Maximum pulse width in microseconds */
#define SERVO_CENTER_PULSE_US 1500  /**< Center pulse width in microseconds */

/* PWM Resolution ------------------------------------------------------------*/
#define PWM_RESOLUTION        4096  /**< 12-bit resolution (0-4095) */

/* Timeout -------------------------------------------------------------------*/
#define PCA9685_TIMEOUT       100   /**< I2C timeout in milliseconds */

/* Exported types ------------------------------------------------------------*/
typedef struct {
    I2C_HandleTypeDef *hi2c;        /**< I2C handle */
    uint8_t i2c_addr;                /**< I2C device address (7-bit) */
    uint32_t oscillator_freq;        /**< Oscillator frequency for calculations */
} PCA9685_HandleTypeDef;

/* Exported functions prototypes ---------------------------------------------*/

/**
 * @brief Initialize PCA9685 driver
 * @param hpca: Pointer to PCA9685 handle structure
 * @param hi2c: Pointer to I2C handle
 * @param addr: I2C address (7-bit, default 0x40)
 * @retval HAL status
 */
HAL_StatusTypeDef PCA9685_Init(PCA9685_HandleTypeDef *hpca, I2C_HandleTypeDef *hi2c, uint8_t addr);

/**
 * @brief Reset PCA9685 to default state
 * @param hpca: Pointer to PCA9685 handle structure
 * @retval HAL status
 */
HAL_StatusTypeDef PCA9685_Reset(PCA9685_HandleTypeDef *hpca);

/**
 * @brief Put PCA9685 into sleep mode
 * @param hpca: Pointer to PCA9685 handle structure
 * @retval HAL status
 */
HAL_StatusTypeDef PCA9685_Sleep(PCA9685_HandleTypeDef *hpca);

/**
 * @brief Wake up PCA9685 from sleep mode
 * @param hpca: Pointer to PCA9685 handle structure
 * @retval HAL status
 */
HAL_StatusTypeDef PCA9685_Wakeup(PCA9685_HandleTypeDef *hpca);

/**
 * @brief Set PWM frequency for all channels
 * @param hpca: Pointer to PCA9685 handle structure
 * @param freq: Desired frequency in Hz (typically 50 Hz for servos)
 * @retval HAL status
 */
HAL_StatusTypeDef PCA9685_SetPWMFreq(PCA9685_HandleTypeDef *hpca, float freq);

/**
 * @brief Set PWM output for a specific channel
 * @param hpca: Pointer to PCA9685 handle structure
 * @param channel: PWM channel (0-15)
 * @param on: PWM on time (0-4095)
 * @param off: PWM off time (0-4095)
 * @retval HAL status
 */
HAL_StatusTypeDef PCA9685_SetPWM(PCA9685_HandleTypeDef *hpca, uint8_t channel, uint16_t on, uint16_t off);

/**
 * @brief Set servo pulse width in microseconds
 * @param hpca: Pointer to PCA9685 handle structure
 * @param channel: PWM channel (0-15)
 * @param pulse_us: Pulse width in microseconds
 * @retval HAL status
 */
HAL_StatusTypeDef PCA9685_SetServoPulse(PCA9685_HandleTypeDef *hpca, uint8_t channel, uint16_t pulse_us);

/**
 * @brief Set servo angle (0-180 degrees)
 * @param hpca: Pointer to PCA9685 handle structure
 * @param channel: PWM channel (0-15)
 * @param angle: Angle in degrees (0-180)
 * @retval HAL status
 */
HAL_StatusTypeDef PCA9685_SetServoAngle(PCA9685_HandleTypeDef *hpca, uint8_t channel, float angle);

/**
 * @brief Set servo angle in radians
 * @param hpca: Pointer to PCA9685 handle structure
 * @param channel: PWM channel (0-15)
 * @param angle_rad: Angle in radians
 * @retval HAL status
 */
HAL_StatusTypeDef PCA9685_SetServoAngleRad(PCA9685_HandleTypeDef *hpca, uint8_t channel, float angle_rad);

/**
 * @brief Turn off all PWM outputs
 * @param hpca: Pointer to PCA9685 handle structure
 * @retval HAL status
 */
HAL_StatusTypeDef PCA9685_AllOff(PCA9685_HandleTypeDef *hpca);

#ifdef __cplusplus
}
#endif

#endif /* __PCA9685_H */

