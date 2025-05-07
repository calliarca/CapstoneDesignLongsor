#include <WiFi.h>
#include <ESP32WebServer.h>

// Gunakan Serial bawaan (GPIO3 = RX, GPIO1 = TX)

// Wi-Fi credentials
const char* ssid = "Busyetdah";
const char* password = "rioganteng";

// Web server on port 80
ESP32WebServer server(80);

// JPEG image buffer
uint8_t jpeg_buffer[1024 * 10]; // Adjust buffer size as needed
int jpeg_size = 0;

void setup() {
  Serial.begin(115200);  // Gunakan Serial default untuk komunikasi UART dan debug
  delay(1000);           // Tunggu stabil

  // Wi-Fi connection
  Serial.println("Connecting to Wi-Fi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting...");
  }
  Serial.println("Connected to Wi-Fi!");
  Serial.print("ESP32 IP ADRRESS:");
  Serial.println(WiFi.localIP());

  // Routes
  server.on("/", HTTP_GET, []() {
    server.send(200, "text/html", "<html><body><h1>ESP32-CAM Stream</h1><img src='/capture'></body></html>");
  });

  server.on("/capture", HTTP_GET, []() {
    if (jpeg_size > 0) {
      server.setContentLength(jpeg_size);
      server.send(200, "image/jpeg", "");
      WiFiClient client = server.client();
      client.write(jpeg_buffer, jpeg_size);
    } else {
      server.send(500, "text/plain", "No image data available.");
    }
  });

  server.begin();
  Serial.println("Server started!");
}

void loop() {
  // Baca data JPEG dari Serial bawaan
  if (Serial.available()) {
    if (Serial.available() >= 4) {
      uint32_t img_size;
      Serial.readBytes((char*)&img_size, 4);
      jpeg_size = img_size;
      Serial.print("Image size: ");
      Serial.println(jpeg_size);

      int bytesRead = 0;
      while (bytesRead < jpeg_size) {
        if (Serial.available()) {
          jpeg_buffer[bytesRead++] = Serial.read();
        }
      }
      Serial.println("Image received!");
    }
  }

  server.handleClient();
}
