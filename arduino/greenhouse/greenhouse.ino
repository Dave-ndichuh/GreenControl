#include <LiquidCrystal.h>
#include <Servo.h>
#include <IRremote.h> // Requires IRremote library

// --- Pin Definitions ---
LiquidCrystal lcd(12, 11, 5, 4, 3, 2);
Servo ventServo;

const int lm35Pin = A0;
const int irReceiverPin = A1; // IR sensor input
const int servoPin = 9;
const int greenLedPin = 6;
const int blueLedPin = 7;
const int redLedPin = 8;
const int buzzerPin = 10;

// --- State Variables ---
float thresholdTemp = 28.0; 
const float criticalTemp = 32.0;
char mode = 'A'; 
bool isVentOpen = false;
bool lastVentState = false;

// --- Watchdog Variables ---
unsigned long lastPingTime = 0;
const unsigned long watchdogTimeout = 30000;

void setup() {
  Serial.begin(9600);
  lcd.begin(16, 2);
  ventServo.attach(servoPin);
  
  pinMode(greenLedPin, OUTPUT);
  pinMode(blueLedPin, OUTPUT);
  pinMode(redLedPin, OUTPUT);
  pinMode(buzzerPin, OUTPUT);
  
  // Initialize IR Receiver
  IrReceiver.begin(irReceiverPin, ENABLE_LED_FEEDBACK);
  
  ventServo.write(0);
  lcd.print("BomaLink Node OS");
  delay(2000);
  lcd.clear();
  lastPingTime = millis();
}

float getFilteredTemperature() {
  long sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(lm35Pin);
    delay(10);
  }
  float avgRaw = sum / 10.0;
  float voltage = (avgRaw / 1024.0) * 5.0;
  return voltage * 100.0;
}

// Helper: Sync mode back to Python/Firebase
void updateModeLocally(char newMode) {
  if (mode != newMode) {
    mode = newMode;
    Serial.print("SYNC_MODE:");
    Serial.println(mode);
    
    // Quick beep for physical confirmation
    tone(buzzerPin, 2000);
    delay(100);
    noTone(buzzerPin);
  }
}

void loop() {
  // 1. Process IR Remote Commands
  if (IrReceiver.decode()) {
    // Print the received code so the user can see what their remote is sending
    Serial.print("IR_CODE:");
    Serial.println(IrReceiver.decodedIRData.command, HEX);

    // These command hex values match standard starter kit remotes (NEC protocol)
    // 0x45 = Button 1, 0x46 = Button 2, 0x47 = Button 3
    switch (IrReceiver.decodedIRData.command) {
      case 0x45: updateModeLocally('A'); break;
      case 0x46: updateModeLocally('O'); break;
      case 0x47: updateModeLocally('C'); break;
    }
    IrReceiver.resume(); // Ready for next button press
  }

  // 2. Process Incoming Serial Commands from Python
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

  // 3. Watchdog Failsafe
  bool isConnected = (millis() - lastPingTime) < watchdogTimeout;
  if (!isConnected && mode != 'A') {
    updateModeLocally('A'); 
  }

  // 4. Read Sensor & Broadcast Live Data
  float temperatureC = getFilteredTemperature();
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

  // 6. Hardware ACK
  if (isVentOpen != lastVentState) {
    if (isVentOpen) Serial.println("VENT:OPEN");
    else Serial.println("VENT:CLOSED");
    lastVentState = isVentOpen;
  }

  // 7. Update LCD
  lcd.setCursor(0, 0);
  lcd.print("Temp: ");
  lcd.print(temperatureC, 1);
  lcd.print(" C   ");

  lcd.setCursor(0, 1);
  if (!isConnected) {
    lcd.print("SYS: OFFLINE ");
  } else if (mode == 'A') {
    lcd.print("Mode: AUTO   ");
  } else if (mode == 'O') {
    lcd.print("Mode: O-RIDE ");
  } else if (mode == 'C') {
    lcd.print("Mode: C-RIDE ");
  }

  // 8. Alarms
  digitalWrite(greenLedPin, isConnected ? HIGH : LOW);
  digitalWrite(blueLedPin, isVentOpen ? HIGH : LOW);

  if (temperatureC >= criticalTemp || !isConnected) {
    digitalWrite(redLedPin, HIGH);
    tone(buzzerPin, 1000);
    delay(200);
    noTone(buzzerPin);
    delay(700); 
  } else {
    digitalWrite(redLedPin, LOW);
    noTone(buzzerPin);
    delay(900); 
  }
}
