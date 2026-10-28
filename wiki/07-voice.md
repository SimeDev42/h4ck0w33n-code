# 7 · Get an ElevenLabs API key

[Previous: webpage](06-webpage.md) · [Wiki home](README.md) · [Troubleshooting](08-troubleshooting.md)

Keep the [local webpage](06-webpage.md) and its server running. Confirm text chat works before adding voice.

ElevenLabs turns the character's reply into audio. You can skip it and turn **Speak** off to use text chat.

1. Create or sign into your own [ElevenLabs account](https://elevenlabs.io/).
2. Open **Developers** (bottom left corner) **→ API Keys** and create a key with a recognizable name, such as `Lantern workshop`.
3. Grant the permissions needed for **text-to-speech** and **reading/listing voices**. Keep other permissions disabled. Set a usage limit if available.
4. Copy the key when it is shown; the complete value is only displayed at creation. Follow the [official API-key instructions](https://elevenlabs.io/docs/help-center/technical/how-do-i-authorize-myself-using-an-api-key).
5. In the local lantern webpage, expand **ElevenLabs API key** and paste it into the password field. Leave the field to trigger its change handler.
6. Enable **Speak**, select a voice or keep automatic selection, and test a short reply. **Hear the voices** provides samples; a sample playing does not prove your plan permits generating speech with that voice.

The app currently requests `eleven_turbo_v2_5` audio. Voice and model availability depend on your account. If a voice is rejected, choose another available voice; the app remembers rejected voices and can skip them. Use **Forget voices blocked by my plan** after changing access if needed. Check your account's current usage allowance; no particular free quota is assumed here.

When a reply is spoken, the browser plays the audio and sends USB light commands. The strip switches orange on/off with those commands; it does not change colour based on the text.

## Where the key goes

This local app saves the key in this browser's `localStorage` and sends it to `api.elevenlabs.io`. The password field masks its appearance; it does not encrypt browser storage. Use your own computer/profile, never put the key in a screenshot, repository or shared project file, and never distribute one organizer key inside the webpage.

At the end, clear the key field and leave it to save the empty value, or clear site storage for the exact local origin you used. You can revoke the workshop key in ElevenLabs. Replies sent for speech are processed by ElevenLabs even when the language model runs locally.

**Checkpoint:** a generated reply plays through your computer or headphones. The ESP32 has no audio output in this project.
