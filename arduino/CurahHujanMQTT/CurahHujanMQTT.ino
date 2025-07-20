#include <WiFi.h>
#include <PubSubClient.h>

// =================================================================
//                    KONFIGURASI JARINGAN & MQTT
// =================================================================

// ----- WiFi Credentials -----
// Ganti dengan SSID dan Password WiFi Anda
const char ssid[] = "Reee";
const char pass[] = "Reeee1234";

// ----- MQTT Broker & Port -----
const char* mqttServer = "mqtt3.thingspeak.com";
const int mqttPort = 1883;

// ----- Kredensial MQTT untuk Channel "Curah Hujan" (ID: 3013754) -----
// Kredensial ini digunakan untuk menghubungkan ESP32 ke ThingSpeak.
const char mqttUserName[] = "EzsUBSsTGRYEOgo3ADMPPAc";
const char clientID[] = "EzsUBSsTGRYEOgo3ADMPPAc";
const char mqttPass[] = "HiRIPd9Cx3JRlwezOsd+HDuN";

// ----- Channel IDs -----
// Channel untuk menerima perintah (Setpoint Curah Hujan) dari Web Admin
#define CHANNEL_ID_INPUT_SP_RAINFALL 2963900 
// Channel untuk mengirim data aktual hasil pengukuran curah hujan dari alat ini
#define CHANNEL_ID_OUTPUT_RAINFALL_ACTUAL 3013754 

// ----- MQTT Topics -----
// Topik untuk SUBSCRIBE: Mendengarkan perintah dari Field 2 di Channel Kontrol Simulator
String mqttSubscribeTopic = "channels/" + String(CHANNEL_ID_INPUT_SP_RAINFALL) + "/subscribe/fields/field2";
// Topik untuk PUBLISH: Mengirim data ke Channel Curah Hujan
String mqttPublishTopic = "channels/" + String(CHANNEL_ID_OUTPUT_RAINFALL_ACTUAL) + "/publish";

// Inisialisasi WiFi dan MQTT Client
WiFiClient espClient;
PubSubClient client(espClient);

// =================================================================
//                  KONFIGURASI PIN & KONTROL POMPA
// =================================================================

// ----- Pin Motor Driver -----
const int RPWM_PIN = 18; // Pin PWM Kanan (Maju)
const int LPWM_PIN = 19; // Pin PWM Kiri (Mundur, tidak digunakan)
const int R_EN_PIN = 23; // Pin Enable Kanan
const int L_EN_PIN = 22; // Pin Enable Kiri

// ----- Pin Sensor Aliran Air (Flowmeter) -----
const int sensorPin = 32;

// =================================================================
//                VARIABEL GLOBAL UNTUK PENGUKURAN & KONTROL
// =================================================================

// ----- Variabel Flowmeter -----
volatile unsigned long pulseCount = 0;
volatile unsigned long lastPulseTime = 0;
float flowRate = 0.0;       // Laju aliran (L/min)
float volume = 0.0;         // Volume dalam satu siklus (L)
float totalVolume = 0.0;    // Akumulasi volume dari semua siklus (L)

// Koefisien kalibrasi sensor aliran (didapat dari eksperimen)
const float a_flow = 0.00001701;
const float b_flow = 0.02554036;
const float c_flow = 0.09168697;

// Luas area yang disiram (m^2) untuk konversi Volume ke Curah Hujan
const float luasArea = 1.073; 

// ----- Variabel Kontroler PID -----
float Kp = 3.37, Ki = 0, Kd = 0.1;
float integral = 0, lastError = 0;
float pwmActual = 70.0; // Nilai awal PWM

// ----- Variabel Logika Siklus Penyiraman -----
const int maxCycle = 6;
unsigned long cycleInterval[maxCycle];
unsigned long programStartTime = 0;
unsigned long cycleStartTime = 0;
int cycleCount = 0;
bool cycleStarted = false;
bool isRunning = false;
bool userInputReceived = false; // Flag penanda perintah baru diterima

// ----- Variabel Status & Data -----
float SP_Rainfall = 0;      // Setpoint curah hujan dari pengguna (mm/jam)
float volumeTarget = 0;     // Target total volume air (L)
float volumePerCycle = 0;   // Target volume per siklus (L)
float rainfallActual = 0;   // Curah hujan aktual yang terukur (mm/jam)
int dataSentCount = 0;      // Penghitung jumlah data yang berhasil dikirim

// Timer untuk publikasi data MQTT
unsigned long previousMillisMQTT = 0;
const unsigned long intervalMQTT = 30000; // Kirim data setiap 30 detik

// =================================================================
//                    FUNGSI-FUNGSI UTAMA
// =================================================================

/**
 * @brief Interrupt Service Routine (ISR) untuk menghitung pulsa dari flowmeter.
 * Dijalankan setiap kali ada sinyal jatuh (FALLING edge) dari sensor.
 */
