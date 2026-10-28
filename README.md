# H4CK-O-W33N · Build a talking lantern

Laser-cut a lantern from 3 mm MDF, add an ESP32-C3 and three WS2812B RGB LEDs, then give it a personality through the local browser app.

**[Start the project wiki →](wiki/README.md)**

| Folder | Contents |
| --- | --- |
| `laser-files/` | LightBurn project, SVG and individual DXF files |
| `esp32_code/` | PlatformIO firmware project |
| `hack_your_lantern/` | Local webpage for personality, chat, voice and USB control |
| `wiki/` | Workshop guide and troubleshooting |

**Hardware:** the firmware drives three WS2812B LEDs from D2 (GPIO 4), using orange at 25% brightness. Confirm supply, grounding and data-level compatibility before connecting the strip; physical hardware verification is still required.

## Open the webpage

From this folder, run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

On Windows use `py` instead of `python3`. Open [the local app](http://localhost:8000/hack_your_lantern/) in desktop Chrome or Edge. The app needs a running OpenAI-compatible inference server for chat, your own ElevenLabs API key for speech, and a browser-authorized USB connection for the light. Follow the wiki for setup.