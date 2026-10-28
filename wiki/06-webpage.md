# 6 · Wake up your lantern

[Previous: local AI](05-local-ai.md) · [Wiki home](README.md) · [Next: voice](07-voice.md)

## Start the local webpage

Open a terminal in the project root, where you can see `hack_your_lantern`.

Windows / macOS / Linux:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

If `py` is unavailable but Python is installed, try `python` instead. Keep the terminal open. Open **[http://localhost:8000/hack_your_lantern/](http://localhost:8000/hack_your_lantern/)** in a web browser. The folder uses underscores. Do not double-click `index.html` to open it as a `file://` URL.

The local server serves files; it does not install or start Ollama. Its loopback binding keeps it local to your computer. Web Serial requires a secure context; browsers treat localhost specially. Ordinary HTTP pages on a LAN IP are not equivalent. See [Chrome's Web Serial documentation](https://developer.chrome.com/docs/capabilities/serial). HTTPS itself is not a reason that a USB picker cannot work, although HTTPS pages can encounter restrictions when requesting a plain-HTTP inference server.

## Connect the services

1. Under **Connect & speak**, set **Server** to your local or organizer-provided inference server. Leave the field or press Enter to apply it.
2. Wait for models to load and choose one.
3. Turn **Speak** off. First get text chat working; you will add a voice in the next chapter.
4. On Linux, complete the [USB access setup](04-firmware.md#linux-usb-access) first. For USB control, plug in the ESP32 and close PlatformIO Serial Monitor. Click **Connect**, select the board in the browser chooser, and confirm.
5. Use **Test light** only with the confirmed hardware and appropriate firmware. The firmware controls three WS2812B LEDs on D2 (GPIO 4). If a reset drops the serial connection, reconnect in the browser.

## Give it a personality

1. Under **What did you make?**, describe your actual lantern: its shape, material and details.
2. Under **Its personality**, describe how it should behave and speak. Example: “A sleepy lighthouse keeper who speaks in short sentences and loves terrible puns.”
3. Alternatively choose a starter, then edit both fields. **Surprise me** fills a random preset.
4. Click **Wake it up**. Both fields must contain text.
5. Wait for its first reply, type a message, then click **Send** or press Enter.
6. Use **Start over** to return to the personality form and begin a new conversation.

## Continue to voice

Once text replies and **Test light** work, leave the webpage and local server running and continue to [voice setup](07-voice.md).

## When you finish the session

Disconnect the USB session before uploading firmware again. Stop the Python server with **Ctrl+C**. Remove your API key on a shared computer and unplug the board when finished. The server address and voice-related settings can persist in browser storage; conversation history is not saved by the app across a reload.

**Checkpoint:** the local webpage opens, text chat works, and the assembled three-LED strip passes **Test light**. Voice comes next.
