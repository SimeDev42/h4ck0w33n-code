#pragma once
#include <Arduino.h>
#include <ESPAsyncWebServer.h>
#include <DNSServer.h>
#include <Preferences.h>

namespace app {
extern Preferences prefs;
extern AsyncWebServer apServer;
extern AsyncWebServer staServer;
extern DNSServer dnsServer;
extern int testStep;
extern unsigned long testNextAt;
extern bool testRestore;
extern bool lampOn;
extern bool apMode;
extern bool dnsStarted;
extern String currentSSID;
extern bool restartPending;
extern unsigned long restartAt;
}
