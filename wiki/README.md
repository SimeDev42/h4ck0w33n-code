# H4CK-O-W33N workshop wiki

Build a lantern, give it a personality, and talk to it from your computer. This guide is for beginners using Windows, macOS or Linux.

## Follow the workshop

1. [Get ready](01-get-ready.md) — parts, software and project files.
2. [Laser-cut and assemble](02-laser-cutting.md) — prepare the 3 mm MDF design in LightBurn and use the FabLab AEON guide.
3. [Prepare and solder the electronics](03-electronics.md) — understand the three-LED chain and check the pending hardware details.
4. [Flash the ESP32-C3](04-firmware.md) — install PlatformIO, upload and inspect serial output.
5. [Set up local AI, optionally](05-local-ai.md) — Ollama or a compatible workshop server.
6. [Wake up your lantern](06-webpage.md) — launch the local webpage, connect and test text chat.
7. [Get an ElevenLabs API key](07-voice.md) — add speech after the webpage is working.

Stuck? Open [Troubleshooting](08-troubleshooting.md).

## How it works

```text
Your browser → inference server → character's reply
Your browser → ElevenLabs → audio through your computer
Your browser → USB serial → ESP32-C3 → three WS2812B LEDs on GPIO 4
```

The ESP32 does not run the language model or play audio. Keep it plugged into the computer for the webpage's USB light control. Wi-Fi configuration on the ESP32 is a separate feature; it is not required for the serial command loop.

## What is ready?

| Part | Status |
| --- | --- |
| Laser files | Included; use FabLab's approved settings for 3 mm MDF |
| Local chat webpage | Implemented; requires a compatible inference server |
| ElevenLabs speech | Implemented; requires your own usable API key and voice |
| ESP32 serial commands | Implemented: `0`, `1`, `t` at 115200 baud |
| Three WS2812B RGB LEDs | Implemented on D2 / GPIO 4; hardware test pending |
| Final lantern assembly sequence | Confirm against the workshop sample before gluing |

You can prepare the files and run the chat now. Complete the hardware checks with the organizer before soldering the board connections or powering the LED assembly.

## Sources

Machine operation stays with [FabLab Guides](https://www.fablabguides.dk/), where the workshop takes place. Each chapter links to the relevant software or hardware documentation. This wiki does not reproduce FabLab's images or machine instructions; follow the linked guide and the instructor at the machine.
