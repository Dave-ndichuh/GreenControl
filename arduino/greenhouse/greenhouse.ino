#include <LiquidCrystal.h>
#include <Servo.h>
#include <IRremote.h>
#include <DHT.h>

// --- Pin Definitions ---
LiquidCrystal lcd(12, 11, 5, 4, 3, 2);
Servo ventServo;

const int lm35Pin = A0;
const int irReceiverPin = A1;
const int dhtPin = A2;
const int servoPin = 9;
const int greenLedPin = 6;
const int blueLedPin = 7;
const int redLedPin = 8;
const int buzzerPin = 10;

#define DHTTYPE DHT11
DHT dht(dhtPin, DHTTYPE);

// --- State Variables ---
float thresholdTemp = 28.0; 
const float criticalTemp = 32.0;
char mode = 'A'; 
bool isVentOpen = false;
bool lastVentState = false;

// --- Sensor Values ---
float tempLM35 = 0.0;
float tempDHT = 0.0;
float humDHT = 0.0;

// --- Timers ---
unsigned long lastPingTime = 0;
unsigned long lastDHTReadTime = 0;
const unsigned long watchdogTimeout = 30000;

void setup() {
  Serial.begin(9600);
  lcd.begin(16, 2);
  ventServo.attach(servoPin);
  
  pinMode(greenLedPin, OUTPUT);
  pinMode(blueLedPin, OUTPUT);
  pinMode(redLedPin, OUTPUT);
  pinMode(buzzerPin, OUTPUT);
  
  IrReceiver.begin(irReceiverPin, ENABLE_LED_FEEDBACK);
  dht.begin();
  
  ventServo.write(0);
  lcd.print("BomaLink Node OS");
  delay(2000);
  lcd.clear();
  lastPingTime = millis();
}

// 10-sample moving average for LM35
float readLM35() {
  long sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(lm35Pin);
    delay(5);
  }
  float avgRaw = sum / 10.0;
  float voltage = (avgRaw / 1024.0) * 5.0;
  return voltage * 100.0;
}

// Custom beep to avoid Timer conflict with IRremote library
void customBeep(int frequency, int durationMs) {
  long periodUs = 1000000L / frequency;
  long halfPeriodUs = periodUs / 2;
  long cycles = (durationMs * 1000L) / periodUs;
  for (long i = 0; i < cycles; i++) {
    digitalWrite(buzzerPin, HIGH);
    delayMicroseconds(halfPeriodUs);
    digitalWrite(buzzerPin, LOW);
    delayMicroseconds(halfPeriodUs);
  }
}

void updateModeLocally(char newMode) {
  if (mode != newMode) {
    mode = newMode;
    Serial.print("SYNC_MODE:");
    Serial.println(mode);
    customBeep(2000, 100);
  }
}

void loop() {
  // 1. Process IR Remote Commands
  if (IrReceiver.decode()) {
    Serial.print("IR_CODE:");
    Serial.println(IrReceiver.decodedIRData.command, HEX);
    
    // Custom mapped IR codes for the user's remote
    switch (IrReceiver.decodedIRData.command) {
      case 0x0C: updateModeLocally('A'); break;
      case 0x18: updateModeLocally('O'); break;
      case 0x5E: updateModeLocally('C'); break;
    }
    IrReceiver.resume(); 
  }

  // 2. Process Incoming Serial Commands
  if (Serial.available() > 0) {
    String incoming = Serial.readStringUntil('\n');
    incoming.trim();
    
    if (incoming == "PING") lastPingTime = millis();
    else if (incoming == "O") mode = 'O';
    else if (incoming == "C") mode = 'C';
    else if (incoming == "A") mode = 'A';
    else if (incoming.startsWith("T:")) thresholdTemp = incoming.substring(2).toFloat();
  }

  // 3. Watchdog Failsafe
  bool isConnected = (millis() - lastPingTime) < watchdogTimeout;
  if (!isConnected && mode != 'A') {
    updateModeLocally('A'); 
  }

  // 4. Read Sensors
  tempLM35 = readLM35();

  if (millis() - lastDHTReadTime >= 2000) {
    float h = dht.readHumidity();
    float t = dht.readTemperature();
    if (!isnan(h) && !isnan(t)) {
      tempDHT = t;
      humDHT = h;
    }
    lastDHTReadTime = millis();
  }

  // 5. Broadcast to Python Serial Bridge
  Serial.print("TEMP_LM35:"); Serial.println(tempLM35, 1);
  Serial.print("TEMP_DHT:");  Serial.println(tempDHT, 1);
  Serial.print("HUM:");       Serial.println(humDHT, 1);

  // 6. Automated Control Logic
  float activeTemp = (tempLM35 > 0.0) ? tempLM35 : tempDHT;

  if (mode == 'A') {
    isVentOpen = (activeTemp > thresholdTemp);
  } else {
    isVentOpen = (mode == 'O');
  }

  static bool isVentMoving = false;
  static unsigned long ventMoveStartTime = 0;

  if (isVentOpen != lastVentState) {
    isVentMoving = true;
    ventMoveStartTime = millis();
    if (isVentOpen) {
      ventServo.write(90);
      Serial.println("VENT:OPEN");
    } else {
      ventServo.write(0);
      Serial.println("VENT:CLOSED");
    }
    lastVentState = isVentOpen;
  }

  if (isVentMoving && (millis() - ventMoveStartTime > 1000)) {
    isVentMoving = false;
  }

  // 8. LCD Display
  lcd.setCursor(0, 0);
  lcd.print("L:");
  lcd.print(tempLM35, 1);
  lcd.print("C D:");
  lcd.print(tempDHT, 1);
  lcd.print("C ");

  lcd.setCursor(0, 1);
  lcd.print("H:");
  lcd.print((int)humDHT);
  lcd.print("% ");
  if (!isConnected) lcd.print("M:OFFLN  ");
  else if (mode == 'A') lcd.print("M:AUTO   ");
  else if (mode == 'O') lcd.print("M:O-RIDE ");
  else if (mode == 'C') lcd.print("M:C-RIDE ");

  // 9. Alarms & LEDs
  digitalWrite(greenLedPin, isConnected ? HIGH : LOW);
  digitalWrite(blueLedPin, isVentOpen ? HIGH : LOW);

  bool isAlarming = (activeTemp >= criticalTemp || !isConnected);
  if (isAlarming) {
    digitalWrite(redLedPin, HIGH);
    customBeep(1000, 200);
    delay(700); 
  } else {
    digitalWrite(redLedPin, LOW);
    delay(900); 
  }

  // 10. Estimate Power Draw (Digital Twin)
  int current_mA = 45 + 20 + 2; // Base + LCD + DHT/LM35
  if (isConnected) current_mA += 15;
  if (isVentOpen) current_mA += 15;
  if (isAlarming) current_mA += 45;
  
  if (isVentMoving) current_mA += 200;
  else current_mA += 10;

  int powerMW = current_mA * 5;
  Serial.print("PWR:");
  Serial.println(powerMW);
}
