#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include "I2Cdev.h"
#include "MPU6050_6Axis_MotionApps20.h"

// =================================================================
//                      KONFIGURASI JARINGAN & MQTT
// =================================================================

// ----- WiFi Credentials -----
const char ssid[] = "Reee";
const char pass[] = "Reeee1234";

// ----- MQTT Broker & Port -----
const char* mqttServer = "mqtt3.thingspeak.com";
const int mqttPort = 1883;

// ----- Channel IDs -----
#define CHANNEL_ID_DATA    3013750 // Channel untuk MENGIRIM data sensor
#define CHANNEL_ID_KONTROL 2963900 // Channel untuk MENERIMA perintah

// ----- Kredensial & Klien untuk PUBLISH (Channel Data: 3013750) -----
const char mqttUserName_pub[] = "EDclAjUSIiYgCykzEyAKKxs";
const char clientID_pub[]     = "EDclAjUSIiYgCykzEyAKKxs"; // ID harus unik
const char mqttPass_pub[]     = "I+Fad7MFYEWf6szKOWfMOtHq";
String mqttPublishTopic       = "channels/" + String(CHANNEL_ID_DATA) + "/publish";
WiFiClient espClient_pub;
PubSubClient client_pub(espClient_pub);

// ----- Kredensial & Klien untuk SUBSCRIBE (Channel Kontrol: 2963900) -----
const char mqttUserName_sub[] = "ICMHJyYYIRkrNgMVGDUcARM";
const char clientID_sub[]     = "ICMHJyYYIRkrNgMVGDUcARM"; // ID harus unik
const char mqttPass_sub[]     = "kDU0XPSGjMb7Un3USw59j5Fu";
String subTopicField1 = "channels/" + String(CHANNEL_ID_KONTROL) + "/subscribe/fields/field1"; // Topik untuk DerajatKemiringan
WiFiClient espClient_sub;
PubSubClient client_sub(espClient_sub);

// =================================================================
//                      KONFIGURASI PIN & PERANGKAT KERAS
// =================================================================

const int RPWM_PIN = 16;
const int LPWM_PIN = 17;
const int R_EN_PIN = 18;
const int L_EN_PIN = 19;

MPU6050 mpu;
float Yaw, Pitch, Roll;
int MPUOffsets[6] = {669, 1394, 4109, 163, -22, 25};

// =================================================================
//                VARIABEL GLOBAL UNTUK KONTROL & STATUS
// =================================================================

int setpoint = 0;
bool motorActive = false;
const int motorSpeedHigh = 245;
const int motorSpeedLow  = 240;
const float tolerance    = 0.5;

unsigned long previousMillis = 0;
const long interval = 2000;

// Deklarasi fungsi agar bisa dipanggil sebelum definisinya
void mqtt_callback(char* topic, byte* payload, unsigned int length);
void reconnectPublishClient();
void reconnectSubscribeClient();
void stopMotor();

// =================================================================
//                                FUNGSI SETUP
// =================================================================

void setup() {
  Serial.begin(115200);
  
  pinMode(RPWM_PIN, OUTPUT);
  pinMode(LPWM_PIN, OUTPUT);
  pinMode(R_EN_PIN, OUTPUT);
  pinMode(L_EN_PIN, OUTPUT);
  digitalWrite(R_EN_PIN, HIGH);
  digitalWrite(L_EN_PIN, HIGH);
  stopMotor();

  Wire.begin(22, 21);
  Wire.setClock(400000);
  MPU6050Connect();

  setupWiFi();
  
  // Konfigurasi Klien PUBLISH
  client_pub.setServer(mqttServer, mqttPort);

  // Konfigurasi Klien SUBSCRIBE
  client_sub.setServer(mqttServer, mqttPort);
  client_sub.setCallback(mqtt_callback); // Callback hanya untuk subscriber
}

// =================================================================
//                                LOOP UTAMA
// =================================================================

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Koneksi WiFi terputus, mencoba menyambung ulang...");
    setupWiFi();
  }

  // Jaga koneksi untuk kedua klien
  if (!client_pub.connected()) {
    reconnectPublishClient();
  }
  if (!client_sub.connected()) {
    reconnectSubscribeClient();
  }
  
  // Jalankan loop untuk kedua klien
  client_pub.loop();
  client_sub.loop();

  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    GetDMP();

    Serial.println("--- STATUS SAAT INI ---");
    Serial.print("Yaw: "); Serial.print(Yaw, 1);
    Serial.print(" | Pitch: "); Serial.print(Pitch, 1);
    Serial.print(" | Roll: "); Serial.println(Roll, 1);
    Serial.print("Setpoint Kemiringan: "); Serial.print(setpoint);
    Serial.print(" | Motor Aktif: "); Serial.println(motorActive);
    Serial.println("-----------------------");

    kontrolMotor();
    publishMQTT();
  }
}

// =================================================================
//                      FUNGSI KONEKTIVITAS & MQTT
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

void reconnectPublishClient() {
  while (!client_pub.connected()) {
    Serial.print("Menghubungkan Klien PUBLISH ke MQTT...");
    if (client_pub.connect(clientID_pub, mqttUserName_pub, mqttPass_pub)) {
      Serial.println(" Terhubung!");
    } else {
      Serial.print(" Gagal, rc=");
      Serial.print(client_pub.state());
      Serial.println(" Mencoba lagi dalam 5 detik...");
      delay(5000);
    }
  }
}

