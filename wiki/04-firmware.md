# 4 · Flash the ESP32-C3

[Previous: electronics](03-electronics.md) · [Wiki home](README.md) · [Next: local AI](05-local-ai.md)

The firmware drives three WS2812B LEDs on **D2 (GPIO 4)** using Adafruit NeoPixel. It starts with the strip off; on means orange at 25% brightness. The GPIO, pixel count, brightness and RGB colour are configured in `include/AppConfig.h`. Confirm the power wiring before connecting the strip.

## Install and open

1. Install VS Code and the official **PlatformIO IDE** extension. Let its setup finish; restart VS Code if prompted.
2. Open the supplied **`esp32_code` folder** in VS Code. You should see `platformio.ini` at the top level.
3. Plug in the ESP32-C3 using a USB data cable.
4. Close any Serial Monitor and disconnect the webpage's USB connection. Only one application should own the port.
5. Open a **PlatformIO Core CLI** terminal from PlatformIO. Its bundled `pio` command is available there; a normal system terminal may not have it on PATH. See [PlatformIO installation](https://docs.platformio.org/en/latest/integration/ide/vscode.html).

## Linux USB access

Build and upload commands below are the same on Linux. Before connecting, install the rules from [PlatformIO's official udev instructions](https://docs.platformio.org/en/latest/core/installation/udev-rules.html), reload them as described there, then unplug and reconnect the board.

If access is still denied, use `pio device list` to find the port and inspect its permissions. For example (replace the path with your actual port):

```sh
ls -l /dev/ttyACM0
```

If the device belongs to `dialout`, add your user to that group:

```sh
sudo usermod -aG dialout "$USER"
```

Use the actual device group if different; do not assume every distribution uses `dialout`. Log out completely and log back in, then reopen VS Code and the browser. Avoid running either application as root. These permissions also affect the webpage's USB connection.

## Build and upload

Run these commands in `esp32_code`:

```sh
pio run -e esp32-c3
pio run -e esp32-c3 -t erase
pio run -e esp32-c3 -t upload
```

Wait for `SUCCESS`. The first build downloads the platform and libraries. Always select `esp32-c3`: the project also contains an environment for a different ESP32 board.

The C3 environment currently uses `esp32-c3-devkitm-1`, USB CDC flags and a custom flash layout. Confirm compatibility with the supplied board before the workshop. The application image is configured at **`0x20000`**; let PlatformIO handle the full upload rather than flashing an individual binary at a guessed address.

If multiple boards are connected, unplug the extras or list ports and supply the correct `--upload-port`:

```sh
pio device list
```

## Erase only when needed

After a partition-layout change, or to recover the documented full-NVS problem, erase before uploading:

```sh
pio run -e esp32-c3 -t erase
pio run -e esp32-c3 -t upload
```

**Erase deletes all saved board data, including Wi-Fi credentials.** It is not required for every routine upload.

## Confirm the serial connection

```sh
pio device monitor -e esp32-c3
```

The monitor uses **115200 baud**. Press reset if necessary and look for `[BOOT] H4ck0w33n lantern`. The firmware recognizes `1` (on), `0` (off), and `t` (light test). These commands control all three strip LEDs. The test blinks three times, then restores the previous on/off state. Confirm all three LEDs respond; a successful upload alone does not verify the physical wiring.

Exit the monitor with **Ctrl+C** before connecting the browser. If the board does not appear or upload fails, see [troubleshooting](08-troubleshooting.md). Boot-button procedures vary by board; use the actual board's instructions or ask the instructor.

## Optional board Wi-Fi

For the separate board-hosted control page, connect to `H4ck0w33n-Lantern-Setup`, visit `http://192.168.4.1`, and enter the desired Wi-Fi details. Once connected, the board prints its IP in Serial Monitor. This does not configure the language model or ElevenLabs. Rejoin your normal network for internet access. See the [firmware README](../esp32_code/README.md).