void IRAM_ATTR countPulse() {
  unsigned long now = micros();
  // Debouncing sederhana untuk menghindari pulsa ganda
  if (now - lastPulseTime > 1000) {
    pulseCount++;
    lastPulseTime = now;
  }
}

/**
 * @brief Menghubungkan ESP32 ke jaringan WiFi.
 */
void setupWiFi() {
  Serial.println();
  Serial.print("Menghubungkan ke WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, pass);
  int wifi_retries = 0;
  while (WiFi.status() != WL_CONNECTED && wifi_retries < 30) {
    delay(500);
    Serial.print(".");
    wifi_retries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi terhubung!");
    Serial.print("Alamat IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nKoneksi WiFi gagal. Periksa kredensial/jaringan.");
  }
}

/**
 * @brief Fungsi callback yang dipanggil saat ada pesan masuk dari topik MQTT yang di-subscribe.
 * @param topic Topik dari pesan yang masuk.
 * @param payload Isi pesan (data).
 * @param length Panjang isi pesan.
 */
void callback_mqtt(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  
  float input = msg.toFloat();
  
  // Validasi input dari pengguna
  if (input >= 0 && input <= 20) {
    SP_Rainfall = input;
    volumeTarget = SP_Rainfall * luasArea;
    volumePerCycle = volumeTarget / maxCycle;
    
    // Reset semua variabel status untuk memulai simulasi baru
    totalVolume = 0;
    rainfallActual = 0;
    cycleCount = 0;
    programStartTime = millis();
    userInputReceived = true;
    isRunning = false;
    cycleStarted = false;
    dataSentCount = 0;
    
    Serial.println("==============================");
    Serial.print("PERINTAH BARU DITERIMA");
    Serial.print("Curah hujan diset: ");
    Serial.print(SP_Rainfall, 2);
    Serial.println(" mm/jam");
    Serial.print("Target volume total: ");
    Serial.print(volumeTarget, 3);
    Serial.print(" L (");
    Serial.print(volumePerCycle, 3);
    Serial.println(" L per siklus)");
    Serial.println("==============================");
  } else {
    Serial.print("Input tidak valid diterima: ");
    Serial.println(input);
  }
}

/**
 * @brief Menghubungkan kembali ke broker MQTT jika koneksi terputus.
 */
void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Mencoba koneksi MQTT...");
    if (client.connect(clientID, mqttUserName, mqttPass)) {
      Serial.println("terhubung!");
      // Subscribe ke topik setelah berhasil terhubung
      client.subscribe(mqttSubscribeTopic.c_str());
      Serial.print("Subscribe ke topik: ");
      Serial.println(mqttSubscribeTopic);
    } else {
      Serial.print("gagal, rc=");
      Serial.print(client.state());
      Serial.println(" coba lagi dalam 5 detik");
      delay(5000);
    }
  }
}

/**
 * @brief Mempublikasikan data curah hujan aktual ke ThingSpeak.
 */
void publishRainfallActual() {
  String payload = "field1=" + String(rainfallActual, 3);
  Serial.print("Mengirim data ke ThingSpeak: ");
  Serial.println(payload);
  
  if (client.publish(mqttPublishTopic.c_str(), payload.c_str())) {
    dataSentCount++;
    Serial.println("Data berhasil dikirim.");
  } else {
    Serial.println("Gagal mengirim data.");
  }
}

// =================================================================
//                          SETUP UTAMA
// =================================================================
void setup() {
  Serial.begin(115200);
  
  // Konfigurasi pin motor driver
  pinMode(RPWM_PIN, OUTPUT);
  pinMode(LPWM_PIN, OUTPUT);
  pinMode(R_EN_PIN, OUTPUT);
  pinMode(L_EN_PIN, OUTPUT);
  
  // Konfigurasi pin sensor dan interrupt
  pinMode(sensorPin, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(sensorPin), countPulse, FALLING);
  
  // Set kondisi awal motor driver (mati)
  digitalWrite(R_EN_PIN, HIGH);
  digitalWrite(L_EN_PIN, HIGH);
  analogWrite(RPWM_PIN, 0);
  analogWrite(LPWM_PIN, 0);

  // Mengatur jadwal interval untuk setiap siklus (0, 10, 20, 30, 40, 50 menit)
  for (int i = 0; i < maxCycle; i++) {
    cycleInterval[i] = (i * 10UL * 60 * 1000) + 1000; // +1 detik untuk buffer
  }

  setupWiFi();
  client.setServer(mqttServer, mqttPort);
  client.setCallback(callback_mqtt);
}

