#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include "I2Cdev.h"
#include "MPU6050_6Axis_MotionApps20.h"

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

// ----- Kredensial MQTT untuk Channel "Sensor Kemiringan" (ID: 3013750) -----
// Kredensial ini digunakan untuk menghubungkan ESP32 ke ThingSpeak.
const char mqttUserName[] = "EDclAjUSIiYgCykzEyAKKxs";
const char clientID[]     = "EDclAjUSIiYgCykzEyAKKxs";
const char mqttPass[]     = "I+Fad7MFYEWf6szKOWfMOtHq";

// ----- Channel IDs -----
// Channel untuk MENGIRIM data sensor (Pitch, Yaw, Roll) dari alat ini
#define CHANNEL_ID_DATA   3013750
// Channel untuk MENERIMA perintah (Setpoint Kemiringan) dari Web Admin
#define CHANNEL_ID_KONTROL 2963900

// ----- MQTT Topics -----
// Topik untuk SUBSCRIBE: Mendengarkan perintah dari Field 1 di Channel Kontrol Simulator
String mqttSubscribeTopic = "channels/" + String(CHANNEL_ID_KONTROL) + "/subscribe/fields/field1";
// Topik untuk PUBLISH: Mengirim data ke Channel Sensor Kemiringan
String mqttPublishTopic   = "channels/" + String(CHANNEL_ID_DATA) + "/publish";

// Inisialisasi WiFi dan MQTT Client
WiFiClient espClient;
PubSubClient client(espClient);

// =================================================================
//                  KONFIGURASI PIN & PERANGKAT KERAS
// =================================================================

// ----- Pin Motor Driver BTS7960 -----
const int RPWM_PIN = 16; // Pin PWM untuk gerak naik
const int LPWM_PIN = 17; // Pin PWM untuk gerak turun
const int R_EN_PIN = 18; // Pin Enable Kanan
const int L_EN_PIN = 19; // Pin Enable Kiri

// ----- MPU6050 Gyroscope/Accelerometer -----
MPU6050 mpu;
float Yaw, Pitch, Roll;
// Nilai offset ini didapat dari kalibrasi MPU6050 Anda. JANGAN DIUBAH jika sudah sesuai.
int MPUOffsets[6] = {669, 1394, 4109, 163, -22, 25};

// =================================================================
//                VARIABEL GLOBAL UNTUK KONTROL & STATUS
// =================================================================

// ----- Variabel Kontrol Motor -----
int setpoint = 0;           // Target kemiringan (derajat) yang diterima dari MQTT. Default 0.
bool motorActive = false;   // Status apakah motor sedang dalam proses mencapai setpoint.
const int motorSpeedHigh = 245; // Kecepatan motor saat error > 3 derajat
const int motorSpeedLow  = 240; // Kecepatan motor saat error <= 3 derajat
const float tolerance    = 0.5; // Toleransi error (derajat) untuk menghentikan motor

// ----- Timer & Penghitung -----
unsigned long previousMillis = 0;
const long interval = 2000; // Interval pembacaan sensor dan pengiriman data (2 detik)

// =================================================================
//                          FUNGSI SETUP
// =================================================================

void setup() {
  Serial.begin(115200);
  
  // Konfigurasi Pin Motor
  pinMode(RPWM_PIN, OUTPUT);
  pinMode(LPWM_PIN, OUTPUT);
  pinMode(R_EN_PIN, OUTPUT);
  pinMode(L_EN_PIN, OUTPUT);
  digitalWrite(R_EN_PIN, HIGH); // Aktifkan driver
  digitalWrite(L_EN_PIN, HIGH); // Aktifkan driver
  stopMotor(); // Pastikan motor berhenti saat startup

  // Konfigurasi MPU6050
  Wire.begin(22, 21); // Inisialisasi I2C pada pin SDA=22, SCL=21
  Wire.setClock(400000); // Set kecepatan I2C ke 400kHz
  MPU6050Connect();

  // Koneksi Jaringan
  setupWiFi();
  client.setServer(mqttServer, mqttPort);
  client.setCallback(mqtt_callback); // Mengatur fungsi yang akan dipanggil saat ada pesan masuk
}

