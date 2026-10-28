# Security notes

This is a local workshop project. Its ESP32 web interface has no authentication: anyone who can reach the device can control its light, replace saved Wi-Fi credentials, or reset its Wi-Fi configuration. The setup access point is open and its setup form uses HTTP. Use a trusted workshop network and keep the device off public networks. USB control does not require configuring device Wi-Fi.

The browser stores a supplied ElevenLabs key in localStorage for the exact page origin. It sends the key to `api.elevenlabs.io`; generated speech text is also sent there. Clear the field and leave it to save the empty value on shared computers. Voice samples can play without a key and do not establish that speech generation is available to your account. Never commit a key or add it to the Server field.

The Server setting accepts unauthenticated OpenAI-compatible endpoints. Conversation text and the character description go to the configured inference server. Use a server you trust. The ESP32 stores Wi-Fi credentials in Preferences; this project does not configure encrypted flash storage.

The webpage loads Google Fonts and a remote event favicon. Public voice samples are fetched from ElevenLabs. Its dependencies and external services have not undergone a full security audit. A passing source scan does not prove that every possible secret or vulnerability has been detected.
