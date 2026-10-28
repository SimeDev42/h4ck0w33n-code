# H4ck0w33n Lantern (ESP32)

## RGB strip

Three WS2812B LEDs are controlled through **D2 (GPIO 4)**, connected to the strip's DIN end. Use the approved strip supply and a common ground with the ESP32; confirm data-level compatibility. The onboard LED is no longer used.

The strip starts off. On sets all three pixels to orange (RGB 255, 80, 0) at brightness 64/255. Configure pin, pixel count, brightness and colour in `include/AppConfig.h`. PlatformIO installs Adafruit NeoPixel automatically. The existing serial and web controls use the same strip driver.

## Upload

Connect the ESP32 over USB and close Serial Monitor. From this directory run:

```sh
pio run -t erase
pio run -t upload
```

## Monitor

```sh
pio device monitor -e esp32-c3
```

Erase is required after changing the flash partition layout. It clears all flash data, including saved Wi-Fi credentials. Open Serial Monitor at **115200 baud** after upload.

In the upload output, confirm the firmware is written at `0x00020000`.

## Wi-Fi setup

With no saved network, or if the saved network cannot be reached, the ESP32 starts the open Wi-Fi network **H4ck0w33n-Lantern-Setup**. Connect to it, then open [http://192.168.4.1](http://192.168.4.1). Enter the Wi-Fi network name and password; the ESP32 saves them in Preferences and restarts. If saving fails because NVS is full, erase flash and upload again, then retry setup.

Once connected to Wi-Fi, open the IP address printed in Serial Monitor to control the lamp.

## Serial controls

- `1` — turn the lamp on
- `0` — turn the lamp off
- `t` — run the light test

## Code layout

- `src/main.cpp` contains Arduino `setup()` and `loop()` orchestration.
- `src/LampController.cpp` handles lamp state and the timed light test.
- `src/CredentialStore.cpp` owns Wi-Fi credential persistence in Preferences.
- `src/WifiManager.cpp` handles station connection and setup access point startup.
- `src/WebServerManager.cpp` registers the Wi-Fi setup and lamp control routes.
- `src/WebPages.cpp` builds the HTML pages.
- `src/AppState.cpp` defines shared runtime state; declarations are in `include/AppState.h`.
- `include/AppConfig.h` holds board and application constants.

For the ESP32-C3 Mini, select the C3 environment explicitly when building or uploading:

```sh
pio run -e esp32-c3 -t upload
pio device monitor -e esp32-c3
```