// =================================================================
//                           LOOP UTAMA
// =================================================================

void loop() {
  // Selalu pastikan koneksi WiFi dan MQTT terjaga
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Koneksi WiFi terputus, mencoba menyambung ulang...");
    setupWiFi();
  }
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop(); // Wajib dipanggil untuk memproses pesan masuk dan menjaga koneksi

  // Logika utama dieksekusi setiap 'interval' (2 detik)
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    // 1. Selalu baca data sensor terbaru
    GetDMP();

    // 2. Tampilkan data di Serial Monitor untuk debugging
    Serial.print("Yaw: "); Serial.print(Yaw, 1);
    Serial.print(" | Pitch: "); Serial.print(Pitch, 1);
    Serial.print(" | Roll: "); Serial.print(Roll, 1);
    Serial.print(" | Setpoint: "); Serial.print(setpoint);
    Serial.print(" | Motor Aktif: "); Serial.println(motorActive);

    // 3. Kontrol motor jika diperlukan (jika motorActive == true)
    kontrolMotor();

    // 4. Selalu kirim data sensor terbaru ke ThingSpeak
    publishMQTT();
  }
}

// =================================================================
//                   FUNGSI KONEKTIVITAS & MQTT
// =================================================================

void setupWiFi() {
  Serial.print("Menghubungkan ke WiFi...");
  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nTerhubung ke WiFi!");
  Serial.print("Alamat IP: ");
  Serial.println(WiFi.localIP());
}

void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Menghubungkan ke MQTT Broker...");
    if (client.connect(clientID, mqttUserName, mqttPass)) {
      Serial.println(" Terhubung!");
      // Subscribe ke topik perintah setelah berhasil terhubung
      client.subscribe(mqttSubscribeTopic.c_str());
      Serial.print("Berhasil subscribe ke: ");
      Serial.println(mqttSubscribeTopic);
    } else {
      Serial.print(" Gagal, rc=");
      Serial.print(client.state());
      Serial.println(" Mencoba lagi dalam 5 detik...");
      delay(5000);
    }
  }
}

/**
 * @brief Fungsi callback yang dipanggil saat ada pesan masuk dari topik MQTT.
 */
void mqtt_callback(char* topic, byte* payload, unsigned int length) {
  payload[length] = '\0'; // Menambahkan null terminator untuk mengubah payload menjadi string
  String message = String((char*)payload);
  Serial.println("--- Pesan MQTT Diterima ---");
  Serial.print("Topik: "); Serial.println(topic);
  Serial.print("Payload: "); Serial.println(message);

  int input = message.toInt();

  // Validasi nilai setpoint yang diterima
  if (input % 5 == 0 && input >= 0 && input <= 50) { // Rentang 0-50 derajat, kelipatan 5
    setpoint = input;
    motorActive = true; // Aktifkan motor untuk mulai bergerak ke setpoint baru
    Serial.print("Setpoint baru diterima: ");
    Serial.print(setpoint);
    Serial.println(" derajat. Motor diaktifkan.");
    Serial.println("---------------------------");
  } else {
    Serial.print("Setpoint tidak valid atau di luar rentang: ");
    Serial.println(input);
    Serial.println("---------------------------");
  }
}

/**
 * @brief Mempublikasikan data Pitch, Yaw, dan Roll ke ThingSpeak.
 */
void publishMQTT() {
  // Pastikan nilai Pitch valid sebelum mengirim
  if (Pitch < -90 || Pitch > 90) {
    Serial.println("Nilai Pitch tidak wajar, pengiriman dibatalkan.");
    return;
  }

  // ⭐ PERBAIKAN: Membuat payload untuk 3 field sekaligus
  String payload = "field1=" + String(Pitch, 2) + "&field2=" + String(Yaw, 2) + "&field3=" + String(Roll, 2);

  Serial.print("Mengirim data ke ThingSpeak: ");
  Serial.println(payload);

  if (client.publish(mqttPublishTopic.c_str(), payload.c_str())) {
    Serial.println("-> Data berhasil dikirim!");
  } else {
    Serial.println("-> Gagal mengirim data MQTT!");
  }
}

