#include <WiFi.h>
#include <HTTPClient.h>

// --- GANTI INI ---
const char* ssid = "Opung Asylum";
const char* password = "lionelmessi10";
const char* server_address = "https://twins.gradien.my.id/landslide/backend/php/update_pergerakan.php";
// -----------------

void setup_wifi() {
    Serial.print("Menghubungkan ke ");
    Serial.println(ssid);
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi terhubung!");
    Serial.print("Alamat IP ESP32: ");
    Serial.println(WiFi.localIP());
}

void setup() {
    Serial.begin(115200);
    setup_wifi();
}

void loop() {
    static String line = "";
    while (Serial.available()) {
        char c = Serial.read();
        line += c;
        if (c == '\n') {
            if (line.indexOf("PERGERAKAN_DETECTED") >= 0) {
                Serial.println("PERGERAKAN TERDETEKSI! Mengirim notifikasi ke server...");
                if (WiFi.status() == WL_CONNECTED) {
                    HTTPClient http;
                    http.begin(server_address);
                    int httpCode = http.GET();
                    if (httpCode > 0) {
                        Serial.printf("[HTTP] Kode Respon: %d\n", httpCode);
                        String payload = http.getString();
                        Serial.println(payload);
                    } else {
                        Serial.printf("[HTTP] Gagal, error: %s\n", http.errorToString(httpCode).c_str());
                    }
                    http.end();
                }
            }
            line = "";
        }
    }
}