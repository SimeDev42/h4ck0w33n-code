#pragma once
#include <Arduino.h>
void loadCreds(String &ssid, String &pass);
bool saveCreds(const String &ssid, const String &pass);
void clearCreds();
