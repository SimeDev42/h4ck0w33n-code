#include <Arduino.h>
#include <WiFi.h>
#include "AppState.h"
#include "CredentialStore.h"
#include "LampController.h"
#include "WebPages.h"
#include "WebServerManager.h"
using namespace app;

// ---------- Web server routes ----------

void setupAPRoutes() {
  apServer.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(200, "text/html", buildAPPage());
  });
  apServer.on("/save", HTTP_POST, [](AsyncWebServerRequest *request) {
    String ssid = "", pass = "";
    if (request->hasParam("ssid", true)) ssid = request->getParam("ssid", true)->value();
    if (request->hasParam("pass", true)) pass = request->getParam("pass", true)->value();
    if (!saveCreds(ssid, pass)) {
      request->send(507, "text/plain", "Could not save WiFi credentials: device NVS storage is full. Erase flash once, then reconnect to setup WiFi and try again.");
      return;
    }
    request->send(200, "text/html", "<html><body style='background:#111;color:#eee;font-family:sans-serif;text-align:center;padding:40px;'><h1 style='color:#ff7a00;'>Saved</h1><p>Restarting and connecting...</p></body></html>");
    restartPending = true;
    restartAt = millis() + 1000;
  });
  apServer.onNotFound([](AsyncWebServerRequest *request) {
    request->redirect("http://" + WiFi.softAPIP().toString() + "/");
  });
}

void setupSTARoutes() {
  staServer.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(200, "text/html", buildControlPage());
  });
  staServer.on("/on", HTTP_GET, [](AsyncWebServerRequest *request) {
    app::testStep = -1; setLamp(true); request->redirect("/");
  });
  staServer.on("/off", HTTP_GET, [](AsyncWebServerRequest *request) {
    app::testStep = -1; setLamp(false); request->redirect("/");
  });
  staServer.on("/test", HTTP_GET, [](AsyncWebServerRequest *request) {
    beginTest(); request->redirect("/");
  });
  staServer.on("/status", HTTP_GET, [](AsyncWebServerRequest *request) {
    String json = "{\"lamp\":" + String(lampOn ? "true" : "false") + ",\"ip\":\"" + WiFi.localIP().toString() + "\"}";
    request->send(200, "application/json", json);
  });
  staServer.on("/wifi", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(200, "text/html", buildWiFiPage());
  });
  staServer.on("/save", HTTP_POST, [](AsyncWebServerRequest *request) {
    String ssid = "", pass = "";
    if (request->hasParam("ssid", true)) ssid = request->getParam("ssid", true)->value();
    if (request->hasParam("pass", true)) pass = request->getParam("pass", true)->value();
    if (!saveCreds(ssid, pass)) {
      request->send(507, "text/plain", "Could not save WiFi credentials: device NVS storage is full. Erase flash once, then reconnect to setup WiFi and try again.");
      return;
    }
    request->send(200, "text/html", "<html><body style='background:#111;color:#eee;font-family:sans-serif;text-align:center;padding:40px;'><h1 style='color:#ff7a00;'>Saved</h1><p>Restarting and connecting...</p></body></html>");
    restartPending = true;
    restartAt = millis() + 1000;
  });
  staServer.on("/resetwifi", HTTP_POST, [](AsyncWebServerRequest *request) {
    clearCreds();
    request->send(200, "text/html", "<html><body style='background:#111;color:#eee;font-family:sans-serif;text-align:center;padding:40px;'><h1 style='color:#ff7a00;'>Reset</h1><p>Restarting into setup mode...</p></body></html>");
    restartPending = true;
    restartAt = millis() + 1000;
  });

  staServer.onNotFound([](AsyncWebServerRequest *request) {
    request->send(404, "text/plain", "Not found");
  });
}

