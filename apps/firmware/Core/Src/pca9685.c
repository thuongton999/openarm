/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file           : pca9685.c
  * @brief          : PCA9685 16-channel PWM driver implementation
  ******************************************************************************
  * @attention
  *
  * This driver is based on the Adafruit PCA9685 library, adapted for
  * STM32 HAL I2C interface.
  *
  ******************************************************************************
  */
/* USER CODE END Header */

/* Includes ------------------------------------------------------------------*/
#include "pca9685.h"
#include <math.h>

/* Private defines -----------------------------------------------------------*/
#define PI 3.14159265358979323846f

/* Private function prototypes -----------------------------------------------*/
static HAL_StatusTypeDef PCA9685_Write8(PCA9685_HandleTypeDef *hpca, uint8_t reg, uint8_t data);
static HAL_StatusTypeDef PCA9685_Read8(PCA9685_HandleTypeDef *hpca, uint8_t reg, uint8_t *data);

/* Private functions ---------------------------------------------------------*/

/**
 * @brief Write a byte to a PCA9685 register
 * @param hpca: Pointer to PCA9685 handle structure
 * @param reg: Register address
 * @param data: Data to write
 * @retval HAL status
 */
static HAL_StatusTypeDef PCA9685_Write8(PCA9685_HandleTypeDef *hpca, uint8_t reg, uint8_t data)
{
    uint8_t buf[2] = {reg, data};
    return HAL_I2C_Master_Transmit(hpca->hi2c, hpca->i2c_addr << 1, buf, 2, PCA9685_TIMEOUT);
}

/**
 * @brief Read a byte from a PCA9685 register
 * @param hpca: Pointer to PCA9685 handle structure
 * @param reg: Register address
 * @param data: Pointer to store read data
 * @retval HAL status
 */
static HAL_StatusTypeDef PCA9685_Read8(PCA9685_HandleTypeDef *hpca, uint8_t reg, uint8_t *data)
{
    HAL_StatusTypeDef status;
    
    // Send register address
    status = HAL_I2C_Master_Transmit(hpca->hi2c, hpca->i2c_addr << 1, &reg, 1, PCA9685_TIMEOUT);
    if (status != HAL_OK) {
        return status;
    }
    
    // Read data
    return HAL_I2C_Master_Receive(hpca->hi2c, hpca->i2c_addr << 1, data, 1, PCA9685_TIMEOUT);
}

/* Public functions ----------------------------------------------------------*/

/**
 * @brief Initialize PCA9685 driver
 */
HAL_StatusTypeDef PCA9685_Init(PCA9685_HandleTypeDef *hpca, I2C_HandleTypeDef *hi2c, uint8_t addr)
{
    HAL_StatusTypeDef status;
    
    // Store I2C handle and address
    hpca->hi2c = hi2c;
    hpca->i2c_addr = addr;
    hpca->oscillator_freq = FREQUENCY_OSCILLATOR;
    
    // Reset the device
    status = PCA9685_Reset(hpca);
    if (status != HAL_OK) {
        return status;
    }
    
    // Set default PWM frequency (50 Hz for servos)
    status = PCA9685_SetPWMFreq(hpca, SERVO_FREQ);
    if (status != HAL_OK) {
        return status;
    }
    
    return HAL_OK;
}

/**
 * @brief Reset PCA9685 to default state
 */
HAL_StatusTypeDef PCA9685_Reset(PCA9685_HandleTypeDef *hpca)
{
    HAL_StatusTypeDef status;
    
    // Write to MODE1 register to reset
    status = PCA9685_Write8(hpca, PCA9685_MODE1, MODE1_RESTART);
    if (status != HAL_OK) {
        return status;
    }
    
    HAL_Delay(10); // Wait for oscillator to stabilize
    
    return HAL_OK;
}

/**
 * @brief Put PCA9685 into sleep mode
 */
HAL_StatusTypeDef PCA9685_Sleep(PCA9685_HandleTypeDef *hpca)
{
    HAL_StatusTypeDef status;
    uint8_t mode1;
    
    // Read current MODE1 register
    status = PCA9685_Read8(hpca, PCA9685_MODE1, &mode1);
    if (status != HAL_OK) {
        return status;
    }
    
    // Set sleep bit
    mode1 |= MODE1_SLEEP;
    
    // Write back
    return PCA9685_Write8(hpca, PCA9685_MODE1, mode1);
}

/**
 * @brief Wake up PCA9685 from sleep mode
 */
HAL_StatusTypeDef PCA9685_Wakeup(PCA9685_HandleTypeDef *hpca)
{
    HAL_StatusTypeDef status;
    uint8_t mode1;
    
    // Read current MODE1 register
    status = PCA9685_Read8(hpca, PCA9685_MODE1, &mode1);
    if (status != HAL_OK) {
        return status;
    }
    
    // Clear sleep bit
    mode1 &= ~MODE1_SLEEP;
    
    // Write back
    status = PCA9685_Write8(hpca, PCA9685_MODE1, mode1);
    if (status != HAL_OK) {
        return status;
    }
    
    HAL_Delay(1); // Wait for oscillator to stabilize
    
    return HAL_OK;
}

/**
 * @brief Set PWM frequency for all channels
 */
