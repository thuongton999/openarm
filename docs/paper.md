::: IEEEkeywords
Robot arm control, inverse kinematics, Web Serial API, STM32,
distributed computing, Three.js, PCA9685
:::

# Introduction

## Background and Research Objectives

The convergence of the Internet of Things (IoT) and robotics has created
a demand for robot control systems that are accessible and interactive
through web platforms. Controlling a 3-degree-of-freedom (3-DOF) robot
arm through a 3D graphical interface (3D HMI) enables users to visualize
motion and interact directly with the end-effector.

The primary objective of this project is to design and implement a
complete control system for a 3-DOF robot arm, where Inverse Kinematics
is distributed to the Web UI. The system must ensure reliability of
control commands through stable serial communication protocols and
precise PWM execution on the STM32F103C8T6 microcontroller.

## Theoretical Foundation

The robot arm under consideration has a configuration of three revolute
degrees of freedom (Revolute - R), forming a cylindrical articulated
manipulator[@rrr_manipulator]. With an RRR configuration (Base_DOF,
Arm_DOF, Hand_DOF), the robot arm can position the end-effector in
three-dimensional space[@inverse_kinematics_ros]. Kinematic chain
modeling is performed using the standard Denavit-Hartenberg (D-H)
convention[@rrr_manipulator].

