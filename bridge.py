import serial
import firebase_admin
from firebase_admin import credentials, db
import time
import sys
import threading
from plyer import notification

# 1. Initialize Firebase
try:
    cred = credentials.Certificate('firebase-key.json')
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://greencontrol-c7fd5-default-rtdb.firebaseio.com'
    })
    print("Connected to Firebase!")
except Exception as e:
    print(f"Failed to initialize Firebase: {e}")
    sys.exit(1)

# 2. Connect to Arduino
COM_PORT = 'COM6'
try:
    arduino = serial.Serial(COM_PORT, 9600, timeout=1)
    print(f"Connected to Arduino on {COM_PORT}")
    time.sleep(2)
except Exception as e:
    print(f"Failed to connect to Arduino: {e}")
    sys.exit(1)

# 3. Firebase Listeners
def handle_mode_change(event):
    if event.data:
        command = str(event.data).upper()
        print(f"Firebase Override: {command}")
        arduino.write(f"{command}\n".encode())

def handle_threshold_change(event):
    if event.data is not None:
        val = float(event.data)
        print(f"Firebase Threshold Update: {val}°C")
        arduino.write(f"T:{val}\n".encode())

db.reference('greenhouse/mode').listen(handle_mode_change)
db.reference('greenhouse/threshold').listen(handle_threshold_change)

# 4. Watchdog Ping Thread
def ping_arduino():
    while True:
        try:
            arduino.write(b"PING\n")
        except:
            pass
        time.sleep(10) # Send ping every 10 seconds

ping_thread = threading.Thread(target=ping_arduino, daemon=True)
ping_thread.start()

# 5. Main Loop
EXTREME_HIGH = 28.0
EXTREME_LOW = 15.0
ALERT_THRESHOLD = 32.0
THROTTLE_INTERVAL = 60 # 1 min for db history
ALERT_THROTTLE = 300 # 5 min for desktop notifications

last_extreme_log_time = 0
last_alert_time = 0

print("Listening for sensor data and Firebase overrides... (Press Ctrl+C to quit)")

try:
    while True:
        if arduino.in_waiting > 0:
            line = arduino.readline().decode('utf-8').strip()
            
            if line.startswith("VENT:"):
                # Hardware ACK received
                state = line.split(":")[1]
                print(f"Hardware Confirmed Vent State: {state}")
                try:
                    db.reference('greenhouse/vent_state').set(state)
                except Exception as e:
                    pass

            elif line.startswith("TEMP:"):
                try:
                    temperature = float(line.split(":")[1])
                    print(f"Arduino -> Firebase: {temperature} °C")
                    
                    try:
                        db.reference('greenhouse/temperature').set(temperature)
                    except Exception as e:
                        print(f"Network error pushing temperature: {e}")
                    
                    current_time = time.time()
                    
                    # Desktop Notification Alert (> 32C)
                    if temperature > ALERT_THRESHOLD:
                        if current_time - last_alert_time >= ALERT_THROTTLE:
                            print(f"CRITICAL: Temperature reached {temperature}°C! Triggering OS Notification.")
                            try:
                                notification.notify(
                                    title="Greenhouse CRITICAL Alert!",
                                    message=f"Temperature has dangerously exceeded {ALERT_THRESHOLD}°C! Current: {temperature}°C",
                                    app_name="GreenControl",
                                    timeout=10
                                )
                                last_alert_time = current_time
                            except Exception as e:
                                print(f"Failed to show notification: {e}")

                    # History Logging
                    if temperature > EXTREME_HIGH or temperature < EXTREME_LOW:
                        if current_time - last_extreme_log_time >= THROTTLE_INTERVAL:
                            extreme_type = "HIGH" if temperature > EXTREME_HIGH else "LOW"
                            try:
                                db.reference('greenhouse/history/extremes').push({
                                    'temperature': temperature,
                                    'type': extreme_type,
                                    'timestamp': int(current_time * 1000)
                                })
                                print(f"Logged historical extreme: {temperature}°C ({extreme_type})")
                                last_extreme_log_time = current_time
                            except Exception as e:
                                print(f"Network error logging extreme: {e}")
                            
                except ValueError:
                    print(f"Malformed temperature reading: {line}")
        
        time.sleep(0.05)

except KeyboardInterrupt:
    print("Shutting down bridge...")
    arduino.close()
