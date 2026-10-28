# 5 · Set up local AI (optional installation)

[Previous: firmware](04-firmware.md) · [Wiki home](README.md) · [Next: webpage](06-webpage.md)

The webpage needs an **OpenAI-compatible inference server** for generated replies. Installing Ollama on your own computer is optional if you use an organizer-provided compatible server. This webpage does not send inference API keys or directly support authenticated cloud providers; a cloud API key alone will not work in the Server field. The webpage does not require the ESP32-C3 to run the AI; it only uses the board for light control.

## Run Ollama on your computer

1. Install [Ollama](https://ollama.com/download) for your operating system. On macOS/Windows, open the app. On Linux, follow the [official Linux installation guide](https://docs.ollama.com/linux) and start the service. Follow the [official quickstart](https://docs.ollama.com/quickstart).
2. Open a terminal on macOS or Linux, or PowerShell on Windows.
3. Download and try one of the workshop models:

```sh
ollama run smallthinker:3b
```

`smallthinker:3b` is one of the models we will test; performance depends on your computer. Wait for the download, type a short message, and confirm a reply. Enter `/bye` to leave the chat. Keep the Ollama service running.

4. Open `http://localhost:11434/v1/models` in your browser. A working server returns JSON listing models.
5. In the lantern webpage, leave **Server** blank or enter `localhost:11434`, then select your downloaded model. The code prefers `ornith-1.5:9b` if present, but you do not need that model; choose an available one in the dropdown.

## Models we will test

The workshop will compare these four models:

- `smallthinker:3b`
- `qwen3:8b`
- `granite4.2:8b`
- `ornith-1.5:9b`

To download them ahead of the workshop, run:

```sh
ollama pull smallthinker:3b
ollama pull qwen3:8b
ollama pull granite4.2:8b
ollama pull ornith-1.5:9b
```

You do not need to download all four to get started. Choose one that runs comfortably on your computer. If a tag cannot be found, ask the organizer for its exact registry name or workshop model package.

### Try any other Ollama model

You are free to explore the [Ollama model library](https://ollama.com/library) and pull other models. Copy the model's exact name and tag from its page:

```sh
ollama pull MODEL_NAME:TAG
```

Replace `MODEL_NAME:TAG` with your chosen model; it is a placeholder. Use a model that supports text chat for this lantern app—an embedding-only model cannot generate conversation replies.

Run `ollama list` to see your downloaded models. After pulling a new one, reload the lantern webpage and choose it in **Model**. Reloading clears the current conversation, so do this before starting a new chat. The dropdown lists models from the selected server; it is not restricted to the workshop's four choices. Models pulled on your computer will not appear when you are connected to someone else's server.

## Linux: check the Ollama service

If your installation uses systemd, start and check the installed service:

```sh
sudo systemctl start ollama
systemctl status ollama
```

On systems without an Ollama service, run `ollama serve` in a terminal and leave it open. Use a second terminal for `ollama pull` and `ollama run`.

## Use a workshop server instead

Enter the exact address provided by the organizer in **Server**. A bare IP uses port `11434` and path `/v1`; a different port or API path must be specified explicitly. The server must be reachable from your computer and allow requests from your webpage's origin. Do not put a secret API key into the Server field. This UI does not provide inference-server authentication.

## If models do not load

First check that the server is running and that `/v1/models` opens. If it opens directly but the webpage cannot load models, inspect the browser error for CORS. CORS is a browser rule controlling which sites may access a server.

For local Ollama, quit the existing Ollama app/service before launching a temporary instance with these settings. Do not run a second server on the same port.

macOS Terminal (or a manually started Linux server):

```sh
OLLAMA_ORIGINS="http://localhost:8000,http://127.0.0.1:8000" ollama serve
```

Windows PowerShell:

```powershell
$env:OLLAMA_ORIGINS="http://localhost:8000,http://127.0.0.1:8000"
ollama serve
```

Keep that terminal open while using the webpage. These settings apply to this launched process. For persistent OS-specific configuration, see the [Ollama FAQ](https://docs.ollama.com/faq). Keep a personal server on its default loopback interface; workshop network hosting is an organizer task.

### Linux systemd service: configure CORS if needed

For an Ollama systemd service, set the allowed origins on the service rather than in your shell:

```sh
sudo systemctl edit ollama
```

Add this override and save:

```ini
[Service]
Environment="OLLAMA_ORIGINS=http://localhost:8000,http://127.0.0.1:8000"
```

Then apply it:

```sh
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

This restarts the local inference service, so finish any running requests first. See the [Linux service configuration guide](https://docs.ollama.com/linux). Do not also run a manual server on port 11434.

**Checkpoint:** the webpage lists a model and can get a text reply with **Speak** turned off.
