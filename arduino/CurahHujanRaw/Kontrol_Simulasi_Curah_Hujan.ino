// ===== Konfigurasi Pin =====
const int RPWM = 18;
const int LPWM = 19;
const int R_EN = 23;
const int L_EN = 22;
const int sensorPin = 32;

// ===== Flowmeter =====
volatile unsigned long pulseCount = 0;
volatile unsigned long lastPulseTime = 0;
float flowRate = 0.0;  // L/min
float volume = 0.0;    // volume per semprotan (liter)
float totalVolume = 0.0;  // total volume keseluruhan (liter)

//Persamaan Regresi Flowmeter
const float a = 0.0245;
const float b = 0.1828;

// ===== Luas area =====
const float luasArea = 1.001;  // luas area dalam meter persegi

// Nilai PID (Perlu di Tuning)
float Kp = 1.5, Ki = 0.5, Kd = 0.1;
float integral = 0, lastError = 0;

// ===== Simulasi Siklus =====
const unsigned long interval = 60000;    // interval OFF = 1 menit
const int maxCycle = 6;                   // jumlah semprotan per jam (6 kali)
unsigned long lastSwitchTime = 0;

bool isRunning = false;
bool userInputReceived = false;
int cycleCount = 0;

// ===== Target Curah Hujan dan volume target per semprotan =====
float SP_Rainfall = 0;      // setpoint curah hujan (mm/jam)
float volumeTarget = 0;     // liter per semprotan

float rainfallActual = 0;   // curah hujan aktual (mm/jam)

// ===== Fungsi interrupt hitung pulse flowmeter =====
void IRAM_ATTR countPulse() {
  unsigned long now = micros();
  if (now - lastPulseTime > 1000) {  // debounce 1ms
    pulseCount++;
    lastPulseTime = now;
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("Masukkan curah hujan (mm/jam), misal 0 - 20:");

  pinMode(RPWM, OUTPUT);
  pinMode(LPWM, OUTPUT);
  pinMode(R_EN, OUTPUT);
  pinMode(L_EN, OUTPUT);
  pinMode(sensorPin, INPUT_PULLUP);

  digitalWrite(R_EN, HIGH);
  digitalWrite(L_EN, HIGH);

  attachInterrupt(digitalPinToInterrupt(sensorPin), countPulse, FALLING);

  analogWrite(RPWM, 0);
  analogWrite(LPWM, 0);
}

void loop() {
  unsigned long now = millis();

  // ===== Baca input Serial =====
  if (Serial.available()) {
    float input = Serial.parseFloat();
    if (input >= 0 && input <= 20) {
      SP_Rainfall = input;
      userInputReceived = true;
      cycleCount = 0;
      totalVolume = 0;

      Serial.print("Set Curah Hujan: ");
      Serial.print(SP_Rainfall);
      Serial.println(" mm/jam");

      // Hitung volume target per semprotan menggunakan luas area
      volumeTarget = (SP_Rainfall * luasArea) / maxCycle;
      Serial.print("Target volume per semprotan: ");
      Serial.print(volumeTarget, 3);
      Serial.println(" L");

      volume = 0;
      pulseCount = 0;
      integral = 0;
      lastError = 0;

      // Langsung nyalakan pompa saat input diterima
      isRunning = true;
      lastSwitchTime = now;

      Serial.println("Pompa langsung dinyalakan.");
    } else {
      Serial.println("Nilai harus 0-20 mm/jam");
    }
    while (Serial.available()) Serial.read(); // Clear buffer
  }

  // ===== Logika pompa ON =====
  if (isRunning) {
    static unsigned long lastRead = 0;
    if (now - lastRead >= 1000) { // baca flowrate tiap 1 detik
      lastRead = now;

      noInterrupts();
      unsigned long count = pulseCount;
      pulseCount = 0;
      interrupts();

      float freq = count;
      flowRate = a * freq + b;
      if (flowRate < 0.2) flowRate = 0;

      volume += flowRate / 60.0;
      totalVolume += flowRate / 60.0;

      // Hitung curah hujan aktual menggunakan luas area
      rainfallActual = totalVolume / luasArea;

      // PID kontrol
      float error = volumeTarget - volume;
      integral += error;
      float derivative = error - lastError;
      float outputPID = Kp * error + Ki * integral + Kd * derivative;
      lastError = error;

      int pwmPercent = constrain((int)(outputPID), 0, 100);
      analogWrite(RPWM, map(pwmPercent, 0, 100, 0, 255));
      analogWrite(LPWM, 0);

      Serial.print("Flowrate: ");
      Serial.print(flowRate, 3);
      Serial.print(" L/min | Volume semprotan: ");
      Serial.print(volume, 3);
      Serial.print(" L | Total volume: ");
      Serial.print(totalVolume, 3);
      Serial.print(" L | Curah Hujan Aktual: ");
      Serial.print(rainfallActual, 3);
      Serial.print(" mm/jam | PWM: ");
      Serial.print(pwmPercent);
      Serial.println(" %");

      // Cek jika volume per semprotan tercapai
      if (volume >= volumeTarget) {
        analogWrite(RPWM, 0);
        analogWrite(LPWM, 0);
        isRunning = false;
        lastSwitchTime = now;
        cycleCount++;
        Serial.print("Semprotan ke-");
        Serial.print(cycleCount);
        Serial.println(" selesai.");
        Serial.print("Volume semprotan: ");
        Serial.print(volume, 3);
        Serial.println(" L\n");
      }
    }
  } 
  // ===== Pompa OFF dan tunggu interval =====
  else {
    if (userInputReceived && (now - lastSwitchTime >= interval) && cycleCount < maxCycle) {
      volume = 0;
      pulseCount = 0;
      integral = 0;
      lastError = 0;

      isRunning = true;
      lastSwitchTime = now;

      Serial.print("Semprotan ke-");
      Serial.print(cycleCount + 1);
      Serial.println(" dimulai.");
    }
  }
}