void reconnectSubscribeClient() {
    while (!client_sub.connected()) {
    Serial.print("Menghubungkan Klien SUBSCRIBE ke MQTT...");
    if (client_sub.connect(clientID_sub, mqttUserName_sub, mqttPass_sub)) {
      Serial.println(" Terhubung!");
      // Subscribe hanya ke topik field 1 setelah berhasil terhubung
      client_sub.subscribe(subTopicField1.c_str());
      Serial.print("Berhasil subscribe ke topik: ");
      Serial.println(subTopicField1);
    } else {
      Serial.print(" Gagal, rc=");
      Serial.print(client_sub.state());
      Serial.println(" Mencoba lagi dalam 5 detik...");
      delay(5000);
    }
  }
}

void mqtt_callback(char* topic, byte* payload, unsigned int length) {
  payload[length] = '\0';
  String message = String((char*)payload);
  String topicStr = String(topic);

  Serial.println("--- Pesan MQTT Diterima ---");
  Serial.print("Topik: "); Serial.println(topicStr);
  Serial.print("Payload: "); Serial.println(message);

  if (topicStr.equals(subTopicField1)) {
    int input = message.toInt();
    if (input % 5 == 0 && input >= 0 && input <= 50) {
      setpoint = input;
      motorActive = true;
      Serial.print("-> Setpoint kemiringan baru diterima: "); Serial.println(setpoint);
    } else {
      Serial.print("-> Setpoint kemiringan tidak valid: "); Serial.println(input);
    }
  } 
  
  Serial.println("---------------------------");
}

void publishMQTT() {
  if (isnan(Pitch) || Pitch < -90 || Pitch > 90) {
    Serial.println("Nilai Pitch tidak wajar, pengiriman dibatalkan.");
    return;
  }
  if (!client_pub.connected()) {
    Serial.println("Klien PUBLISH tidak terhubung, pengiriman dibatalkan.");
    return;
  }

  String payload = "field1=" + String(Pitch, 2) + "&field2=" + String(Yaw, 2) + "&field3=" + String(Roll, 2);

  Serial.print("Mengirim data via Klien PUBLISH: ");
  Serial.println(payload);

  if (client_pub.publish(mqttPublishTopic.c_str(), payload.c_str())) {
    Serial.println("-> Data berhasil dikirim!");
  } else {
    Serial.println("-> Gagal mengirim data via Klien PUBLISH!");
  }
}

// =================================================================
//                       FUNGSI SENSOR & MOTOR
// =================================================================

void MPU6050Connect() {
  mpu.initialize();
  if (!mpu.testConnection()) {
    Serial.println("Koneksi MPU6050 gagal!");
    while(1);
  }
  
  uint8_t devStatus = mpu.dmpInitialize();
  if (devStatus != 0) {
    Serial.print("Inisialisasi DMP gagal! Kode error: ");
    Serial.println(devStatus);
    while (1);
  }

  mpu.setXAccelOffset(MPUOffsets[0]);
  mpu.setYAccelOffset(MPUOffsets[1]);
  mpu.setZAccelOffset(MPUOffsets[2]);
  mpu.setXGyroOffset(MPUOffsets[3]);
  mpu.setYGyroOffset(MPUOffsets[4]);
  mpu.setZGyroOffset(MPUOffsets[5]);

  mpu.setDMPEnabled(true);
  Serial.println("MPU6050 DMP berhasil diinisialisasi!");
}

void GetDMP() {
  uint8_t fifoBuffer[64]; // buffer untuk menyimpan paket dari FIFO
  if (mpu.dmpGetCurrentFIFOPacket(fifoBuffer)) {
    Quaternion q;
    VectorFloat gravity;
    float ypr[3];

    mpu.dmpGetQuaternion(&q, fifoBuffer);
    mpu.dmpGetGravity(&gravity, &q);
    mpu.dmpGetYawPitchRoll(ypr, &q, &gravity);

    // Konversi dari radian ke derajat
    Yaw = ypr[0] * 180.0 / M_PI;
    Pitch = ypr[1] * 180.0 / M_PI;
    Roll = ypr[2] * 180.0 / M_PI;
  }
}

void kontrolMotor() {
  if (!motorActive) {
    return;
  }
  
  float error = setpoint - Pitch;
  
  if (abs(error) <= tolerance) {
    stopMotor();
    Serial.println("✅ Setpoint tercapai! Motor dinonaktifkan.");
    motorActive = false;
  } 
  else if (error > 0) {
    moveUp();
  } 
  else {
    moveDown();
  }
}

void moveUp() {
  int speed = (abs(setpoint - Pitch) > 3) ? motorSpeedHigh : motorSpeedLow;
  analogWrite(RPWM_PIN, speed);
  analogWrite(LPWM_PIN, 0);
  Serial.print("-> Bergerak NAIK, Kecepatan: ");
  Serial.println(speed);
}

void moveDown() {
  int speed = (abs(setpoint - Pitch) > 3) ? motorSpeedHigh : motorSpeedLow;
  analogWrite(RPWM_PIN, 0);
  analogWrite(LPWM_PIN, speed);
  Serial.print("-> Bergerak TURUN, Kecepatan: ");
  Serial.println(speed);
}

void stopMotor() {
  analogWrite(RPWM_PIN, 0);
  analogWrite(LPWM_PIN, 0);
}
