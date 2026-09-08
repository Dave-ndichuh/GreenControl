# GreenControl: IoT Farmhouse Dashboard

GreenControl is a full-stack, real-time IoT climate control system built for greenhouse environments. It seamlessly bridges a physical hardware node (Arduino UNO) with a modern, responsive web dashboard (Next.js) using a Python serial bridge and Firebase Realtime Database.

## System Architecture

The project consists of three tightly integrated layers:

1. **Hardware Node (Arduino C++)**: Reads physical sensors, controls the vent actuator, drives local UI (LCD, LEDs, Buzzer), and handles infrared remote overrides.
2. **Serial Bridge (Python)**: An asynchronous background process running on the host PC that routes data between the USB Serial port and the cloud with zero latency.
3. **Web Dashboard (Next.js & React)**: A live, reactive UI deployed on Vercel that allows remote monitoring, theme customization, and historical telemetry analysis.

---

## 1. Hardware Node (BomaLink Node OS)

The Arduino UNO acts as the physical brain, running a robust loop that operates independently but syncs instantly when connected to the bridge.

### Components & Wiring
* **Arduino UNO R3**
* **LM35 Temperature Sensor** (Pin A0): Primary analog temperature control (smoothed via 10-point moving average).
* **IR Receiver** (Pin A1): Allows local overrides using an infrared TV remote.
* **DHT11 Sensor** (Pin A2): Provides secondary digital temperature and primary humidity readings.
* **SG90 Micro Servo** (Pin 9): Actuates the greenhouse ventilation flaps.
* **16x2 LCD Display**: Shows live dual-sensor readings (`L:26.4C D:24.1C`) and the current system mode.
* **Status LEDs**: 
  * Green (Pin 6): Network/Bridge Online.
  * Blue (Pin 7): Vent Actuator Open.
  * Red (Pin 8): Critical Heat Warning.
* **Active Buzzer** (Pin 10): Uses a custom software-based pulse (`customBeep`) to avoid hardware timer conflicts with the `IRremote` library.

### Core Hardware Features
* **Watchdog Failsafe**: Requires a `PING` from the Python bridge every 10 seconds. If the bridge crashes or loses internet, the Arduino reverts to `AUTO` mode to protect the crops.
* **Hardware ACKs**: The Arduino physically confirms when the servo moves and broadcasts `VENT:OPEN` back to the cloud, guaranteeing the web dashboard never displays false states.
* **Digital Twin Power Estimation**: The Arduino calculates its own real-time power draw (mW) purely in software by tracking the state of the servo and LEDs, broadcasting the live calculation to the dashboard.

---

## 2. Python Serial Bridge

The `bridge.py` script acts as the middleware, translating local USB Serial packets into global Firebase updates.

### Core Bridge Features
* **Asynchronous Firebase Syncing**: Network requests are offloaded to daemon threads. This completely eliminates "Serial Buffer Lag", allowing the Python script to read the Arduino at 1000Hz without ever freezing during internet uploads.
* **COM Port Hotkeys**: Press `N` in the terminal to gracefully pause the bridge and physically release the COM port back to Windows. This allows you to flash new code via the Arduino IDE without crashing. Press `Y` to instantly reclaim the port and resume syncing.
* **Auto-Reconnect**: Survives physical USB unplugs and port access denials by silently waiting in the background and reconnecting when the hardware is available.
* **OS Desktop Notifications**: Uses the `plyer` library to push native Windows desktop alerts if the active temperature exceeds the critical threshold (32.0°C).
* **Telemetry Logger**: Aggregates the high-speed live data and pushes a clean snapshot to `telemetry_history` every 5 minutes for the dashboard charts.

---

## 3. Web Dashboard (Next.js)

A highly reactive, modern UI built with Next.js, Tailwind CSS, and Recharts.

### Core Dashboard Features
* **Live Dual-Sensor Display**: Prominently displays the active temperature (prioritizing the LM35) while explicitly breaking down both the LM35 and DHT11 live feeds to match the physical LCD perfectly.
* **Remote Override Controls**: Allows the user to force the vents `OPEN`, `CLOSED`, or return to `AUTO` logic.
* **Dynamic Threshold Slider**: Drag the slider to instantly update the Arduino's internal `thresholdTemp` variable over the internet.
* **Real-time Telemetry Chart**: Plots historical data points for both the LM35 (dashed line) and DHT11 (solid line) on an overlapping graph, including a visual reference line for the active threshold.
* **Theme Engine**: Toggle between three distinct aesthetics (`Modern`, `Cyberpunk`, and `Eco Forest`) which instantly recolor the entire app, including SVG icons, charts, and drop shadows.
* **Offline Detection Banner**: Turns gray and locks out the controls if the Python bridge stops sending its 10-second heartbeat.

---

## Getting Started

1. **Deploy the Hardware**: Upload `arduino/greenhouse/greenhouse.ino` to the Arduino.
2. **Start the Bridge**: Run `python bridge.py` on the connected host machine. Ensure `firebase-key.json` is present.
3. **View the Dashboard**: Visit your Vercel deployment URL to monitor and control the greenhouse from anywhere in the world!
