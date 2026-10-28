#include <Arduino.h>
#include <string.h>
#include <WiFi.h>
#include <esp_err.h>
#include <esp_wifi.h>
#include "AppConfig.h"
#include "AppState.h"
#include "WebServerManager.h"
#include "WifiManager.h"
using namespace app;

bool tryConnect(const String &ssid, const String &pass) {
  if (ssid.length() == 0) return false;
  Serial.printf("[WIFI] Connecting to %s\n", ssid.c_str());
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  esp_err_t storageResult = esp_wifi_set_storage(WIFI_STORAGE_RAM);
  if (storageResult != ESP_OK) {
    Serial.printf("[WIFI] Failed to set Wi-Fi storage to RAM: %s (0x%x)\n",
                  esp_err_to_name(storageResult), static_cast<unsigned int>(storageResult));
    return false;
  }
  WiFi.begin(ssid.c_str(), pass.c_str());

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start) < WIFI_TIMEOUT) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WIFI] Connected. IP: %s\n", WiFi.localIP().toString().c_str());
    return true;
  }
  Serial.println("[WIFI] Connection failed");
  return false;
}

void startAPMode() {
  apMode = true;
  // A failed STA attempt can leave the radio in a connecting state. Tear it
  // down without powering off the radio, then switch directly to AP mode.
  // disconnect(true, ...) powers the radio off and can leave the AP driver
  // unable to apply its configuration on some ESP32 core versions.
  WiFi.persistent(false);
  WiFi.disconnect(false, false);
  if (!WiFi.mode(WIFI_AP)) {
    Serial.println("[AP] Failed to switch Wi-Fi into AP mode");
    return;
  }
  delay(250);

  // Credentials are stored separately in Preferences. Keep ESP-IDF's Wi-Fi
  // interface config in RAM so AP startup doesn't need another NVS write.
  esp_err_t storageResult = esp_wifi_set_storage(WIFI_STORAGE_RAM);
  if (storageResult != ESP_OK) {
    Serial.printf("[AP] Failed to set Wi-Fi storage to RAM: %s (0x%x)\n",
                  esp_err_to_name(storageResult), static_cast<unsigned int>(storageResult));
  }

  // Configure the AP with a zero-initialized ESP-IDF structure. This avoids
  // softAP() passing uninitialized fields to esp_wifi_set_config() on cores
  // where the wrapper's local wifi_config_t is not fully initialized.
  wifi_config_t apConfig = {};
  memcpy(apConfig.ap.ssid, AP_SSID, sizeof(AP_SSID) - 1);
  apConfig.ap.ssid_len = sizeof(AP_SSID) - 1;
  apConfig.ap.channel = 1;
  apConfig.ap.authmode = WIFI_AUTH_OPEN;
  apConfig.ap.ssid_hidden = 0;
  apConfig.ap.max_connection = 4;
  apConfig.ap.beacon_interval = 100;

  esp_err_t configResult = esp_wifi_set_config(WIFI_IF_AP, &apConfig);
  bool apStarted = configResult == ESP_OK;
  if (!apStarted) {
    Serial.printf("[AP] esp_wifi_set_config failed: %s (0x%x); trying Arduino softAP()\n",
                  esp_err_to_name(configResult), static_cast<unsigned int>(configResult));
    apStarted = WiFi.softAP(AP_SSID, nullptr, 1, 0, 4);
  }

  IPAddress ip = WiFi.softAPIP();
  if (!apStarted || ip == IPAddress(0, 0, 0, 0)) {
    Serial.println("[AP] Failed to start setup access point");
    return;
  }
  Serial.printf("[AP] SSID: %s IP: %s\n", AP_SSID, ip.toString().c_str());
  dnsStarted = dnsServer.start(DNS_PORT, "*", ip);
  if (!dnsStarted) {
    Serial.println("[AP] Failed to start DNS server");
  }
  setupAPRoutes();
  apServer.begin();
}

