import serial
import firebase_admin
from firebase_admin import credentials, db
import time
import sys

# 1. Initialize Firebase Admin SDK
# You need to generate a private key from Firebase Console -> Project Settings -> Service Accounts
# Save it as 'firebase-key.json' in the same directory as this script.
try:
    cred = credentials.Certificate('firebase-key.json')
    firebase_admin.initialize_app(cred, {
        # Update this URL to match your database URL from .env.local
        'databaseURL': 'https://greencontrol-c7fd5-default-rtdb.firebaseio.com'
    })
    print("Connected to Firebase!")
except Exception as e:
    print(f"Failed to initialize Firebase. Did you download the service account key? Error: {e}")
    sys.exit(1)

# 2. Connect to the Arduino UNO
# UPDATE 'COM3' to whatever port your Arduino is connected to (e.g., 'COM4', '/dev/ttyACM0')
COM_PORT = 'COM6'
try:
    arduino = serial.Serial(COM_PORT, 9600, timeout=1)
    print(f"Connected to Arduino on {COM_PORT}")
    time.sleep(2) # Give Arduino a moment to reset after serial connection
except Exception as e:
    print(f"Failed to connect to Arduino on {COM_PORT}. Error: {e}")
    sys.exit(1)

# 3. Handle incoming mode changes from Firebase
def handle_mode_change(event):
    if event.data:
        command = str(event.data).upper()
        print(f"Received override from Firebase: {command}")
        # Send 'A', 'O', or 'C' directly to the Arduino
        arduino.write(command.encode())

# Attach the listener to the manual override node
db.reference('greenhouse/mode').listen(handle_mode_change)

print("Listening for sensor data and Firebase overrides... (Press Ctrl+C to quit)")

# 4. Main Loop: Read serial from Arduino and push to Firebase
try:
    while True:
        if arduino.in_waiting > 0:
            line = arduino.readline().decode('utf-8').strip()
            
            # Look for the "TEMP:25.5" string pattern
            if line.startswith("TEMP:"):
                try:
                    temperature = float(line.split(":")[1])
                    print(f"Arduino -> Firebase: {temperature} °C")
                    db.reference('greenhouse/temperature').set(temperature)
                except ValueError:
                    print(f"Malformed temperature reading: {line}")
        
        # Prevent maxing out the CPU
        time.sleep(0.1)

except KeyboardInterrupt:
    print("Shutting down bridge...")
    arduino.close()
