import serial
import firebase_admin
from firebase_admin import credentials, db
import time
import threading
import sys
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
arduino = None
try:
    arduino = serial.Serial(COM_PORT, 9600, timeout=1)
    print(f"Connected to Arduino on {COM_PORT}")
    time.sleep(2)
except Exception as e:
    print(f"[WARNING] Could not open {COM_PORT} on startup. Is the Arduino Serial Monitor open?")
    print("Bridge will stay alive and auto-connect as soon as the port is released!")

# --- GLOBAL TOGGLE ---
bridge_enabled = True

def keyboard_listener():
    global bridge_enabled, arduino
    while True:
        try:
            cmd = input().strip().upper()
            if cmd == 'Y':
                bridge_enabled = True
                print("\n[SYSTEM] Bridge ENABLED - Reconnecting to COM Port and Firebase...\n")
            elif cmd == 'N':
                bridge_enabled = False
                try:
                    if arduino: arduino.close()
                except:
                    pass
                print("\n[SYSTEM] Bridge PAUSED - COM Port RELEASED! You can now Upload code safely.\n")
        except EOFError:
            break

input_thread = threading.Thread(target=keyboard_listener, daemon=True)
input_thread.start()

# --- FIREBASE LISTENERS (Cloud -> Arduino) ---

def handle_mode_change(event):
    if not bridge_enabled or not arduino or not arduino.is_open: return
    if event.data:
        command = str(event.data).upper() + '\n'
        try:
            arduino.write(command.encode('utf-8'))
            print(f"Sent Mode Override: {command.strip()}")
        except:
            pass

def handle_threshold_change(event):
    if not bridge_enabled or not arduino or not arduino.is_open: return
    if event.data is not None:
        command = f"T:{event.data}\n"
        try:
            arduino.write(command.encode('utf-8'))
            print(f"Sent New Threshold: {command.strip()}")
        except:
            pass

db.reference('greenhouse/mode').listen(handle_mode_change)
db.reference('greenhouse/threshold').listen(handle_threshold_change)

# --- WATCHDOG PING THREAD ---
def ping_arduino():
    while True:
        if bridge_enabled:
            try:
                if arduino and arduino.is_open:
                    arduino.write(b"PING\n")
                db.reference('greenhouse/bridge_status').set('ONLINE')
                db.reference('greenhouse/last_seen').set(int(time.time() * 1000))
            except:
                pass
        else:
            try:
                db.reference('greenhouse/bridge_status').set('OFFLINE')
            except:
                pass
        time.sleep(10)

ping_thread = threading.Thread(target=ping_arduino, daemon=True)
ping_thread.start()

print("Bridge started. Listening to Arduino...")
print("==================================================")
print("Type 'N' + Enter to RELEASE COM Port for Uploads")
print("Type 'Y' + Enter to RESUME Bridge")
print("Press Ctrl+C to quit completely")
print("==================================================")

# --- MAIN LOOP (Arduino -> Cloud) ---
last_log_time = time.time()
last_alert_time = 0
ALERT_THRESHOLD = 32.0

lm35_val = 0.0
dht_val = 0.0
hum_val = 0.0

try:
    while True:
        if not bridge_enabled:
            time.sleep(1)
            continue
            
        try:
            if arduino is None or not arduino.is_open:
                arduino = serial.Serial(COM_PORT, 9600, timeout=1)
                print(f"[SYSTEM] Connected to Arduino on {COM_PORT}")
                time.sleep(2)
                
            if arduino.in_waiting > 0:
                try:
                    line = arduino.readline().decode('utf-8').strip()
                    
                    # 1. Handle Dual Sensors & Telemetry Logging
                    if line.startswith("TEMP_LM35:"):
                        lm35_val = float(line.split(":")[1])
                        if bridge_enabled:
                            try:
                                db.reference('greenhouse/sensors/temp_lm35').set(lm35_val)
                            except: pass

                    elif line.startswith("TEMP_DHT:"):
                        dht_val = float(line.split(":")[1])
                        if bridge_enabled:
                            try:
                                db.reference('greenhouse/sensors/temp_dht').set(dht_val)
                            except: pass
                            
                        # OS Desktop Notification (active temp priority)
                        active_temp = dht_val if dht_val > 0 else lm35_val
                        current_time = time.time()
                        if active_temp >= ALERT_THRESHOLD:
                            if current_time - last_alert_time >= 300:
                                print(f"CRITICAL: Temp reached {active_temp}°C! Triggering OS Notification.")
                                try:
                                    notification.notify(
                                        title="Greenhouse CRITICAL Alert!",
                                        message=f"Temp is {active_temp}°C (Threshold: {ALERT_THRESHOLD}°C)",
                                        app_name="GreenControl",
                                        timeout=10
                                    )
                                    last_alert_time = current_time
                                except: pass

                    elif line.startswith("HUM:"):
                        hum_val = float(line.split(":")[1])
                        # Print aggregated live feed to console
                        print(f"Arduino -> PC: LM35({lm35_val}°C) DHT({dht_val}°C, {hum_val}%)")
                        
                        if bridge_enabled:
                            try:
                                db.reference('greenhouse/sensors/humidity').set(hum_val)
                            except: pass
                            
                        # Periodic Time-Series Logging to telemetry_history
                        current_time = time.time()
                        if bridge_enabled and (current_time - last_log_time >= 300):
                            try:
                                db.reference('greenhouse/telemetry_history').push({
                                    'temp_lm35': lm35_val,
                                    'temp_dht': dht_val,
                                    'humidity': hum_val,
                                    'timestamp': int(current_time * 1000),
                                    'human_readable': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                                })
                                print(f"Logged telemetry: LM35={lm35_val}, DHT={dht_val}, Hum={hum_val}%")
                                last_log_time = current_time
                            except Exception as e:
                                print(f"Network error logging telemetry: {e}")

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
                            except Exception as e:
                                print(f"Network error pushing mode: {e}")

                    # 4. Handle IR Debugging Hex Codes
                    elif line.startswith("IR_CODE:"):
                        hex_code = line.split(":")[1]
                        print(f"------------\n[IR DETECTED] Button pressed on remote! Hex Code: 0x{hex_code}\n------------")

                    # 5. Handle Live Power Estimation (Digital Twin)
                    elif line.startswith("PWR:"):
                        power_mw = int(line.split(":")[1])
                        print(f"Power Draw: {power_mw} mW")
                        
                        if bridge_enabled:
                            try:
                                db.reference('greenhouse/power_live').set(power_mw)
                            except Exception as e:
                                print(f"Network error pushing power: {e}")
                        
                except Exception as e:
                    print(f"Serial read parsing error: {e}")
                    
        except serial.SerialException as se:
            print(f"\n[ERROR] Serial connection lost (Access Denied / Unplugged).")
            print("Will attempt to reconnect...")
            try:
                if arduino: arduino.close()
            except:
                pass
            time.sleep(5)
                
        time.sleep(0.01) # Prevent 100% CPU usage

except KeyboardInterrupt:
    print("\nShutting down bridge...")
    try:
        db.reference('greenhouse/bridge_status').set('OFFLINE')
    except:
        pass
    arduino.close()
