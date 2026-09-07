#include <LiquidCrystal.h>
#include <Servo.h>

// --- Pin Definitions ---
LiquidCrystal lcd(12, 11, 5, 4, 3, 2);
Servo ventServo;

const int lm35Pin = A0;
const int servoPin = 9;
const int greenLedPin = 6;
const int blueLedPin = 7;
const int redLedPin = 8;
const int buzzerPin = 10;

// --- State Variables ---
float thresholdTemp = 28.0; 
const float criticalTemp = 32.0;
char mode = 'A'; // 'A' = Auto, 'O' = Open, 'C' = Close
bool isVentOpen = false;
bool lastVentState = false;

// --- Watchdog Variables ---
unsigned long lastPingTime = 0;
const unsigned long watchdogTimeout = 30000; // 30 seconds

void setup() {
  Serial.begin(9600);
  lcd.begin(16, 2);
  ventServo.attach(servoPin);
  
  pinMode(greenLedPin, OUTPUT);
  pinMode(blueLedPin, OUTPUT);
  pinMode(redLedPin, OUTPUT);
  pinMode(buzzerPin, OUTPUT);
  
  // Initial state
  ventServo.write(0);
  lcd.print("BomaLink Node OS");
  delay(2000);
  lcd.clear();
  lastPingTime = millis(); // Start the watchdog timer
}

// Helper: 10-point moving average to filter LM35 voltage jitter
float getFilteredTemperature() {
  long sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(lm35Pin);
    delay(10); // 100ms total read time
  }
  float avgRaw = sum / 10.0;
  float voltage = (avgRaw / 1024.0) * 5.0;
  return voltage * 100.0;
}

void loop() {
  // 1. Process Incoming Serial Commands from Python
  if (Serial.available() > 0) {
    String incoming = Serial.readStringUntil('\n');
    incoming.trim();
    
    if (incoming == "PING") {
      lastPingTime = millis();
    } else if (incoming == "O") {
      mode = 'O';
    } else if (incoming == "C") {
      mode = 'C';
    } else if (incoming == "A") {
      mode = 'A';
    } else if (incoming.startsWith("T:")) {
      thresholdTemp = incoming.substring(2).toFloat();
    }
  }

  // 2. Watchdog Failsafe
  bool isConnected = (millis() - lastPingTime) < watchdogTimeout;
  if (!isConnected && mode != 'A') {
    mode = 'A'; // Force auto mode if bridge disconnects
  }

  // 3. Read Filtered Sensor Data
  float temperatureC = getFilteredTemperature();

  // 4. Broadcast live data for the dashboard
  Serial.print("TEMP:");
  Serial.println(temperatureC);

  // 5. Evaluate Logic & Control Servo
  if (mode == 'A') {
    isVentOpen = (temperatureC > thresholdTemp);
  } else {
    isVentOpen = (mode == 'O');
  }

  if (isVentOpen) {
    ventServo.write(90);
  } else {
    ventServo.write(0);
  }

  // 6. Hardware ACK: Broadcast state changes to Python
  if (isVentOpen != lastVentState) {
    if (isVentOpen) {
      Serial.println("VENT:OPEN");
    } else {
      Serial.println("VENT:CLOSED");
    }
    lastVentState = isVentOpen;
  }

  // 7. Update LCD
  lcd.setCursor(0, 0);
  lcd.print("Temp: ");
  lcd.print(temperatureC, 1);
  lcd.print(" C   ");

  lcd.setCursor(0, 1);
  if (mode == 'A') lcd.print("Mode: AUTO   ");
  else if (mode == 'O') lcd.print("Mode: O-RIDE ");
  else if (mode == 'C') lcd.print("Mode: C-RIDE ");

  // 8. Visual and Audible Alarms
  digitalWrite(greenLedPin, isConnected ? HIGH : LOW);
  digitalWrite(blueLedPin, isVentOpen ? HIGH : LOW);

  bool isCritical = (temperatureC >= criticalTemp);
  
  if (isCritical || !isConnected) {
    digitalWrite(redLedPin, HIGH);
    // Beep the buzzer
    tone(buzzerPin, 1000);
    delay(200);
    noTone(buzzerPin);
    delay(700); // Pad the rest of the 1-second loop
  } else {
    digitalWrite(redLedPin, LOW);
    noTone(buzzerPin);
    delay(900); // Standard loop padding
  }
}
