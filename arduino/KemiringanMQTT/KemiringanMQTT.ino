#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include "I2Cdev.h"
#include "MPU6050_6Axis_MotionApps20.h"

// WiFi Credentials
const char ssid[] = "ASUS";
const char pass[] = "123456789";

// ThingSpeak MQTT Credentials
#define channelID 2889619
const char mqttUserName[] = "HAsgGCchGyodFT00OiYTEyE";
const char clientID[] = "HAsgGCchGyodFT00OiYTEyE";
const char mqttPass[] = "ALDiptg5dojkgh9AuT95VEbm";

// MQTT Server (ThingSpeak)
const char* mqttServer = "mqtt3.thingspeak.com";
const int mqttPort = 1883;
String mqttSubscribeTopic = "channels/" + String(channelID) + "/subscribe/fields/field1";
String mqttPublishTopic = "channels/" + String(channelID) + "/publish";

WiFiClient espClient;
PubSubClient client(espClient);

// Pin Motor BTS7960
const int RPWM = 16;
const int LPWM = 17;
const int R_EN = 18;
const int L_EN = 19;

// MPU6050 PINOUT
// PIN 21 - SDA
// PIN 22 - SCL


// MPU6050
MPU6050 mpu;
float Yaw, Pitch, Roll;
int MPUOffsets[6] = { -5298, -639, 1721, 29, 19, -1 };

// Kontrol Motor
int setpoint = -1;
bool motorActive = false;
const int motorSpeedHigh = 150;
const int motorSpeedLow = 80;
const float tolerance = 0.5;

// Timer Loop
unsigned long previousMillis = 0;
const long interval = 2000;

void setup() {
    Serial.begin(115200);
    setupWiFi();
    client.setServer(mqttServer, mqttPort);
    client.setCallback(callback);
    reconnectMQTT();

    pinMode(RPWM, OUTPUT);
    pinMode(LPWM, OUTPUT);
    pinMode(R_EN, OUTPUT);
    pinMode(L_EN, OUTPUT);
    digitalWrite(R_EN, HIGH);
    digitalWrite(L_EN, HIGH);
    stopMotor();

    Wire.begin();
    Wire.setClock(400000);
    MPU6050Connect();
}

void loop() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi disconnected, reconnecting...");
        setupWiFi();
    }

    if (!client.connected()) {
        reconnectMQTT();
    }
    client.loop();

    unsigned long currentMillis = millis();
    if (currentMillis - previousMillis >= interval) {
        previousMillis = currentMillis;
        GetDMP();
        
        Serial.print("Yaw: "); Serial.print(Yaw);
        Serial.print(", Pitch: "); Serial.print(Pitch);
        Serial.print(", Roll: "); Serial.println(Roll);
        Serial.print("Setpoint: "); Serial.print(setpoint);
        Serial.print(", Motor Active: "); Serial.println(motorActive);
        
        kontrolMotor();
        publishMQTT(Pitch);
    }
}

void setupWiFi() {
    Serial.print("Connecting to WiFi...");
    WiFi.begin(ssid, pass);
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.print(".");
    }
    Serial.println("\nConnected to WiFi!");
}

void reconnectMQTT() {
    while (!client.connected()) {
        Serial.print("Connecting to MQTT...");
        if (client.connect(clientID, mqttUserName, mqttPass)) {
            Serial.println(" Connected!");
            client.subscribe(mqttSubscribeTopic.c_str());
        } else {
            Serial.print(" Failed, rc=");
            Serial.print(client.state());
            Serial.println(" Trying again in 5 seconds...");
            delay(5000);
        }
    }
}

void callback(char* topic, byte* payload, unsigned int length) {
    String message;
    for (int i = 0; i < length; i++) message += (char)payload[i];
    int input = message.toInt();

    if (input % 5 == 0 && input >= 0 && input <= 45) {
        setpoint = input;
        motorActive = true;
        Serial.print("Setpoint diterima: "); Serial.println(setpoint);
    }
}

void publishMQTT(float pitchValue) {
    if (pitchValue <= 0 || pitchValue > 90) {
        Serial.println("Pitch negatif atau tidak valid, tidak dikirim!");
        return;
    }

    String payload = "field2=" + String(pitchValue, 2);
    if (client.publish(mqttPublishTopic.c_str(), payload.c_str())) {
        Serial.print("Data terkirim: ");
        Serial.println(payload);
    } else {
        Serial.println("Gagal mengirim data MQTT!");
    }
}

void GetDMP() {
    uint8_t fifoBuffer[64];
    Quaternion q;
    VectorFloat gravity;
    float ypr[3];

    if (mpu.dmpGetCurrentFIFOPacket(fifoBuffer)) {
        mpu.dmpGetQuaternion(&q, fifoBuffer);
        mpu.dmpGetGravity(&gravity, &q);
        mpu.dmpGetYawPitchRoll(ypr, &q, &gravity);

        Yaw = ypr[0] * 180.0 / M_PI;
        Pitch = ypr[1] * 180.0 / M_PI;
        Roll = ypr[2] * 180.0 / M_PI;
    }
}

void MPU6050Connect() {
    mpu.initialize();
    uint8_t devStatus = mpu.dmpInitialize();
    if (devStatus != 0) {
        Serial.println("DMP Initialization failed!");
        while (1);
    }

    mpu.setXAccelOffset(MPUOffsets[0]);
    mpu.setYAccelOffset(MPUOffsets[1]);
    mpu.setZAccelOffset(MPUOffsets[2]);
    mpu.setXGyroOffset(MPUOffsets[3]);
    mpu.setYGyroOffset(MPUOffsets[4]);
    mpu.setZGyroOffset(MPUOffsets[5]);

    mpu.setDMPEnabled(true);
    Serial.println("MPU6050 DMP Initialized!");
}

void kontrolMotor() {
    if (!motorActive) return;
    float error = abs(setpoint - Pitch);
    float dynamicTolerance = (setpoint == 0) ? 1.0 : tolerance;

    if (error <= dynamicTolerance) {
        stopMotor();
        Serial.println("Setpoint tercapai! Motor berhenti.");
        motorActive = false;
    } else if (setpoint > Pitch) {
        moveUp();
    } else {
        moveDown();
    }
}

void moveUp() {
    int speed = (abs(setpoint - Pitch) > 3) ? motorSpeedHigh : motorSpeedLow;
    analogWrite(RPWM, speed);
    analogWrite(LPWM, 0);
    Serial.print("Dongkrak naik, kecepatan: "); Serial.println(speed);
}

void moveDown() {
    int speed = (abs(setpoint - Pitch) > 3) ? motorSpeedHigh : motorSpeedLow;
    analogWrite(RPWM, 0);
    analogWrite(LPWM, speed);
    Serial.print("Dongkrak turun, kecepatan: "); Serial.println(speed);
}

void stopMotor() {
    analogWrite(RPWM, 0);
    analogWrite(LPWM, 0);
    Serial.println("Dongkrak berhenti total.");
}