// =================================================================
//                      FUNGSI SENSOR & MOTOR
// =================================================================

/**
 * @brief Menginisialisasi sensor MPU6050 dan Digital Motion Processor (DMP).
 */
void MPU6050Connect() {
  mpu.initialize();
  if (!mpu.testConnection()) {
    Serial.println("Koneksi MPU6050 gagal!");
    while(1); // Hentikan program jika MPU tidak terdeteksi
  }
  
  uint8_t devStatus = mpu.dmpInitialize();
  if (devStatus != 0) {
    Serial.print("Inisialisasi DMP gagal! Kode error: ");
    Serial.println(devStatus);
    while (1);
  }

  // Terapkan offset yang sudah dikalibrasi
  mpu.setXAccelOffset(MPUOffsets[0]);
  mpu.setYAccelOffset(MPUOffsets[1]);
  mpu.setZAccelOffset(MPUOffsets[2]);
  mpu.setXGyroOffset(MPUOffsets[3]);
  mpu.setYGyroOffset(MPUOffsets[4]);
  mpu.setZGyroOffset(MPUOffsets[5]);

  mpu.setDMPEnabled(true);
  Serial.println("MPU6050 DMP berhasil diinisialisasi!");
}

/**
 * @brief Membaca data Yaw, Pitch, dan Roll dari MPU6050.
 */
void GetDMP() {
  if (mpu.dmpGetCurrentFIFOPacket(mpu.dmpGetFIFOPacketSize())) {
    Quaternion q;
    VectorFloat gravity;
    float ypr[3];
    
    mpu.dmpGetQuaternion(&q, mpu.dmpGetFIFOPacketSize());
    mpu.dmpGetGravity(&gravity, &q);
    mpu.dmpGetYawPitchRoll(ypr, &q, &gravity);

    // Konversi dari radian ke derajat
    Yaw = ypr[0] * 180.0 / M_PI;
    Pitch = ypr[1] * 180.0 / M_PI;
    Roll = ypr[2] * 180.0 / M_PI;
  }
}

/**
 * @brief Logika utama untuk mengontrol pergerakan motor berdasarkan setpoint.
 */
void kontrolMotor() {
  if (!motorActive) {
    return; // Jangan lakukan apa-apa jika motor tidak seharusnya aktif
  }
  
  float error = setpoint - Pitch;
  
  // Cek apakah posisi sudah dalam rentang toleransi
  if (abs(error) <= tolerance) {
    stopMotor();
    Serial.println("✅ Setpoint tercapai! Motor dinonaktifkan.");
    motorActive = false; // Nonaktifkan motor setelah target tercapai
  } 
  // Jika target di atas posisi sekarang, gerak naik
  else if (error > 0) {
    moveUp();
  } 
  // Jika target di bawah posisi sekarang, gerak turun
  else {
    moveDown();
  }
}

/**
 * @brief Menggerakkan motor ke atas (menaikkan kemiringan).
 */
void moveUp() {
  int speed = (abs(setpoint - Pitch) > 3) ? motorSpeedHigh : motorSpeedLow;
  analogWrite(RPWM_PIN, speed);
  analogWrite(LPWM_PIN, 0);
  Serial.print("-> Bergerak NAIK, Kecepatan: ");
  Serial.println(speed);
}

/**
 * @brief Menggerakkan motor ke bawah (menurunkan kemiringan).
 */
void moveDown() {
  int speed = (abs(setpoint - Pitch) > 3) ? motorSpeedHigh : motorSpeedLow;
  analogWrite(RPWM_PIN, 0);
  analogWrite(LPWM_PIN, speed);
  Serial.print("-> Bergerak TURUN, Kecepatan: ");
  Serial.println(speed);
}

/**
 * @brief Menghentikan motor.
 */
void stopMotor() {
  analogWrite(RPWM_PIN, 0);
  analogWrite(LPWM_PIN, 0);
}
