#include <Arduino.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include "AppConfig.h"
#include "AppState.h"
#include "CredentialStore.h"
#include "LampController.h"
#include "WebServerManager.h"
#include "WifiManager.h"
using namespace app;

void setup() {
  Serial.begin(SERIAL_BAUDRATE);
  initLamp();

  Serial.println();
  Serial.println("[BOOT] H4ck0w33n lantern");
  Serial.println("[BOOT] Listening for '0' (off), '1' (on) and 't' (test)");
  delay(50);

  String ssid, pass;
  loadCreds(ssid, pass);
  bool connected = ssid.length() > 0 && tryConnect(ssid, pass);

  if (connected) {
    currentSSID = ssid;
    saveCreds(ssid, pass);
  } else {
    startAPMode();
    return;
  }

  setupSTARoutes();
  staServer.begin();
  if (MDNS.begin("lantern")) {
    MDNS.addService("http", "tcp", 80);
    Serial.println("[MDNS] http://lantern.local/");
  }
  Serial.printf("[WEB] Control UI: http://%s/\n", WiFi.localIP().toString().c_str());
}

void loop() {
  if (apMode) {
    if (dnsStarted) dnsServer.processNextRequest();
  }

  if (restartPending && millis() >= restartAt) ESP.restart();
  serviceTest();

  if (Serial.available() > 0) {
    char c = Serial.peek();
    if (c == '0' || c == '1' || c == 't' || c == 'T') {
      Serial.read();
      if (c == 't' || c == 'T') { beginTest(); return; }
      app::testStep = -1;
      setLamp(c == '1');
    } else {
      Serial.read();
    }
  }
}
