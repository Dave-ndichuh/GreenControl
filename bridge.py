import serial
import firebase_admin
from firebase_admin import credentials, db
import time
import threading
from datetime import datetime
from plyer import notification

# Initialize Firebase (requires service account key JSON)
try:
    cred = credentials.Certificate('firebase-key.json')
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://greencontrol-c7fd5-default-rtdb.firebaseio.com'
    })
    print("Connected to Firebase!")
except Exception as e:
    print(f"Failed to initialize Firebase: {e}")
    sys.exit(1)

# Connect to the UNO (Updated to COM6)
COM_PORT = 'COM6'
try:
    arduino = serial.Serial(COM_PORT, 9600, timeout=1)
    print(f"Connected to Arduino on {COM_PORT}")
    time.sleep(2)
except Exception as e:
    print(f"Failed to connect to Arduino on {COM_PORT}: {e}")
    sys.exit(1)

# --- GLOBAL TOGGLE ---
bridge_enabled = True

def keyboard_listener():
    global bridge_enabled
    while True:
        try:
            cmd = input().strip().upper()
            if cmd == 'Y':
                bridge_enabled = True
                print("\n[SYSTEM] Bridge ENABLED - Syncing to Firebase!\n")
            elif cmd == 'N':
                bridge_enabled = False
                print("\n[SYSTEM] Bridge PAUSED - Syncing stopped. Arduino running locally.\n")
        except EOFError:
            break

input_thread = threading.Thread(target=keyboard_listener, daemon=True)
input_thread.start()

# --- FIREBASE LISTENERS (Cloud -> Arduino) ---

def handle_mode_change(event):
    if not bridge_enabled: return
    if event.data:
        # The Arduino expects strings ending in a newline character
        command = str(event.data).upper() + '\n'
        arduino.write(command.encode('utf-8'))
        print(f"Sent Mode Override: {command.strip()}")

def handle_threshold_change(event):
    if not bridge_enabled: return
    if event.data is not None:
        # Send dynamic threshold as "T:28.5\n"
        command = f"T:{event.data}\n"
        arduino.write(command.encode('utf-8'))
        print(f"Sent New Threshold: {command.strip()}")

# Attach listeners
db.reference('greenhouse/mode').listen(handle_mode_change)
db.reference('greenhouse/threshold').listen(handle_threshold_change)

# --- WATCHDOG PING THREAD ---
def ping_arduino():
    while True:
        try:
            # Send the heartbeat every 10 seconds to Arduino
            arduino.write(b"PING\n")
            if bridge_enabled:
                # Send heartbeat to Dashboard
                db.reference('greenhouse/bridge_status').set('ONLINE')
                db.reference('greenhouse/last_seen').set(int(time.time() * 1000))
            else:
                db.reference('greenhouse/bridge_status').set('OFFLINE')
        except:
            pass
        time.sleep(10)

# Start ping thread in the background
ping_thread = threading.Thread(target=ping_arduino, daemon=True)
ping_thread.start()

print("Bridge started. Listening to Arduino...")
print("==================================================")
print("Type 'N' + Enter to PAUSE Firebase Syncing")
print("Type 'Y' + Enter to RESUME Firebase Syncing")
print("Press Ctrl+C to quit completely")
print("==================================================")

# --- MAIN LOOP (Arduino -> Cloud) ---
last_log_time = time.time()
last_alert_time = 0
ALERT_THRESHOLD = 32.0

try:
    while True:
        try:
            if arduino.in_waiting > 0:
                try:
                    line = arduino.readline().decode('utf-8').strip()
                    
                    # 1. Handle Live Temperature & Time-Series Logging
                    if line.startswith("TEMP:"):
                        temperature = float(line.split(":")[1])
                        print(f"Arduino -> PC: {temperature} °C")
                        
                        if bridge_enabled:
                            try:
                                db.reference('greenhouse/temperature_live').set(temperature)
                            except Exception as e:
                                print(f"Network error pushing temperature: {e}")
                        
                        # Local OS Desktop Notification for critical temps (still works even if paused)
                        current_time = time.time()
                        if temperature >= ALERT_THRESHOLD:
                            if current_time - last_alert_time >= 300: # 5 min throttle
                                print(f"CRITICAL: Temperature reached {temperature}°C! Triggering OS Notification.")
                                try:
                                    notification.notify(
                                        title="Greenhouse CRITICAL Alert!",
                                        message=f"Temperature has reached {temperature}°C (Threshold: {ALERT_THRESHOLD}°C)",
                                        app_name="GreenControl",
                                        timeout=10
                                    )
                                    last_alert_time = current_time
                                except Exception as e:
                                    print(f"Failed to show OS notification: {e}")

                        # Log historical data every 5 minutes (300 seconds)
                        if bridge_enabled and (current_time - last_log_time >= 300):
                            try:
                                db.reference('greenhouse/temperature_history').push({
                                    'temp': temperature,
                                    'timestamp': int(current_time * 1000),
                                    'human_readable': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                                })
                                print(f"Logged historical temperature: {temperature}°C")
                                last_log_time = current_time
                            except Exception as e:
                                print(f"Network error logging history: {e}")

                    # 2. Handle Hardware Vent Confirmations (ACK)
                    elif line.startswith("VENT:"):
                        vent_status = line.split(":")[1] # Will be "OPEN" or "CLOSED"
                        print(f"Hardware ACK Received: Vent is {vent_status}")
                        
                        if bridge_enabled:
                            try:
                                db.reference('greenhouse/vent_state').set(vent_status)
                            except Exception as e:
                                print(f"Network error pushing vent state: {e}")

                    # 3. Handle Local IR Remote Overrides
                    elif line.startswith("SYNC_MODE:"):
                        new_mode = line.split(":")[1]
                        print(f"Hardware Override: Synced mode {new_mode} to Cloud")
                        
                        if bridge_enabled:
                            try:
                                db.reference('greenhouse/mode').set(new_mode)
                    # 4. Handle IR Debugging Hex Codes
                    elif line.startswith("IR_CODE:"):
                        hex_code = line.split(":")[1]
                        print(f"------------\n[IR DETECTED] Button pressed on remote! Hex Code: 0x{hex_code}\n------------")
                        
                except Exception as e:
                    print(f"Serial read parsing error: {e}")
                    
        except serial.SerialException as se:
            print(f"\n[ERROR] Serial connection lost (Access Denied / Unplugged).")
            print("Attempting to auto-reconnect in 5 seconds...")
            try:
                arduino.close()
            except:
                pass
            time.sleep(5)
            try:
                arduino = serial.Serial(COM_PORT, 9600, timeout=1)
                print(f"[SYSTEM] Successfully reconnected to {COM_PORT}!\n")
            except Exception as e:
                print(f"[ERROR] Reconnect failed. Will try again... ({e})")
                
        time.sleep(0.01) # Prevent 100% CPU usage

except KeyboardInterrupt:
    print("\nShutting down bridge...")
    try:
        db.reference('greenhouse/bridge_status').set('OFFLINE')
    except:
        pass
    arduino.close()
