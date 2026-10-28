# 1 · Get ready

[Wiki home](README.md) · [Next: laser cutting](02-laser-cutting.md)

## Bring or collect

- A computer with desktop Chrome or Edge (for Web Serial) and a working USB port.
- A USB **data** cable that fits your ESP32-C3. A charging-only cable will not upload firmware or connect to the webpage.
- The project folder supplied by the organizer, fully extracted if it arrives as a ZIP.
- Workshop-approved **3 mm MDF**.
- One ESP32-C3 development board and three WS2812B RGB LEDs (on one strip).
- Insulated hookup wire, solder, flux, a soldering iron and stand, wire cutters/strippers, heat-shrink insulation, and a multimeter.
- The organizer-approved LED power/protection components. The exact board, LED variant, supply and data pin still need confirmation; see [electronics](03-electronics.md).
- The assembly adhesive and mounting hardware chosen by the organizer.
- Headphones if several participants will use speech in the same room.

## Software requirements

| Software | Why |
| --- | --- |
| [Visual Studio Code](https://code.visualstudio.com/) + [PlatformIO IDE](https://docs.platformio.org/en/latest/integration/ide/vscode.html) | Build and upload firmware |
| [Python 3](https://www.python.org/downloads/) | Serve the local webpage |
| [Ollama](https://ollama.com/download) — optional | Run the language model on your computer |

You also need internet for downloads and ElevenLabs speech. Download your Ollama model beforehand if you will run inference locally.

## Linux preparation

Use your distribution's packages for Python 3 and the Python virtual-environment support needed by PlatformIO. On Ubuntu/Debian:

```sh
sudo apt update
sudo apt install python3 python3-venv
```

On other distributions, use the equivalent packages from your package manager. Confirm `python3 --version` works. Install VS Code and the PlatformIO IDE extension using the official instructions linked above.

Use a desktop browser with Web Serial support, such as Chrome, for the USB connection. Install the [Linux serial-access setup](04-firmware.md#linux-usb-access) before the workshop. If using a sandboxed browser or editor package, its device-access restrictions may require additional configuration.

For laser cutting, prepare and send the job from the FabLab's configured LightBurn computer; you do not need LightBurn installed on your Linux laptop.

## Find the project root

The root is the folder containing `laser-files`, `esp32_code`, and `hack_your_lantern`. Open a terminal there. In VS Code, use **File → Open Folder**, choose the project root, then **Terminal → New Terminal**.

**Checkpoint:** you can see all three project folders and have a USB data cable.