![3-DOF RRR Robot Arm Configuration and Coordinate
Frames.](robot_arm_configuration.png){#fig:robot_config width="45%"}

# Methodology

The research methodology focuses on applying distributed computing
architecture and embedded software techniques to ensure reliability and
real-time performance.

## Kinematic Analysis

### Forward Kinematics (FK)

Forward kinematics determines the position of the end-effector based on
known joint angle values[@inverse_kinematics_chapter].

Table [1](#tab:dh_params){reference-type="ref"
reference="tab:dh_params"} presents the Denavit-Hartenberg parameters
for the 3-DOF RRR robot arm.

:::: center
::: {#tab:dh_params}
   **Link (i)**   **$a_i$**   **$\alpha_i$**   **$d_i$**      **$\theta_i$**
  -------------- ----------- ---------------- ----------- -----------------------
     1 (Base)       $L_0$        $\pi/2$           0       $\theta_1$ (Variable)
    2 (Arm 1)       $L_1$           0              0       $\theta_2$ (Variable)
    3 (Arm 2)       $L_2$           0              0       $\theta_3$ (Variable)

  : Denavit-Hartenberg Parameters of 3-DOF RRR Robot Arm
:::

[]{#tab:dh_params label="tab:dh_params"}
::::

The Forward Kinematics equations determine the end-effector
position[@kinematic_dynamic_modeling]:

$$\begin{aligned}
x &= L_1\cos(\theta_1)\cos(\theta_2) + L_2\cos(\theta_1)\cos(\theta_2 + \theta_3) \\
y &= L_1\sin(\theta_1)\cos(\theta_2) + L_2\sin(\theta_1)\cos(\theta_2 + \theta_3) \\
z &= L_0 + L_1\sin(\theta_2) + L_2\sin(\theta_2 + \theta_3)
\end{aligned}$$

### Distributed Inverse Kinematics (IK)

IK is performed using Iterative Methods on the Web UI[@three_ik]. The
use of algorithms such as FABRIK (Forward And Backward Reaching Inverse
Kinematics) or CCDIK (Cyclic Coordinate Descent IK) in the browser
(using Three.js library) allows for fast and intuitive solution of the
Inverse Kinematics problem[@simple_ik]. Calculated joint angles are then
sent to the STM32.

![Iterative Inverse Kinematics Algorithm Flowchart
(FABRIK/CCDIK).](ik_algorithm_flowchart.png){#fig:ik_algorithm
width="48%"}

## Web Interface Design and Communication Architecture

![Overall System Architecture: Web UI, Communication Layer, and Embedded
Control.](system_architecture.png){#fig:system_architecture width="48%"}

### 3D Interface Implementation (Three.js/URDF)

The user interface is built on Three.js to display a 3D model of the
robot. The kinematic model is loaded into the 3D environment using the
URDFLoader library[@urdf_loader]. Interactive control allows users to
drag the end-effector to desired positions, triggering iterative IK
algorithms to calculate new joint angles and update the 3D simulation in
real-time[@urdf_loader].

![Web-based 3D Interactive Interface showing robot arm with control
panel.](web_ui_interface.png){#fig:web_ui width="48%"}

### Web Serial API Communication and Command Packet Protocol

High-speed direct communication between browser and STM32 is established
through the Web Serial API. The STM32 is configured as a USB CDC Device
(Virtual COM Port). This API is only compatible with Chromium-based
browsers (Chrome, Edge).

To ensure data integrity and synchronization, a packet-based serial
protocol is established, including Header, Command ID, Length, Payload
(3 angles), and Checksum fields[@uart_packets].

:::: center
::: {#tab:packet_structure}
  **Field**   **Size (Bytes)**   **Description**
  ----------- ------------------ ----------------------------------------
  SYNC_WORD   2                  Synchronization word (e.g., 0xAA55)
  LENGTH      1                  Payload length
  CMD_TYPE    1                  Command (e.g., 0x01 = SET_JOINT_ANGLE)
  PAYLOAD     N                  Main data (e.g., 3 angles)
  CHECKSUM    1                  Error checking (XOR or CRC)

  : Command Packet Structure Transmitted via USB CDC
:::

[]{#tab:packet_structure label="tab:packet_structure"}
::::

## Embedded System Implementation

### Command Parser State Machine Programming

The STM32 firmware implements a Finite State Machine (FSM) in the
CDC_Receive_FS() callback function to handle asynchronous byte streams
from USB CDC[@uart_packets]. The FSM sequentially transitions through
states to receive and validate command packets. This mechanism
(including SYNC_WORD and CHECKSUM verification) is necessary to ensure
deterministic control commands, avoiding execution of fragmented
commands due to noise or transmission interruptions.

![Finite State Machine (FSM) for Command Packet Parsing on
STM32.](fsm_diagram.png){#fig:fsm width="48%"}

### Dedicated PWM Control via I2C (PCA9685)

The STM32F103C8T6 is configured as I2C Master to communicate with the
PCA9685 module, which serves as a 12-bit, 16-channel PWM generator. I2C
is configured in Fast-Mode (400 kbit/s).

![Hardware Connection Schematic: STM32, PCA9685, and Servo Motors with
Power Isolation.](hardware_schematic.png){#fig:hardware width="48%"}

-   **Power Supply Separation:** The PCA9685 module has a separate V+
    pin to power servos, isolated from the STM32 logic power supply.
    This prevents high surge currents from servos from causing noise and
    destabilizing the microcontroller's logic
    system[@servo_fundamentals].

-   **PWM Configuration:** The PCA9685 is configured to generate 50 Hz
    PWM frequency, corresponding to a 20 ms cycle, standard for servo
    motors. Pulse widths ranging from 0.5 ms ($0°$) to 2.5 ms ($180°$)
    are mapped to PCA9685 Compare Register (CCR) values (from 102 to 512
    ticks, out of 4096 12-bit steps)[@adafruit_pca9685].

![PWM Timing Diagram showing pulse width modulation for servo control
(50 Hz, 0.5-2.5 ms).](pwm_timing_diagram.png){#fig:pwm_timing
width="45%"}

The angle-to-CCR mapping equation ($\theta$) is linear:

$$X = \frac{512 - 102}{180} \times \theta + 102$$

# Expected Results and Evaluation

As the project is in the proposal stage, this section presents important
performance metrics that need to be measured after installation and
programming are completed.

## Kinematic Performance Evaluation (Accuracy and Repeatability)

The most important intrinsic metrics[@rrr_manipulator] are Accuracy and
Repeatability[@measuring_performance].

-   **Accuracy:** The error between the desired end-effector position
    (calculated from IK on Web UI) and the actual
    position[@accuracy_repeatability].

-   **Repeatability:** The robot's ability to repeat the same motion to
    a specific target position multiple times with minimal
    error[@accuracy_repeatability].

The measurement procedure includes repeating motions to a set of
predefined target points[@accuracy_repeatability]. Low-cost measurement
tools may include Dial Indicators or Machine Vision systems. Results
will be presented as average error (millimeters).

:::: center
::: {#tab:accuracy_results}
  ------------ ------------------- ---------------------- ---------------- -------------------
   **Target**      **Desired**         **Actual Avg**       **Accuracy**    **Repeatability**
   **Point**        **(mm)**              **(mm)**         **Error (mm)**    **Error (mm)**
   P1 (Near)    $(X_1, Y_1, Z_1)$   $(X'_1, Y'_1, Z'_1)$     $\Delta_1$        $\sigma_1$
    P2 (Mid)    $(X_2, Y_2, Z_2)$   $(X'_2, Y'_2, Z'_2)$     $\Delta_2$        $\sigma_2$
    P3 (Far)    $(X_3, Y_3, Z_3)$   $(X'_3, Y'_3, Z'_3)$     $\Delta_3$        $\sigma_3$
  ------------ ------------------- ---------------------- ---------------- -------------------

  : Expected Accuracy and Repeatability Measurement Results
:::

[]{#tab:accuracy_results label="tab:accuracy_results"}
::::

![Experimental setup for accuracy and repeatability testing with
measurement instruments.](accuracy_test_setup.png){#fig:accuracy_test
width="48%"}

## System Latency Analysis (End-to-End Latency)

End-to-end latency is a critical metric for evaluating real-time
performance, measuring the time from user interaction on the Web UI to
when the servo begins to respond[@measuring_delays].

### Independent Hardware Latency Measurement Method

To avoid inaccuracies of PC system clocks, we propose using an
independent hardware measurement method[@latency_measuring_device].

1.  **Setup:** Program the Web UI to change the brightness of a screen
    region after the command packet is sent via Web
    Serial[@latency_measuring_device].

2.  **Measurement:** Use a secondary microcontroller and photoresistor
    (light sensor) placed on the screen. A timer is triggered when the
    command is sent and stops when the photoresistor detects a
    brightness change[@latency_measuring_device].

3.  **Reporting:** Latency results will be analyzed using percentile
    statistical analysis (Percentile Plots), e.g., reporting \"99.9% of
    control latency is less than X ms\", to identify sudden latency
    spikes caused by the operating system or
    browser[@latency_measuring_device].

![Latency measurement setup using photoresistor and secondary
microcontroller.](latency_measurement_setup.png){#fig:latency_setup
width="48%"}

![Expected percentile plot for end-to-end latency distribution showing
99th and 99.9th
percentiles.](latency_percentile_plot.png){#fig:latency_plot
width="48%"}

# Discussion

![Data flow diagram showing distributed computing architecture from Web
UI to servo control.](data_flow_diagram.png){#fig:data_flow width="48%"}

## Discussion on Distributed Architecture

The use of distributed computing architecture, where the Web UI is
responsible for solving Inverse Kinematics using Iterative IK
(FABRIK/CCDIK), is an efficient design choice. It allows leveraging the
computational capability of the Host PC for more complex
algorithms[@three_ik], while keeping the STM32 firmware simple, focused
on accurate and stable PWM execution through the FSM command
parser[@uart_packets].

The limitation of this method is the dependency on the Web Serial API,
which is only supported on Chromium-based browsers, limiting
accessibility on Firefox or Safari.

## Embedded Performance Analysis

Power supply separation combined with the use of the PCA9685 I2C module
is a critical strategy to ensure reliability. Although PCA9685 provides
12-bit resolution (4096 steps), the actual angular resolution is only
limited by the servo pulse standard (equivalent useful steps). Latency
data collected (Section III-B) will confirm whether sending packets via
USB CDC and I2C transactions (STM32 $\leftrightarrow$ PCA9685) create
acceptable latency for visual robot control[@measuring_delays].

![Performance comparison: computational load distribution between Web UI
and STM32.](performance_comparison.png){#fig:performance width="45%"}

## Limitations and Future Development Directions

1.  **I2C Communication Upgrade:** To reduce CPU load and I2C
    communication latency, consider switching I2C Master protocol to
    non-blocking mode using DMA (Direct Memory Access).

2.  **Telemetry Feedback Implementation:** Upgrade the current one-way
    control architecture by sending telemetry data about actual servo
    positions and error status from STM32 back to the Web UI (using
    CDC_Transmit_FS).

3.  **Constraint Management:** Integrate physical constraints (joint
    angle limits) into the iterative IK algorithm on the Web UI to avoid
    generating infeasible control commands for servos[@simple_ik].

# Conclusion

The project has successfully established a distributed control
architecture model for a 3-DOF robot arm. By offloading Inverse
Kinematics to the Web UI (using Iterative IK), we have optimized MCU
performance and created an effective 3D interactive interface
(Three.js/URDF). The embedded system (STM32/USB CDC/FSM/I2C PCA9685) is
designed with software stabilization mechanisms and power isolation,
creating a direct, high-speed control channel between user and robot,
providing a solid foundation to achieve kinematic performance and low
latency as targeted.