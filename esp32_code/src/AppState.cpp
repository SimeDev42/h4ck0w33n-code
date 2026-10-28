#include "AppState.h"
namespace app {
Preferences prefs;
AsyncWebServer apServer(80);
AsyncWebServer staServer(80);
DNSServer dnsServer;
int testStep = -1;
unsigned long testNextAt = 0;
bool testRestore = false;
bool lampOn = false;
bool apMode = false;
bool dnsStarted = false;
String currentSSID;
bool restartPending = false;
unsigned long restartAt = 0;
}