// =================================================================
//                           LOOP UTAMA
// =================================================================
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    setupWiFi(); // Coba hubungkan kembali jika WiFi terputus
  }
  if (!client.connected()) {
    reconnectMQTT(); // Coba hubungkan kembali jika MQTT terputus
  }
  client.loop(); // Penting untuk menjaga koneksi MQTT dan memproses pesan masuk

  unsigned long now = millis();

  // Kirim data secara periodik jika simulasi sedang berjalan
  if (now - previousMillisMQTT >= intervalMQTT && userInputReceived && cycleCount < maxCycle) {
    previousMillisMQTT = now;
    publishRainfallActual();
  }

  // Jika tidak ada perintah atau semua siklus sudah selesai, hentikan proses
  if (!userInputReceived || cycleCount >= maxCycle) {
    if (userInputReceived && cycleCount >= maxCycle) {
      Serial.println("==============================");
      Serial.println("Semua siklus selesai.");
      Serial.print("Jumlah data yang dikirim: ");
      Serial.println(dataSentCount);
      Serial.println("==============================");
      userInputReceived = false; // Reset flag agar loop berhenti
    }
    return;
  }

  unsigned long elapsedTime = now - programStartTime;

  // Cek apakah sudah waktunya memulai siklus berikutnya
  if (!cycleStarted && elapsedTime >= cycleInterval[cycleCount]) {
    // Reset variabel untuk siklus baru
    volume = 0;
    pulseCount = 0;
    integral = 0;
    lastError = 0;
    pwmActual = 70; // Reset PWM ke nilai awal
    cycleStartTime = now;
    isRunning = true;
    cycleStarted = true;
    
    // Hidupkan pompa
    digitalWrite(R_EN_PIN, HIGH);
    digitalWrite(L_EN_PIN, HIGH);
    analogWrite(RPWM_PIN, map((int)pwmActual, 0, 100, 0, 255));
    analogWrite(LPWM_PIN, 0);
    
    Serial.print("▶️  Mulai siklus ke-");
    Serial.println(cycleCount + 1);
  }

  // Logika kontrol PID dijalankan setiap 200ms saat pompa menyala
  static unsigned long lastPIDUpdate = 0;
  if (isRunning && now - lastPIDUpdate >= 200) {
    lastPIDUpdate = now;

    // Ambil jumlah pulsa dengan aman (non-blocking interrupt)
    noInterrupts();
    unsigned long count = pulseCount;
    pulseCount = 0;
    interrupts();

    // Hitung laju aliran dan volume
    float freq = count * 5.0; // 1 / (200ms / 1000ms) = 5
    flowRate = a_flow * freq * freq + b_flow * freq + c_flow;
    if (flowRate < 0.2) flowRate = 0; // Filter noise

    volume += flowRate / 300.0; // (L/min) / (60s/min * 5Hz) = L
    totalVolume += flowRate / 300.0;
    rainfallActual = totalVolume / luasArea;

    // Perhitungan PID
    float error = 2.0 - flowRate; // Target laju aliran 2.0 L/min
    integral += error * 0.2;
    float derivative = (error - lastError) / 0.2;
    lastError = error;
    float output = Kp * error + Ki * integral + Kd * derivative;
    
    // Update dan batasi nilai PWM
    pwmActual += output;
    pwmActual = constrain(pwmActual, 0, 100);
    int pwmVal = map((int)pwmActual, 0, 100, 0, 255);
    if (pwmVal > 0 && pwmVal < 70) pwmVal = 70; // Batas bawah PWM agar pompa berputar

    // Terapkan nilai PWM baru ke motor
    analogWrite(RPWM_PIN, pwmVal);
    analogWrite(LPWM_PIN, 0);

    // Tampilkan data telemetri ke Serial Monitor
    Serial.print("t="); Serial.print((now - cycleStartTime) / 1000.0, 2); Serial.print("s | ");
    Serial.print("f="); Serial.print(freq, 1); Serial.print(" Hz | ");
    Serial.print("Q="); Serial.print(flowRate, 3); Serial.print(" L/min | ");
    Serial.print("e="); Serial.print(error, 3); Serial.print(" | ");
    Serial.print("v="); Serial.print(volume, 3); Serial.print(" L | ");
    Serial.print("r="); Serial.print(rainfallActual, 3); Serial.print(" mm/j | ");
    Serial.print("PWM="); Serial.println(pwmActual, 1);

    // Cek apakah target volume untuk siklus ini sudah tercapai
    if (volume >= volumePerCycle - 0.01) {
      // Matikan pompa
      analogWrite(RPWM_PIN, 0);
      analogWrite(LPWM_PIN, 0);
      digitalWrite(R_EN_PIN, LOW);
      digitalWrite(L_EN_PIN, LOW);
      isRunning = false;
      cycleStarted = false;
      
      Serial.print("✅ Siklus ke-");
      Serial.print(cycleCount + 1);
      Serial.print(" selesai. Volume tercapai: ");
      Serial.print(volume, 3);
      Serial.println(" L");
      
      cycleCount++;
    }
  }
}
