#include <Arduino.h>
#include <Adafruit_NeoPixel.h>
#include "AppConfig.h"
#include "AppState.h"
#include "LampController.h"
using namespace app;

namespace {
Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);
}

void initLamp() {
  strip.begin();
  strip.setBrightness(LED_BRIGHTNESS);
  setLamp(false);
}

void setLamp(bool on) {
  app::lampOn = on;
  const uint32_t color = on ? strip.Color(LED_RED, LED_GREEN, LED_BLUE) : 0;
  strip.fill(color);
  strip.show();
}

void beginTest() {
  app::testStep = 0;
  app::testNextAt = millis();
  app::testRestore = lampOn;
}

void serviceTest() {
  if (app::testStep < 0 || millis() < testNextAt) return;

  if (app::testStep >= 6) {
    app::testStep = -1;
    setLamp(app::testRestore);
    Serial.println("[TEST] Light test done");
    return;
  }

  bool on = (app::testStep % 2 == 0);
  setLamp(on);
  app::testNextAt = millis() + (on ? 450 : 300);
  app::testStep++;
}

