#include <Arduino.h>
#include <WiFi.h>
#include "AppState.h"
#include "WebPages.h"
using namespace app;

String esc(const String &s) {
  String r = s;
  r.replace("&", "&amp;");
  r.replace("<", "&lt;");
  r.replace(">", "&gt;");
  r.replace("\"", "&quot;");
  return r;
}

String buildAPPage() {
  String page = R"rawliteral(
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WiFi Setup</title>
<style>
 body{font-family:sans-serif;max-width:420px;margin:40px auto;padding:0 16px;background:#111;color:#eee;}
 h1{color:#ff7a00;}
 .card{background:#1e1e1e;padding:20px;border-radius:12px;}
 label{display:block;margin-top:12px;font-size:14px;}
 input,select{width:100%;padding:10px;margin-top:4px;border:1px solid #444;border-radius:8px;background:#2a2a2a;color:#eee;box-sizing:border-box;}
 button{margin-top:16px;width:100%;padding:12px;border:none;border-radius:8px;background:#ff7a00;color:#fff;font-size:16px;cursor:pointer;}
 .hint{font-size:12px;color:#888;margin-top:8px;}
</style></head><body>
<h1>H4ck0w33n Lantern</h1>
<p>Connect this device to your WiFi network.</p>
<div class="card">
<form method="POST" action="/save">
<label>Network (SSID)</label>
<input name="ssid" placeholder="Enter WiFi network name" required>
<label>Password</label>
<input name="pass" type="password" placeholder="WiFi password">
<button type="submit">Save &amp; Connect</button>
</form>
<p class="hint">After saving, the device restarts and connects. If it fails, the setup network reappears.</p>
</div>
</body></html>)rawliteral";
  return page;
}

String buildControlPage() {
  String ip = WiFi.localIP().toString();
  String state = lampOn ? "ON" : "OFF";
  String color = lampOn ? "#4caf50" : "#888";

  String page = R"rawliteral(
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lantern Control</title>
<style>
 body{font-family:sans-serif;max-width:420px;margin:40px auto;padding:0 16px;background:#111;color:#eee;text-align:center;}
 h1{color:#ff7a00;}
 .status{font-size:22px;margin:20px 0;}
 .dot{display:inline-block;width:14px;height:14px;border-radius:50%;margin-right:8px;vertical-align:middle;}
 .btn{display:inline-block;margin:8px;padding:14px 28px;border:none;border-radius:10px;font-size:16px;cursor:pointer;color:#fff;text-decoration:none;}
 .on{background:#4caf50;} .off{background:#e53935;} .test{background:#ff7a00;} .cfg{background:#555;font-size:14px;}
</style></head><body>
<h1>H4ck0w33n Lantern</h1>
<div class="status"><span class="dot" style="background:)rawliteral";
  page += color;
  page += R"rawliteral(;"></span>Lamp is <b>)rawliteral";
  page += state;
  page += R"rawliteral(</b></div>
<div>
 <a class="btn on" href="/on">Turn ON</a>
 <a class="btn off" href="/off">Turn OFF</a>
</div>
<div>
 <a class="btn test" href="/test">Test Light</a>
</div>
<p style="margin-top:30px;font-size:13px;color:#888;">IP: )rawliteral";
  page += ip;
  page += R"rawliteral(<br>Connected to: )rawliteral";
  page += esc(currentSSID);
  page += R"rawliteral(</p>
<div><a class="btn cfg" href="/wifi">WiFi Settings</a></div>
</body></html>)rawliteral";
  return page;
}

String buildWiFiPage() {
  String page = R"rawliteral(
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WiFi Settings</title>
<style>
 body{font-family:sans-serif;max-width:420px;margin:40px auto;padding:0 16px;background:#111;color:#eee;}
 h1{color:#ff7a00;}
 .card{background:#1e1e1e;padding:20px;border-radius:12px;}
 label{display:block;margin-top:12px;font-size:14px;}
 input{width:100%;padding:10px;margin-top:4px;border:1px solid #444;border-radius:8px;background:#2a2a2a;color:#eee;box-sizing:border-box;}
 button{margin-top:16px;width:100%;padding:12px;border:none;border-radius:8px;background:#ff7a00;color:#fff;font-size:16px;cursor:pointer;}
 .danger{background:#e53935;}
 a{color:#ff7a00;}
</style></head><body>
<h1>WiFi Settings</h1>
<p>Current network: )rawliteral";
  page += esc(currentSSID);
  page += R"rawliteral(</p>
<div class="card">
<form method="POST" action="/save">
<label>New SSID</label>
<input name="ssid" required placeholder="Network name">
<label>Password</label>
<input name="pass" type="password" placeholder="WiFi password">
<button type="submit">Save &amp; Reconnect</button>
</form>
</div>
<p style="margin-top:16px;"><a href="/">Back to control</a></p>
<form method="POST" action="/resetwifi">
<button class="danger" type="submit">Reset WiFi (enter setup mode)</button>
</form>
</body></html>)rawliteral";
  return page;
}

