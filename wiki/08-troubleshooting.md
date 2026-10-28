# Troubleshooting

[Wiki home](README.md)

Work through one subsystem at a time: webpage → model → speech → USB → LEDs.

| Problem | Check / next step |
| --- | --- |
| LightBurn dimensions look wrong | Confirm units and original dimensions; prefer the `.lbrn2` project over importing all DXFs. Ask staff before cutting. |
| MDF does not cut through | Leave the sheet in place and ask the instructor to check focus, material and settings. Do not guess a higher power or rerun after moving it. |
| Tabs do not fit | Check actual thickness, original scale and the test joint. Do not force or glue an incorrect fit. |
| `pio` is not found | Use the PlatformIO Core CLI terminal inside VS Code. |
| Firmware build fails | Confirm `esp32_code` is open, use `-e esp32-c3`, allow dependencies to finish downloading and preserve the first error for the organizer. |
| Board is missing from the port list | Try a known data cable, another USB port and a direct connection. Confirm the exact board's driver/boot procedure with the instructor. |
| Linux reports permission denied for a serial port | Follow [Linux USB access](04-firmware.md#linux-usb-access): install udev rules, reconnect and check the device group. Log out/in after a group change. |
| Linux browser cannot access a port that PlatformIO can use | Check Web Serial support and any Snap/Flatpak device restrictions. Reopen the browser after permission changes. |
| Ollama works in a terminal but the Linux service ignores CORS settings | Set the environment in the [systemd override](05-local-ai.md#linux-systemd-service-configure-cors-if-needed) and restart the service. Shell variables do not configure an already running service. |
| Port is busy or upload cannot open it | Close Serial Monitor and disconnect the browser USB session; retry with only one port owner. |
| Upload succeeds but the board behaves unexpectedly | Verify the C3 environment, actual board compatibility and custom partition layout. Ask the organizer before erasing. |
| Wi-Fi credentials cannot be saved | The firmware README documents NVS exhaustion. An erase and upload may recover it, but erase removes saved credentials. |
| RGB LEDs remain dark after upload | Confirm the updated firmware is uploaded, DIN is connected to D2 / GPIO 4, and the approved supply and common ground are present. Run the light test after closing Serial Monitor. |
| LEDs behave erratically with updated firmware | Disconnect power and inspect data direction, common ground, supply, level shifting and joints with the instructor. |
| Webpage returns 404 | Start Python in the project root; use `/hack_your_lantern/` with underscores. |
| Python command is missing | Install Python 3; use `python3` on macOS/Linux and `py` or `python` on Windows. Reopen the terminal after installation. |
| Port 8000 is already in use | Stop your previous server or choose another port. Update the browser URL and any explicit Ollama allowed origin to match. |
| No models appear | Check `/v1/models`, Ollama/server status, downloaded models, address and CORS. The Python server is not an inference server. |
| Shared server is unreachable | Ask the organizer for the correct address and network. Keep normal internet access; the ESP32 setup Wi-Fi is not an inference network. |
| First reply takes a long time | The model may be loading or running slowly on your hardware. Try a smaller locally available model or the organizer's server. |
| No USB picker | Use desktop Chrome/Edge on localhost, click Connect directly and check browser policy/permissions. |
| USB disconnects after reset | Wait for the board to reappear, then reconnect through the browser chooser. |
| A voice sample plays but generated speech fails | Samples can be public. Check API key, permissions, quota and whether your plan allows the selected voice. |
| Replies appear but no audio | Enable Speak; check system volume/output, API key, voice status and account quota. |
| Voice stays blocked after a plan change | Use Forget voices blocked by my plan, then try an eligible voice again. |
| Wake it up does nothing | Fill both object and personality fields; the empty field receives focus. |

When asking for help, share your OS, board model, the step you reached and the exact error. Do not include API keys or Wi-Fi passwords in screenshots or logs.
