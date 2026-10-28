#include <Arduino.h>
#include "AppState.h"
#include "CredentialStore.h"
using namespace app;

void loadCreds(String &ssid, String &pass) {
  prefs.begin("lantern", true);
  ssid = prefs.isKey("ssid") ? prefs.getString("ssid", "") : "";
  pass = prefs.isKey("pass") ? prefs.getString("pass", "") : "";
  prefs.end();
}

bool saveCreds(const String &ssid, const String &pass) {
  if (!prefs.begin("lantern", false)) {
    Serial.println("[NVS] Could not open credentials namespace for writing");
    return false;
  }
  prefs.putString("ssid", ssid);
  prefs.putString("pass", pass);
  bool saved = prefs.getString("ssid", "") == ssid && prefs.getString("pass", "") == pass;
  prefs.end();
  if (!saved) Serial.println("[NVS] Credential save failed; values did not verify");
  return saved;
}

void clearCreds() {
  prefs.begin("lantern", false);
  prefs.remove("ssid");
  prefs.remove("pass");
  prefs.end();
}