HAL_StatusTypeDef PCA9685_SetPWMFreq(PCA9685_HandleTypeDef *hpca, float freq)
{
    HAL_StatusTypeDef status;
    uint8_t prescale;
    uint8_t oldmode, newmode;
    
    // Calculate prescale value
    // prescale = round(osc_clock / (4096 * update_rate)) - 1
    float prescaleval = ((float)hpca->oscillator_freq / (PWM_RESOLUTION * freq)) - 1.0f;
    prescale = (uint8_t)(prescaleval + 0.5f);
    
    // Clamp prescale value
    if (prescale < PCA9685_PRESCALE_MIN) {
        prescale = PCA9685_PRESCALE_MIN;
    }
    if (prescale > PCA9685_PRESCALE_MAX) {
        prescale = PCA9685_PRESCALE_MAX;
    }
    
    // Read current MODE1 register
    status = PCA9685_Read8(hpca, PCA9685_MODE1, &oldmode);
    if (status != HAL_OK) {
        return status;
    }
    
    // Go to sleep to set prescale
    newmode = (oldmode & ~MODE1_RESTART) | MODE1_SLEEP;
    status = PCA9685_Write8(hpca, PCA9685_MODE1, newmode);
    if (status != HAL_OK) {
        return status;
    }
    
    // Set prescale
    status = PCA9685_Write8(hpca, PCA9685_PRESCALE, prescale);
    if (status != HAL_OK) {
        return status;
    }
    
    // Restore old mode
    status = PCA9685_Write8(hpca, PCA9685_MODE1, oldmode);
    if (status != HAL_OK) {
        return status;
    }
    
    HAL_Delay(5); // Wait for oscillator to stabilize
    
    // Enable auto-increment and restart
    status = PCA9685_Write8(hpca, PCA9685_MODE1, oldmode | MODE1_RESTART | MODE1_AI);
    if (status != HAL_OK) {
        return status;
    }
    
    return HAL_OK;
}

/**
 * @brief Set PWM output for a specific channel
 */
HAL_StatusTypeDef PCA9685_SetPWM(PCA9685_HandleTypeDef *hpca, uint8_t channel, uint16_t on, uint16_t off)
{
    HAL_StatusTypeDef status;
    uint8_t buf[5];
    
    // Validate channel
    if (channel > 15) {
        return HAL_ERROR;
    }
    
    // Prepare data buffer
    buf[0] = PCA9685_LED0_ON_L + 4 * channel;
    buf[1] = on & 0xFF;         // ON low byte
    buf[2] = (on >> 8) & 0xFF;  // ON high byte
    buf[3] = off & 0xFF;        // OFF low byte
    buf[4] = (off >> 8) & 0xFF; // OFF high byte
    
    // Write all 4 registers at once (auto-increment enabled)
    status = HAL_I2C_Master_Transmit(hpca->hi2c, hpca->i2c_addr << 1, buf, 5, PCA9685_TIMEOUT);
    
    return status;
}

/**
 * @brief Set servo pulse width in microseconds
 */
HAL_StatusTypeDef PCA9685_SetServoPulse(PCA9685_HandleTypeDef *hpca, uint8_t channel, uint16_t pulse_us)
{
    // Clamp pulse width to safe range
    if (pulse_us < SERVO_MIN_PULSE_US) {
        pulse_us = SERVO_MIN_PULSE_US;
    }
    if (pulse_us > SERVO_MAX_PULSE_US) {
        pulse_us = SERVO_MAX_PULSE_US;
    }
    
    // Calculate pulse length in 12-bit resolution
    // pulse_length = (pulse_us * 4096) / (1000000 / freq)
    // For 50 Hz: period = 20000 us
    float pulse_length = (float)pulse_us * PWM_RESOLUTION / (1000000.0f / SERVO_FREQ);
    uint16_t pulse = (uint16_t)(pulse_length + 0.5f);
    
    return PCA9685_SetPWM(hpca, channel, 0, pulse);
}

/**
 * @brief Set servo angle (0-180 degrees)
 */
HAL_StatusTypeDef PCA9685_SetServoAngle(PCA9685_HandleTypeDef *hpca, uint8_t channel, float angle)
{
    // Clamp angle to valid range
    if (angle < 0.0f) {
        angle = 0.0f;
    }
    if (angle > 180.0f) {
        angle = 180.0f;
    }
    
    // Map angle to pulse width
    // 0° = SERVO_MIN_PULSE_US, 180° = SERVO_MAX_PULSE_US
    float pulse_us = SERVO_MIN_PULSE_US + (angle / 180.0f) * (SERVO_MAX_PULSE_US - SERVO_MIN_PULSE_US);
    
    return PCA9685_SetServoPulse(hpca, channel, (uint16_t)pulse_us);
}

/**
 * @brief Set servo angle in radians
 */
HAL_StatusTypeDef PCA9685_SetServoAngleRad(PCA9685_HandleTypeDef *hpca, uint8_t channel, float angle_rad)
{
    // Convert radians to degrees
    float angle_deg = angle_rad * 180.0f / PI;
    
    return PCA9685_SetServoAngle(hpca, channel, angle_deg);
}

/**
 * @brief Turn off all PWM outputs
 */
HAL_StatusTypeDef PCA9685_AllOff(PCA9685_HandleTypeDef *hpca)
{
    HAL_StatusTypeDef status;
    
    // Set all channels to full OFF
    status = PCA9685_Write8(hpca, PCA9685_ALLLED_OFF_H, 0x10);
    
    return status;
}

