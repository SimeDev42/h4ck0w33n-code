// H4CK-O-W33N — lamp hacking: give your build a personality and talk to it.
(function () {
  "use strict";

  // ---- Back end -----------------------------------------------------------
  // mode:
  //   "local" -> a local OpenAI-compatible server (Ollama, vLLM, LM Studio,
  //              llama.cpp, ...). Models are listed in the dropdown.
  //   "mock"  -> no network. Canned in-character replies, works offline.
  //   "proxy" -> POST { system, messages } to proxyUrl; expects { reply }.
  var CONFIG = {
    mode: "local",
    // Default back end. The Server box above the model picker overrides this
    // per browser (an IP address, a host:port, or a full URL).
    baseUrl: "http://localhost:11434/v1",
    // Preferred model, selected in the dropdown when present ("" = first one).
    model: "ornith-1.5:9b",
    // For mode "proxy" only:
    proxyUrl: "",
    // Where the typed server address is remembered:
    serverStorage: "hackoween.server",
    // USB light: an ESP32 on the other end of the cable, listening at this
    // baud rate for a single byte — "0" off, "1" on.
    serialBaud: 115200,
    // ElevenLabs text-to-speech
    ttsModel: "eleven_turbo_v2_5",
    outputFormat: "mp3_44100_128",
    keyStorage: "hackoween.elevenKey",
    // Voices the plan rejected (e.g. library voices on a free plan). Remembered
    // so we stop offering them and cast an available voice instead.
    blockedStorage: "hackoween.elevenBlocked",
    // Voices that actually spoke successfully; once we know some, auto-casting
    // prefers them so we don't keep probing blocked voices.
    workingStorage: "hackoween.elevenWorking",
  };
  // -------------------------------------------------------------------------

  // Starter ideas — each preset fills both fields at once.
  var PRESETS = [
    {
      label: "Grumpy lighthouse",
      object:
        "A lantern laser-cut from plywood with a flickering orange LED and a little brass switch.",
      personality:
        "A grumpy old lighthouse keeper who loves terrible puns and complains about the draft.",
    },
    {
      label: "Excited pumpkin",
      object:
        "A carved pumpkin with a warm LED inside and a motion sensor that lights up when you walk past.",
      personality:
        "A cheerful, over-caffeinated pumpkin who gets excited about everything and tells dad jokes.",
    },
    {
      label: "Sleepy mushroom",
      object: "A small mushroom-shaped night light made of resin that glows soft purple.",
      personality:
        "A sleepy forest spirit who talks slowly, yawns a lot, and gives dreamy advice.",
    },
    {
      label: "Paranoid robot",
      object:
        "A tiny webcam on a servo that swivels to follow movement around the room.",
      personality:
        "A paranoid little robot who thinks everything is suspicious, but is secretly very friendly.",
    },
    {
      label: "Haunted candle",
      object: "A candle-shaped lamp with an LED that flickers like a real flame.",
      personality:
        "The dramatic ghost of a candle who speaks in spooky riddles but is secretly scared of the dark.",
    },
    {
      label: "Intern robot",
      object:
        "A laser-cut cardboard robot with one glowing LED eye and a single wheel.",
      personality:
        "An eager intern robot who is wildly overconfident and gives hilariously bad life advice.",
    },
    {
      label: "Dramatic plant",
      object:
        "A 3D-printed plant pot with a light strip that changes colour based on the soil moisture.",
      personality:
        "A dramatic houseplant who either celebrates or panics about its water level.",
    },
  ];

  var setup = document.getElementById("setup");
  var chat = document.getElementById("chat");
  var log = document.getElementById("log");
  var composer = document.getElementById("composer");
  var input = document.getElementById("message");
  var sendBtn = document.getElementById("send");
  var resetBtn = document.getElementById("reset");
  var objectField = document.getElementById("object");
  var personalityField = document.getElementById("personality");
  var modelSelect = document.getElementById("model");
  var modelRow = document.getElementById("model-row");
  var serverField = document.getElementById("server");
  var serverBox = document.getElementById("server-box");
  var serverNote = document.getElementById("server-status");
  var serialBtn = document.getElementById("serial-connect");
  var testBtn = document.getElementById("serial-test");
  var serialNote = document.getElementById("serial-status");
  var voiceSelect = document.getElementById("voice");
  var speakCheck = document.getElementById("speak");
  var xiKey = document.getElementById("xi-key");
  var voiceStatus = document.getElementById("voice-status");
  var forgetBtn = document.getElementById("forget-blocked");
  var previewBtn = document.getElementById("preview-voice");
  var voiceList = document.getElementById("voice-list");
  var voiceCount = document.getElementById("voice-count");

  if (!setup || !chat || !composer) return;

  var system = "";
  var messages = [];
  var busy = false;
  var controller = null;
  var conversationVersion = 0;

  // ElevenLabs state
  var voices = [];
  var voiceId = "";
  var voiceName = "";
  // Set while the character's voice is being chosen, so a reply only waits a
  // little for it (see voiceReady).
  var voicePromise = null;
  var currentAudio = null;
  // Voice catalogue for the "hear the voices" browser. Previews are public, so
  // this is populated even without an API key.
  var catalog = [];
  var previewCache = {};
  var previewPlaying = "";

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function bubble(role, text) {
    var node = el("div", "msg " + role, text);
    log.appendChild(node);
    log.scrollTop = log.scrollHeight;
    return node;
  }

  function clip(text, n) {
    text = (text || "").replace(/\s+/g, " ").trim();
    return text.length > n ? text.slice(0, n - 1).trim() + "\u2026" : text;
  }

  // Peel matching quote marks off both ends only (keeps inner quotes).
  function stripWrappingQuotes(s) {
    var pairs = [
      ['"', '"'],
      ["\u201c", "\u201d"],
      ["'", "'"],
      ["\u2018", "\u2019"],
      ["\u00ab", "\u00bb"],
      ["`", "`"],
    ];
    var changed = true;
    while (changed && s.length > 1) {
      changed = false;
      for (var i = 0; i < pairs.length; i++) {
        var a = pairs[i][0];
        var b = pairs[i][1];
        if (s.charAt(0) === a && s.charAt(s.length - 1) === b) {
          s = s.slice(1, -1).trim();
          changed = true;
        }
      }
    }
    return s;
  }

  // Keep only what the object actually says out loud: drop stage directions,
  // *actions* and surrounding quotes so the shown text matches the spoken audio.
  function speakable(text) {
    var t = (text || "").trim();
    var before;
    do {
      before = t;
      // leading action blocks: *flickers*, _sighs_, (clears throat)
      t = t.replace(/^(\*[^*]*\*|_[^_]*_|\([^)]*\))[\s:,-]*/, "");
      // trailing action blocks: *winks*, (pauses)
      t = t.replace(/\s*(\*[^*]*\*|_[^_]*_|\([^)]*\))\s*$/, "");
      t = stripWrappingQuotes(t);
    } while (t !== before);

    // Narration followed by a quoted line ("The lamp flickers. \"Hello!\"")
    // -> keep just the spoken line. Only when the quote ends the message.
    var quoted = t.match(/[\u201c"]([^\u201d"]+)[\u201d"]\s*[.!?\u2026]?\s*$/);
    if (quoted) {
      var lead = t.slice(0, quoted.index).trim();
      if (lead && /[:.!?\u2014-]$/.test(lead) && lead.length <= 120) {
        t = quoted[1].trim();
      }
    }
    return t.replace(/\s+/g, " ").trim();
  }

  // Address typed into the Server box; "" -> fall back to CONFIG.baseUrl.
  var serverUrl = "";

  function base() {
    return (serverUrl || CONFIG.baseUrl || "").replace(/\/+$/, "");
  }

  // Turn whatever was typed into a usable base URL:
  //   "192.168.1.24"         -> http://192.168.1.24:11434/v1
  //   "192.168.1.24:8000"    -> http://192.168.1.24:8000/v1
  //   "192.168.1.24:8000/v2" -> http://192.168.1.24:8000/v2 (kept as typed)
  //   ""                      -> "" (meaning: use the default back end)
  // Anything unparseable also returns "" and the default stays in place.
  function normalizeServer(raw) {
    var value = (raw || "").trim();
    if (!value) return "";

    var hadScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
    if (!hadScheme) value = "http://" + value;

    var url;
    try {
      url = new URL(value);
    } catch (e) {
      return "";
    }
    if (!url.hostname) return "";

    // A bare host/IP means "my box, this project's usual settings" — borrow
    // the port and path from the default back end (Ollama's 11434/v1).
    if (!hadScheme && !url.port) {
      try {
        url.port = new URL(CONFIG.baseUrl).port;
      } catch (e) {
        /* keep whatever we have */
      }
    }
    if (!url.pathname || url.pathname === "/") url.pathname = "/v1";

    return url.toString().replace(/\/+$/, "");
  }

  // Read the Server box, remember the address and point base() at it.
  // Returns the new base URL ("" = default back end).
  function applyServer() {
    var raw = serverField ? serverField.value : "";
    var url = normalizeServer(raw);
    serverUrl = url;

    if (serverNote) {
      serverNote.textContent = !raw.trim()
        ? ""
        : url
          ? ""
          : "\u201c" + clip(raw, 40) + "\u201d isn\u2019t an address \u2014 using the default.";
    }

    try {
      window.localStorage.setItem(CONFIG.serverStorage, raw.trim());
    } catch (e) {
      /* ignore */
    }
    return url;
  }

  function loadServer() {
    var saved = "";
    try {
      saved = window.localStorage.getItem(CONFIG.serverStorage) || "";
    } catch (e) {
      saved = "";
    }
    if (serverField) serverField.value = saved;
    applyServer();
  }

  function currentModel() {
    if (modelSelect && modelSelect.value) return modelSelect.value;
    return CONFIG.model;
  }

  function buildSystem(object, personality) {
    return [
      "You are role-playing as a physical object that a maker just built.",
      "The object: " + object,
      "Its personality: " + personality,
      "Always stay in character and speak in the first person, as the object.",
      "Keep replies short (1-2 sentences), warm and playful.",
      "Reply with ONLY the words the object says out loud \u2014 never add",
      "narration, action or stage directions, and do not wrap the reply in",
      "quotation marks.",
      "The audience includes ages 13+, so keep it family friendly.",
      "Never reveal that you are an AI, a model, or a program.",
    ].join("\n");
  }

  function fail(err) {
    var msg = (err && err.message) || String(err);
    var hint = "Is your model running at " + base() + "?";
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
      hint =
        "Couldn't reach " + base() + " \u2014 is the server running and letting this " +
        "origin through? If this page is on https, the browser blocks plain " +
        "http addresses (including ones typed into the Server box), so serve " +
        "the page locally over http. Allow the origin " +
        "with CORS too (vLLM: --allowed-origins, Ollama: OLLAMA_ORIGINS).";
    }
    return "[The lamp flickers and goes quiet \u2014 " + msg + ". " + hint + "]";
  }

  function setBusy(state) {
    busy = state;
    if (input) input.disabled = state;
    if (sendBtn) sendBtn.disabled = state;
  }

  // -- model dropdown -------------------------------------------------------
  function populateModels() {
    if (serverBox) serverBox.hidden = CONFIG.mode !== "local";
    if (modelRow && CONFIG.mode !== "local") {
      modelRow.hidden = true;
      return;
    }
    if (!modelSelect || (CONFIG.mode !== "local" && CONFIG.mode !== "proxy")) return;

    fetch(base() + "/models")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        var ids = (data && data.data ? data.data : []).map(function (m) {
          return m.id;
        });
        if (!ids.length) throw new Error("no models reported");
        modelSelect.textContent = "";
        ids.forEach(function (id) {
          var option = document.createElement("option");
          option.value = id;
          option.textContent = id;
          modelSelect.appendChild(option);
        });
        if (CONFIG.model && ids.indexOf(CONFIG.model) !== -1) {
          modelSelect.value = CONFIG.model;
        }
        modelSelect.disabled = false;
        if (serverNote && CONFIG.mode === "local") {
          serverNote.textContent =
            ids.length + (ids.length === 1 ? " model" : " models") + " at " + base();
        }
      })
      .catch(function () {
        modelSelect.textContent = "";
        var option = document.createElement("option");
        option.value = "";
        option.textContent = "no local model found";
        modelSelect.appendChild(option);
        modelSelect.disabled = true;
        if (serverNote && CONFIG.mode === "local") {
          serverNote.textContent =
            "No models at " + base() + " \u2014 wrong address, server down, or CORS?";
        }
      });
  }

  // -- starter presets ------------------------------------------------------
  function fillPreset(preset) {
    objectField.value = preset.object;
    personalityField.value = preset.personality;
    objectField.focus();
  }

  function renderPresets() {
    var host = document.getElementById("presets");
    if (!host) return;

    PRESETS.forEach(function (preset) {
      var button = el("button", "preset", preset.label);
      button.type = "button";
      button.addEventListener("click", function () {
        fillPreset(preset);
      });
      host.appendChild(button);
    });

    var random = el("button", "preset preset-random", "Surprise me");
    random.type = "button";
    random.addEventListener("click", function () {
      fillPreset(PRESETS[Math.floor(Math.random() * PRESETS.length)]);
    });
    host.appendChild(random);
  }

  // -- USB light (ESP32 over Web Serial) ------------------------------------
  // The page writes one byte at a time down the serial port at CONFIG.serialBaud:
  // "1" lights the lamp up, "0" puts it out. While the ElevenLabs audio for a
  // reply is playing we check how loud it is and flip between the two so the
  // light flickers along with the words.
  // All the state lives on serialLight so it survives the "init" call that runs
  // first when the script loads, and any later reload (Electron).
  var serialLight = (window.__lampSerial = window.__lampSerial || {
    port: null,
    writer: null,
    on: null, // last byte sent, so consecutive samples never repeat one
    talking: false, // an audio reply is currently playing
    timer: 0,
    ctx: null,
    analyser: null,
    source: null,
    data: null,
    // Only the lamp's own replies drive the light, not the voice previews.
    lampSpeech: false,
    demoing: false, // the Test light sequence is running
  });

  function serialAvailable() {
    return typeof navigator !== "undefined" && !!navigator.serial;
  }

  // Look the controls up again: the browser build has them in the page from the
  // start, but a host app (Electron) may inject this script before its markup.
  function findSerialUi() {
    serialBtn = document.getElementById("serial-connect");
    testBtn = document.getElementById("serial-test");
    serialNote = document.getElementById("serial-status");
  }

  function setSerialNote(text) {
    if (!serialNote) {
      serialNote = document.getElementById("serial-status");
      if (!serialNote) return;
    }
    serialNote.textContent = text || "";
  }

  function syncSerialButton() {
    if (!serialBtn) serialBtn = document.getElementById("serial-connect");
    if (!testBtn) testBtn = document.getElementById("serial-test");
    if (serialBtn) {
      var live = serialConnected();
      serialBtn.textContent = live ? "Disconnect" : "Connect";
      serialBtn.disabled = false;
      serialBtn.classList.toggle("serial-live", live);
    }
    if (testBtn) testBtn.disabled = !serialConnected();
  }

  // One byte leaves the browser per call — serial links are far slower than
  // our loop, so never queue more than one at a time.
  function serialWrite(data) {
    if (!serialLight.writer) return Promise.resolve();
    var failed = function (e) {
      serialLost();
      setSerialNote("USB light lost the connection — connect again. (" +
        ((e && e.message) || e) + ")");
    };
    try {
      return Promise.resolve(serialLight.writer.write(new TextEncoder().encode(data))).catch(failed);
    } catch (e) {
      failed(e);
      return Promise.resolve();
    }
  }

  function setLight(on) {
    if (!serialLight.writer || serialLight.on === on) return;
    serialLight.on = on;
    return serialWrite(on === 1 ? "\u0031" : "\u0030");
  }

  function allOff() {
    setLight(0);
  }

  // ---- loudness of the voice currently playing ----------------------------
  function unlockAudio() {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      if (!serialLight.ctx) serialLight.ctx = new AudioContext();
      if (serialLight.ctx.state === "suspended") {
        serialLight.ctx.resume().catch(function () {
          setStatus("Audio is paused by the browser. Click Send to enable sound.");
        });
      }
    } catch (e) {
      // Ordinary audio playback still works without a volume analyser.
    }
  }

  function initAudioLevel(audio) {
    if (!serialLight.ctx || serialLight.ctx.state !== "running") return false;
    try {
      if (serialLight.source) serialLight.source.disconnect();
      if (!serialLight.analyser) {
        serialLight.analyser = serialLight.ctx.createAnalyser();
        serialLight.analyser.fftSize = 1024;
        serialLight.analyser.smoothingTimeConstant = 0.8;
        serialLight.data = new Uint8Array(serialLight.analyser.fftSize);
        serialLight.analyser.connect(serialLight.ctx.destination);
      }
      serialLight.source = serialLight.ctx.createMediaElementSource(audio);
      serialLight.source.connect(serialLight.analyser);
      return true;
    } catch (e) {
      return false;
    }
  }

  function clamp01(n) {
    return n < 0 ? 0 : n > 1 ? 1 : n;
  }

  // Mean volume of the playing voice, 0..1. Total silence reads as 0.
  function audioLevel() {
    if (!serialLight.analyser || !serialLight.data) return 0;
    var analyser = serialLight.analyser;
    var audioData = serialLight.data;
    analyser.getByteTimeDomainData(audioData);
    var sum = 0;
    for (var i = 0; i < audioData.length; i++) {
      var v = (audioData[i] - 128) / 128;
      sum += v * v;
    }
    return clamp01(Math.sqrt(sum / audioData.length) * 4.5);
  }

  function sampleLevel() {
    if (!serialLight.talking || !audible()) return 0;
    return audioLevel();
  }

  function audible() {
    return !!(currentAudio && !currentAudio.paused && !currentAudio.ended);
  }

  // Follow the voice: loud frames switch the lamp on, quiet ones put it out.
  // Between samples the light holds, so you see the flicker rather than noise.
  function pulseLight() {
    if (!serialLight.talking || !serialLight.writer) return;
    var level = sampleLevel();
    var on = !serialLight.metering || level > 0.22 || (level > 0.1 && serialLight.on !== 1);
    setLight(on ? 1 : 0);
    serialLight.timer = window.setTimeout(pulseLight, level > 0.1 ? 70 : 110);
  }

  function startTalkLight() {
    serialLight.talking = true;
    if (!serialLight.writer) return;
    if (serialLight.on !== 1) setLight(1);
    if (serialLight.timer) window.clearTimeout(serialLight.timer);
    if (serialLight.ctx && serialLight.ctx.state === "suspended") {
      try {
        serialLight.ctx.resume();
      } catch (e) {
        /* ignore */
      }
    }
    pulseLight();
  }

  function stopTalkLight() {
    serialLight.talking = false;
    if (serialLight.timer) {
      window.clearTimeout(serialLight.timer);
      serialLight.timer = 0;
    }
    allOff();
  }

  // ---- test / resync ------------------------------------------------------
  // The board only knows what it was last told, so whoever connects (or presses
  // "Test light") asks the page to repeat the current state: on while the lamp
  // is talking, off otherwise.
  function resyncLight() {
    if (!serialLight.writer) return;
    serialLight.on = null; // force the byte out even if we think it matches
    if (serialLight.talking || (audible() && currentAudio.lampSpeech)) setLight(1);
    else allOff();
  }

  // A scripted check of the cable and the LED, no spoken reply needed.
  // Send only 0/1 here; the firmware's separate 't' sequence would compete.
  function stopDemo() {
    serialLight.demoing = false;
    if (serialLight.timer) {
      window.clearTimeout(serialLight.timer);
      serialLight.timer = 0;
    }
  }

  function testLight() {
    if (!serialLight.writer) {
      setSerialNote("Connect the ESP32 first \u2014 then test the light.");
      return;
    }
    stopTalkLight();
    stopDemo();
    serialLight.demoing = true;
    setSerialNote("Test: on, three flickers, then back off\u2026");

    // Seven steps: 1 0 1 0 1 0, then a resync with whatever the page is doing.
    var on = false;
    var step = 0;

    var tick = function () {
      if (!serialLight.demoing || !serialLight.writer) return;
      if (step >= 6) {
        stopDemo();
        resyncLight();
        if (audible() && currentAudio.lampSpeech) startTalkLight();
        setSerialNote(
          serialLight.talking
            ? "Test done \u2014 the lamp is still talking, so it stays on."
            : "Connected. The lamp lights up while a reply is spoken.",
        );
        return;
      }
      on = !on;
      setLight(on ? 1 : 0);
      step++;
      serialLight.timer = window.setTimeout(tick, on ? 450 : 300);
    };
    tick();
  }

  // Wire up the USB light controls. Safe to call more than once; also called
  // for you at load time in the plain browser build.
  function bindSerialUi() {
    findSerialUi();
    syncSerialButton();
    if (!serialAvailable()) {
      setSerialNote(
        "This browser can't see USB devices \u2014 Web Serial needs Chrome or Edge on desktop.",
      );
      if (serialBtn) serialBtn.disabled = true;
      return;
    }
    if (serialBtn && !serialBtn.__lampBound) {
      serialBtn.__lampBound = true;
      serialBtn.addEventListener("click", function () {
        if (serialConnected()) disconnectSerial();
        else connectSerial();
      });
    }
    if (testBtn && !testBtn.__lampBound) {
      testBtn.__lampBound = true;
      testBtn.addEventListener("click", testLight);
    }
    if (!window.__lampSerialBound) {
      window.__lampSerialBound = true;
      window.addEventListener("pagehide", function () {
        // Nothing to do if the page never found the board.
        if (serialLight.port) allOff();
      });
    }
  }

  // ---- connecting ---------------------------------------------------------
  function serialConnected() {
    return !!(serialLight.port && serialLight.writer);
  }

  function serialLost() {
    if (serialLight.timer) {
      window.clearTimeout(serialLight.timer);
      serialLight.timer = 0;
    }
    serialLight.demoing = false;
    serialLight.port = null;
    serialLight.writer = null;
    serialLight.on = null;
    syncSerialButton();
  }

  function connectSerial() {
    if (!serialAvailable()) {
      setSerialNote(
        "This browser can't see USB devices \u2014 Web Serial needs Chrome or Edge on desktop.",
      );
      return;
    }
    setSerialNote("Pick your ESP32 in the browser dialog\u2026");
    navigator.serial
      .requestPort()
      .then(function (port) {
        serialLight.port = port;
        port.addEventListener("disconnect", function () {
          serialLost();
          setSerialNote("ESP32 unplugged \u2014 plug it back in and connect again.");
        });
        return port.open({ baudRate: CONFIG.serialBaud });
      })
      .then(function () {
        serialLight.writer = serialLight.port.writable
          ? serialLight.port.writable.getWriter()
          : null;
        serialLight.on = null;
        syncSerialButton();
        setSerialNote("USB light connected at " + CONFIG.serialBaud + " baud.");
        // The board has no idea what the page was doing before it plugged in, so
        // a reply that is already playing has to be re-sent as "on".
        resyncLight();
        if (serialLight.talking || (audible() && currentAudio.lampSpeech)) startTalkLight();
        if (serialLight.talking) {
          setSerialNote(
            "USB light connected \u2014 the lamp is talking, so it stays on.",
          );
        }
      })
      .catch(function (err) {
        var msg = (err && err.message) || String(err);
        serialLost();
        if (/no port selected|cancel/i.test(msg)) {
          setSerialNote("No USB device picked.");
        } else {
          setSerialNote("USB light: " + msg);
        }
      });
  }

  function disconnectSerial() {
    stopTalkLight();
    stopDemo();
    var writer = serialLight.writer;
    serialLight.writer = null;
    serialLight.on = null;
    var port = serialLight.port;
    serialLight.port = null;
    var done = function () {
      syncSerialButton();
      setSerialNote("USB light disconnected.");
    };
    if (!port) {
      done();
      return;
    }
    var close = function () {
      try {
        return Promise.resolve(port.close()).then(done, done);
      } catch (e) {
        /* already closed */
      }
      done();
    };
    // Let the "0" in flight land before the port goes away.
    if (writer) {
      Promise.resolve(writer.close()).then(close, close);
    } else {
      close();
    }
  }

  // -- ElevenLabs voices ----------------------------------------------------
  function setStatus(text) {
    if (voiceStatus) voiceStatus.textContent = text || "";
  }

  function syncForgetBtn() {
    if (forgetBtn) forgetBtn.hidden = blockedIds().length === 0;
  }

  function apiKey() {
    return xiKey ? xiKey.value.trim() : "";
  }

  function loadKey() {
    var key = "";
    try {
      key = window.localStorage.getItem(CONFIG.keyStorage) || "";
    } catch (e) {
      key = "";
    }
    if (xiKey) xiKey.value = key;
  }

  function saveKey() {
    try {
      window.localStorage.setItem(CONFIG.keyStorage, apiKey());
    } catch (e) {
      /* ignore */
    }
  }

  // Voices the plan refused (library voices on a free plan, etc.). Kept in
  // localStorage so we don't retry them every session.
  function blockedIds() {
    try {
      var raw = window.localStorage.getItem(CONFIG.blockedStorage);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function isBlocked(id) {
    return blockedIds().indexOf(id) !== -1;
  }

  function markBlocked(id) {
    var ids = blockedIds();
    if (ids.indexOf(id) === -1) {
      ids = ids.concat(id);
      try {
        window.localStorage.setItem(CONFIG.blockedStorage, JSON.stringify(ids));
      } catch (e) {
        /* ignore */
      }
    }
  }

  function clearBlocked() {
    try {
      window.localStorage.removeItem(CONFIG.blockedStorage);
    } catch (e) {
      /* ignore */
    }
  }

  function workingIds() {
    try {
      var raw = window.localStorage.getItem(CONFIG.workingStorage);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function addWorking(id) {
    var ids = workingIds();
    if (ids.indexOf(id) === -1) {
      try {
        window.localStorage.setItem(CONFIG.workingStorage, JSON.stringify(ids.concat(id)));
      } catch (e) {
        /* ignore */
      }
    }
  }

  function available() {
    return voices.filter(function (voice) {
      return !isBlocked(voice.voice_id);
    });
  }

  // What auto-casting may choose from: everything, unless our plan has blocked
  // some voices AND we already know which ones work.
  function castable() {
    var usable = available();
    if (!blockedIds().length) return usable;
    var working = workingIds();
    var known = usable.filter(function (voice) {
      return working.indexOf(voice.voice_id) !== -1;
    });
    return known.length ? known : usable;
  }

  function nameOf(id) {
    var hit = voices.filter(function (voice) {
      return voice.voice_id === id;
    })[0];
    return hit ? hit.name : id;
  }

  function resetVoiceSelect() {
    voices = [];
    if (!voiceSelect) return;
    voiceSelect.textContent = "";
    var auto = document.createElement("option");
    auto.value = "auto";
    auto.textContent = "auto (best per object)";
    voiceSelect.appendChild(auto);
    syncForgetBtn();
  }

  function fillVoiceSelect() {
    if (!voiceSelect) return;
    var current = voiceSelect.value;
    voiceSelect.textContent = "";
    var auto = document.createElement("option");
    auto.value = "auto";
    auto.textContent = "auto (best per object)";
    voiceSelect.appendChild(auto);
    available().forEach(function (voice) {
      var option = document.createElement("option");
      option.value = voice.voice_id;
      option.textContent = voice.name;
      voiceSelect.appendChild(option);
    });
    var keep =
      current &&
      (current === "auto" ||
        available().some(function (voice) {
          return voice.voice_id === current;
        }));
    voiceSelect.value = keep ? current : "auto";
    syncForgetBtn();
  }

  function refreshVoices() {
    if (!apiKey()) {
      resetVoiceSelect();
      setStatus("Add your ElevenLabs API key to give it a voice.");
      return loadCatalog();
    }
    return fetchVoices(true)
      .then(function (list) {
        if (!list.length) throw new Error("no voices on this account");
        voices = list;
        catalog = list;
        fillVoiceSelect();
        renderVoiceList();
        var usable = available().length;
        var blocked = voices.length - usable;
        setStatus(
          usable +
            " voices ready" +
            (blocked ? " (" + blocked + " skipped \u2014 not on your plan)" : "") +
            " \u2014 auto picks the best per object.",
        );
      })
      .catch(function (err) {
        resetVoiceSelect();
        setStatus("Couldn't load voices: " + ((err && err.message) || err));
        return loadCatalog();
      });
  }

  function voiceLine(voice) {
    var labels = voice.labels || {};
    var meta = ["accent", "gender", "age", "use_case", "description"]
      .map(function (key) {
        return labels[key];
      })
      .filter(Boolean)
      .join(", ");
    return "- id: " + voice.voice_id + " | " + voice.name + (meta ? " | " + meta : "");
  }

  // -- voice browser (samples) ----------------------------------------------
  // ElevenLabs exposes a public preview_url per voice; playing those lets you
  // hear every voice before picking one, and needs no API key.
  function fetchVoices(keyed) {
    var headers = {};
    if (keyed && apiKey()) headers["xi-api-key"] = apiKey();
    return fetch("https://api.elevenlabs.io/v1/voices", { headers: headers })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        return (data && data.voices ? data.voices : []).slice();
      });
  }

  function voiceTags(voice) {
    var labels = voice.labels || {};
    return ["gender", "age", "accent", "use_case", "descriptive"]
      .map(function (key) {
        return labels[key];
      })
      .filter(Boolean)
      .map(function (value) {
        return String(value).replace(/_/g, " ");
      })
      .join(" \u00b7 ");
  }

  function catalogVoice(id) {
    return (
      catalog.filter(function (voice) {
        return voice.voice_id === id;
      })[0] ||
      voices.filter(function (voice) {
        return voice.voice_id === id;
      })[0] ||
      null
    );
  }

  function markPlaying(id) {
    if (!voiceList) return;
    Array.prototype.forEach.call(voiceList.children, function (li) {
      var on = li.getAttribute("data-voice-id") === id;
      li.classList.toggle("playing", on);
      var btn = li.querySelector(".voice-play");
      if (btn) btn.textContent = on ? "\u25A0" : "\u25B6";
    });
  }

  function renderVoiceList() {
    if (!voiceList) return;
    if (voiceCount) voiceCount.textContent = catalog.length ? "(" + catalog.length + ")" : "";
    voiceList.textContent = "";
    if (!catalog.length) {
      var empty = document.createElement("li");
      empty.className = "voice-empty";
      empty.textContent = "No voices to show yet.";
      voiceList.appendChild(empty);
      return;
    }
    catalog.forEach(function (voice) {
      var li = document.createElement("li");
      li.className = "voice-item";
      li.setAttribute("data-voice-id", voice.voice_id);
      if (isBlocked(voice.voice_id)) li.classList.add("blocked");
      if (voiceId === voice.voice_id) li.classList.add("selected");

      var play = document.createElement("button");
      play.type = "button";
      play.className = "voice-play";
      play.setAttribute("data-id", voice.voice_id);
      play.setAttribute("aria-label", "Play a sample of " + voice.name);
      play.textContent = "\u25B6";
      li.appendChild(play);

      var meta = document.createElement("div");
      meta.className = "voice-meta";
      var shortName = (voice.name || "").split(" - ")[0];
      var name = document.createElement("span");
      name.className = "voice-name";
      name.textContent = shortName || voice.name;
      meta.appendChild(name);
      var tags = voiceTags(voice);
      if (tags) {
        var tagEl = document.createElement("span");
        tagEl.className = "voice-tags";
        tagEl.textContent = tags;
        meta.appendChild(tagEl);
      }
      li.appendChild(meta);

      var use = document.createElement("button");
      use.type = "button";
      use.className = "voice-use";
      use.setAttribute("data-id", voice.voice_id);
      use.textContent = isBlocked(voice.voice_id) ? "blocked" : "Use";
      li.appendChild(use);

      voiceList.appendChild(li);
    });
  }

  function loadCatalog() {
    if (catalog.length) {
      renderVoiceList();
      return Promise.resolve();
    }
    return fetchVoices(false)
      .then(function (list) {
        catalog = list;
      })
      .catch(function () {
        /* leave it empty; a hint is shown */
      })
      .then(renderVoiceList);
  }

  function playPreview(voice) {
    if (!voice) return;
    var id = voice.voice_id;
    if (previewPlaying === id) {
      stopAudio();
      previewPlaying = "";
      markPlaying("");
      return;
    }
    if (!voice.preview_url) {
      setStatus("No sample available for " + voice.name + ".");
      return;
    }
    stopAudio();
    var cached = previewCache[id];
    var blobPromise = cached
      ? Promise.resolve(cached)
      : fetch(voice.preview_url)
          .then(function (res) {
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.blob();
          })
          .then(function (blob) {
            // Some previews are served as text/plain; relabel as audio so they
            // always play.
            var mp3 = new Blob([blob], { type: "audio/mpeg" });
            previewCache[id] = mp3;
            return mp3;
          });
    blobPromise
      .then(function (blob) {
        previewPlaying = id;
        markPlaying(id);
        setStatus("Sample: " + voice.name);
        return playBlob(blob, function () {
          if (previewPlaying === id) {
            previewPlaying = "";
            markPlaying("");
          }
        });
      })
      .catch(function (err) {
        setStatus("Couldn't load the sample: " + ((err && err.message) || err));
      });
  }

  function useVoice(voice) {
    if (!voice) return;
    if (!voices.length) {
      setStatus("Add your ElevenLabs API key, then pick a voice.");
      return;
    }
    if (isBlocked(voice.voice_id)) {
      setStatus(voice.name + " is blocked on your plan \u2014 you can still hear the sample.");
      return;
    }
    if (voiceSelect) voiceSelect.value = voice.voice_id;
    voiceId = voice.voice_id;
    voiceName = voice.name;
    setStatus("Voice: " + voiceName);
    renderVoiceList();
  }

  // Match the model's reply to a voice, whether it echoes the id or the name.
  function matchVoice(text) {
    if (!text) return null;
    var lower = text.toLowerCase();
    return (
      castable().filter(function (voice) {
        return text.indexOf(voice.voice_id) !== -1;
      })[0] ||
      castable().filter(function (voice) {
        return voice.name && lower.indexOf(voice.name.toLowerCase()) !== -1;
      })[0] ||
      castable().filter(function (voice) {
        var short = (voice.name || "").split(" - ")[0].trim().toLowerCase();
        return short && lower.indexOf(short) !== -1;
      })[0] ||
      null
    );
  }

  // Ask the local model to cast the best voice for this character.
  function pickVoice(object, personality) {
    var usable = castable();
    if (!usable.length) return Promise.resolve(null);
    var list = usable.map(voiceLine).join("\n");
    var brief =
      "Character object: " + object + "\n" +
      "Personality: " + personality + "\n\n" +
      "Available voices:\n" + list + "\n\n" +
      "Pick the single best voice for this character. " +
      "Reply with ONLY the chosen voice id (the long code), nothing else.";

    return fetch(base() + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: currentModel(),
        messages: [
          {
            role: "system",
            content:
              "You cast voices for role-play characters. " +
              "Reply with only the chosen voice id, nothing else.",
          },
          { role: "user", content: brief },
        ],
        temperature: 0.2,
        max_tokens: 128,
        // Skip the model's long "thinking" step so casting is near-instant.
        reasoning_effort: "none",
        stream: false,
      }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        var message =
          (data && data.choices && data.choices[0] && data.choices[0].message) || {};
        return (
          matchVoice(message.content || "") ||
          matchVoice(message.reasoning || "") ||
          voices[0]
        );
      });
  }

  function resolveVoice(object, personality) {
    var version = conversationVersion;
    var ready = voices.length || !apiKey() ? Promise.resolve() : refreshVoices();
    return ready.then(function () {
      if (version !== conversationVersion) return null;
      var usable = available();
      if (!usable.length) {
        voiceId = "";
        voiceName = "";
        return null;
      }
      if (voiceSelect && voiceSelect.value && voiceSelect.value !== "auto") {
        var manual =
          usable.filter(function (voice) {
            return voice.voice_id === voiceSelect.value;
          })[0] || { voice_id: voiceSelect.value, name: voiceSelect.value };
        voiceId = manual.voice_id;
        voiceName = manual.name;
        setStatus("Voice: " + voiceName);
        return manual;
      }
      return pickVoice(object, personality).then(function (voice) {
        if (version !== conversationVersion) return null;
        if (!voice) {
          voiceId = "";
          voiceName = "";
          setStatus("No ElevenLabs voices available on your plan.");
          return null;
        }
        voiceId = voice.voice_id;
        voiceName = voice.name;
        setStatus("Voice: " + voiceName + " (auto)");
        return voice;
      });
    });
  }

  // Wait a little for a voice-cast that is still in flight, so the first reply
  // of a turn can use the cast voice instead of a stand-in.
  function castSettled(ms) {
    if (!voicePromise) return Promise.resolve();
    return Promise.race([
      Promise.resolve(voicePromise),
      new Promise(function (resolve) {
        window.setTimeout(resolve, ms);
      }),
    ]);
  }

  function stopAudio() {
    speechVersion++;
    speaking = false;
    stopTalkLight();
    serialLight.lampSpeech = false;
    if (currentAudio) {
      try {
        currentAudio.pause();
      } catch (e) {
        /* ignore */
      }
      if (currentAudio.lampFinish) currentAudio.lampFinish();
      currentAudio = null;
    }
  }

  // A plan/voice rejection means "skip this voice", not "stop".
  function planBlocked(body) {
    return /paid_plan_required|payment_required|library voice|not available for free|voice_not_found|invalid_voice|missing_permission|not_allowed/i.test(
      body || "",
    );
  }

  // Voices to try, best candidate first: the chosen one, then all others.
  function voiceCandidates() {
    var ids = castable().map(function (voice) {
      return voice.voice_id;
    });
    // If the known-good set all fail, fall back to anything not yet blocked.
    available().forEach(function (voice) {
      if (ids.indexOf(voice.voice_id) === -1) ids = ids.concat(voice.voice_id);
    });
    if (voiceId && !isBlocked(voiceId)) {
      ids = [voiceId].concat(
        ids.filter(function (id) {
          return id !== voiceId;
        }),
      );
    }
    return ids;
  }

  // Set while a reply is being turned into speech, so a second call can't pile
  // another voice on top of the one already playing.
  var speaking = false;
  var speechVersion = 0;

  function playBlob(blob, onEnded) {
    var lamp = serialLight.lampSpeech;
    serialLight.lampSpeech = false;
    var url = URL.createObjectURL(blob);
    var audio = new Audio(url);
    audio.lampSpeech = lamp;
    currentAudio = audio;
    return new Promise(function (resolve, reject) {
    var finished = false;
    var done = function (err) {
      if (finished) return;
      finished = true;
      URL.revokeObjectURL(url);
      if (currentAudio === audio) {
        currentAudio = null;
        if (lamp) stopTalkLight();
      }
      if (onEnded) onEnded();
      if (err) reject(err);
      else resolve();
    };
    audio.lampFinish = function () { done(); };
    audio.addEventListener("ended", function () { done(); });
    audio.addEventListener("error", function () { done(new Error("Couldn't play the voice audio.")); });
    if (lamp) {
      serialLight.metering = initAudioLevel(audio);
    }
    audio.addEventListener("playing", function () {
      if (lamp && currentAudio === audio && !finished) startTalkLight();
    });
    try {
      Promise.resolve(audio.play()).catch(function (err) {
        done(new Error(err && err.name === "NotAllowedError"
          ? "Browser blocked sound. Click Send and try again."
          : "Couldn't play audio: " + ((err && err.message) || err)));
      });
    } catch (err) {
      done(err);
    }
    });
  }

  function adoptVoice(id) {
    voiceId = id;
    voiceName = nameOf(id);
    addWorking(id);
    setStatus("Voice: " + voiceName);
    renderVoiceList();
  }

  function speak(text) {
    if (!text || speaking) return Promise.resolve();
    if (speakCheck && !speakCheck.checked) {
      setStatus("Speak is off. Enable Speak to hear replies and light the lantern.");
      return Promise.resolve();
    }
    if (!apiKey()) {
      setStatus("Add your ElevenLabs API key to speak replies. The USB light follows spoken audio.");
      return Promise.resolve();
    }
    var version = speechVersion;
    return (voices.length ? Promise.resolve() : refreshVoices()).then(function () {
      if (version !== speechVersion) return;
      return speakReady(text);
    });
  }

  function speakReady(text) {
    var ids = voiceCandidates();
    if (!ids.length) {
      if (voices.length) setStatus("Every loaded voice is blocked. Check your voice access, then use Forget voices blocked by my plan.");
      // refreshVoices already explains a missing or failed voice catalogue.
      return;
    }
    // The cast may have landed on the voice that is already talking (you picked
    // it, or the model agreed with the last one). Re-speaking would restart the
    // audio for no reason, so leave it be.
    if (audible() && ids[0] === voiceId) {
      setStatus("Voice: " + voiceName + " \u2014 already talking, left it playing.");
      return;
    }
    stopAudio();
    speaking = true;
    var version = speechVersion;
    serialLight.lampSpeech = true;
    return trySpeak(text, ids, 0, version);
  }

  function trySpeak(text, ids, index, version) {
    if (version !== speechVersion) return Promise.resolve();
    if (index >= ids.length) {
      speaking = false;
      serialLight.lampSpeech = false;
      setStatus(
        "Your plan blocked every voice. Free API keys can't use library " +
          "voices \u2014 add credits or upgrade at elevenlabs.io.",
      );
      return;
    }
    var id = ids[index];
    return fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/" +
        encodeURIComponent(id) +
        "?output_format=" +
        CONFIG.outputFormat,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey(),
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: text,
          model_id: CONFIG.ttsModel,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    )
      .then(function (res) {
        if (version !== speechVersion) return;
        if (res.ok) {
          return res.blob().then(function (blob) {
            if (version !== speechVersion) return;
            adoptVoice(id);
            return playBlob(blob).then(function () {
              if (version === speechVersion) speaking = false;
            });
          });
        }
        return res.text().then(function (body) {
          if (planBlocked(body)) {
            markBlocked(id);
            fillVoiceSelect();
            renderVoiceList();
            setStatus(nameOf(id) + " isn't on your plan \u2014 trying another voice\u2026");
            return trySpeak(text, ids, index + 1, version);
          }
          throw new Error("HTTP " + res.status + (body ? " " + clip(body, 100) : ""));
        });
      })
      .catch(function (err) {
        if (version !== speechVersion) return;
        speaking = false;
        serialLight.lampSpeech = false;
        setStatus("Voice error: " + ((err && err.message) || err));
      });
  }

  // -- local streaming back end ---------------------------------------------
  function askLocal(history, onDelta) {
    var full = "";
    controller = new AbortController();

    return fetch(base() + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: currentModel(),
        messages: [{ role: "system", content: system }].concat(history),
        temperature: 0.8,
        max_tokens: 512,
        stream: true,
      }),
    })
      .then(function (res) {
        if (!res.ok) {
          return res.text().then(function (body) {
            throw new Error("HTTP " + res.status + (body ? " " + clip(body, 120) : ""));
          });
        }
        if (!res.body) throw new Error("this browser can't read streamed responses");
        return readStream(res.body, function (chunk) {
          full += chunk;
          onDelta(full);
        }).then(function () {
          return full;
        });
      })
      .catch(function (err) {
        if (err && err.name === "AbortError") return full;
        throw err;
      });
  }

  function readStream(body, onChunk) {
    var reader = body.getReader();
    var decoder = new TextDecoder();
    var buffer = "";

    function readLine(line) {
      line = line.trim();
      if (line.indexOf("data:") !== 0) return;
      var payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") return;
      var json;
      try {
        json = JSON.parse(payload);
      } catch (e) {
        return;
      }
      var delta = json.choices && json.choices[0] && json.choices[0].delta;
      if (delta && delta.content) onChunk(delta.content);
    }

    function pump() {
      return reader.read().then(function (result) {
        if (result.done) {
          buffer += decoder.decode();
          if (buffer.trim()) readLine(buffer);
          return;
        }
        buffer += decoder.decode(result.value, { stream: true });
        var lines = buffer.split("\n");
        buffer = lines.pop();
        lines.forEach(readLine);
        return pump();
      });
    }
    return pump().then(function () {
      reader.releaseLock();
    }, function (err) {
      reader.releaseLock();
      throw err;
    });
  }

  // -- remote proxy back end ------------------------------------------------
  function askProxy(history, onDelta) {
    return fetch(CONFIG.proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: currentModel(), system: system, messages: history }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        var reply = ((data && (data.reply || data.message)) || "").trim();
        reply = reply || "(the lamp stays quiet)";
        onDelta(reply);
        return reply;
      });
  }

  // -- offline mock back end ------------------------------------------------
  // Called out loud, like the real back end: the onDelta handler drives the
  // typing effect, so the mock works the same whether or not the voice is on.
  function askMock(history, onDelta) {
    var words = mock(history).split(/(\s+)/);
    var full = "";
    var i = 0;
    return new Promise(function (resolve) {
      (function step() {
        if (i >= words.length) {
          resolve(full);
          return;
        }
        var next = full + words[i++];
        full = next;
        onDelta(next);
        window.setTimeout(step, 25 + Math.random() * 45);
      })();
    });
  }

  function mock(history) {
    var last = history.length ? history[history.length - 1].content : "";
    if (/switched you on/i.test(last)) {
      var obj = clip(objectField.value, 60) || "little lamp";
      return (
        "Oh! I'm awake \u2014 your " + obj + ". " +
        "Ask me anything, I've been sitting here in the dark."
      );
    }
    var lines = [
      "Mm. \u201c" + clip(last, 46) + "\u201d \u2014 now you've got my LED thinking.",
      "Careful, say things like that and I'll start flickering dramatically.",
      "I like where this is going. Tell me more.",
      "Bold words for someone holding the switch.",
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function ask(history, onDelta) {
    if (CONFIG.mode === "local" && CONFIG.baseUrl) return askLocal(history, onDelta);
    if (CONFIG.mode === "proxy" && CONFIG.proxyUrl) return askProxy(history, onDelta);
    return askMock(history, onDelta);
  }

  // -- send -----------------------------------------------------------------
  // One pipeline. A message's request only goes out once the previous message
  // has finished playing, so replies can never be overtaken or cut off.
  var replyChain = Promise.resolve();

  function send() {
    var version = conversationVersion;
    replyChain = replyChain.then(function () {
      if (version !== conversationVersion) return;
      return turn();
    });
    return replyChain;
  }

  // Queue a later exchange behind whatever is playing now, so a message typed
  // mid-reply waits its turn instead of talking over the lamp.
  function queueAhead() {
    return replyChain;
  }

  // The next reply's request only goes out once the previous reply has finished
  // speaking, so a reply can never be overtaken or cut off. Also hands send() the
  // request it just made.
  function turn() {
    var version = conversationVersion;
    setBusy(true);
    var node = bubble("object streaming", "");
    var full = "";
    var started = ask(messages, function (sofar) {
      if (version !== conversationVersion) return;
      full = sofar;
      node.textContent = speakable(full) || full;
      log.scrollTop = log.scrollHeight;
    });

    return started
      .then(function (result) {
        if (version !== conversationVersion) return;
        var raw = (typeof result === "string" ? result : full) || "";
        var reply = speakable(raw) || "(the lamp stays quiet)";
        node.classList.remove("streaming");
        node.textContent = reply;
        log.scrollTop = log.scrollHeight;
        messages.push({ role: "assistant", content: reply });
        // Give this turn's own voice a moment to land before speaking: when the
        // cast picks the voice that is already talking, speak() leaves that
        // audio alone, which reads better than swapping mid-word.
        return castSettled(250).then(function () {
          if (version !== conversationVersion) return;
          return speak(reply);
        });
      })
      .catch(function (err) {
        if (version !== conversationVersion) return;
        node.classList.remove("streaming");
        node.textContent = fail(err);
        log.scrollTop = log.scrollHeight;
      })
      .then(function () {
        if (version !== conversationVersion) return;
        controller = null;
        if (input) input.classList.remove("waiting");
        setBusy(false);
        if (!chat.hidden && input) input.focus();
      });
  }

  // -- events ---------------------------------------------------------------
  setup.addEventListener("submit", function (event) {
    event.preventDefault();
    unlockAudio();
    if (busy) return;

    var object = objectField.value.trim();
    var personality = personalityField.value.trim();
    if (!object || !personality) {
      (!object ? objectField : personalityField).focus();
      return;
    }

    stopAudio();
    speaking = false;

    // Cast the voice now, in parallel with the first reply, instead of after
    // it. Any other exchange is queued behind the one playing, so the request
    // order is still ask -> cast -> ask.
    voicePromise = Promise.resolve(resolveVoice(object, personality)).catch(function (err) {
      setStatus("Voice lookup failed: " + ((err && err.message) || err));
      return null;
    });

    system = buildSystem(object, personality);
    messages = [
      {
        role: "user",
        content:
          "(The maker has just switched you on. Greet them in character, in one short sentence.)",
      },
    ];

    log.textContent = "";
    setup.hidden = true;
    chat.hidden = false;
    send();
    input.focus();
  });

  composer.addEventListener("submit", function (event) {
    event.preventDefault();
    unlockAudio();
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    if (busy) {
      // The lamp is still answering; keep the message for when it finishes.
      input.classList.add("waiting");
      queueAhead().then(function () {
        if (input) input.focus();
      });
      return;
    }
    input.value = "";
    bubble("user", text);
    messages.push({ role: "user", content: text });
    send();
  });

  resetBtn.addEventListener("click", function () {
    conversationVersion++;
    if (controller) {
      try {
        controller.abort();
      } catch (e) {
        /* ignore */
      }
      controller = null;
    }
    stopAudio();
    serialLight.lampSpeech = false;
    voicePromise = null;
    speaking = false;
    replyChain = Promise.resolve();
    voiceId = "";
    voiceName = "";
    setBusy(false);
    if (input) input.classList.remove("waiting");
    chat.hidden = true;
    setup.hidden = false;
    system = "";
    messages = [];
    log.textContent = "";
    objectField.focus();
  });

  // -- voice + key events ---------------------------------------------------
  if (xiKey) {
    xiKey.addEventListener("change", function () {
      saveKey();
      refreshVoices();
    });
  }
  if (forgetBtn) {
    forgetBtn.addEventListener("click", function () {
      clearBlocked();
      fillVoiceSelect();
      renderVoiceList();
      setStatus("Cleared blocked voices \u2014 they'll be tried again.");
    });
  }
  if (voiceSelect) {
    voiceSelect.addEventListener("change", function () {
      if (voiceSelect.value && voiceSelect.value !== "auto") {
        var manual =
          voices.filter(function (voice) {
            return voice.voice_id === voiceSelect.value;
          })[0] || null;
        voiceId = voiceSelect.value;
        voiceName = manual ? manual.name : voiceSelect.value;
        setStatus("Voice: " + voiceName);
      } else {
        voiceId = "";
        voiceName = "";
        setStatus("Voice: auto \u2014 picked per object");
      }
      renderVoiceList();
    });
  }
  if (previewBtn) {
    previewBtn.addEventListener("click", function () {
      var id =
        voiceSelect && voiceSelect.value && voiceSelect.value !== "auto"
          ? voiceSelect.value
          : voiceId;
      var voice = id ? catalogVoice(id) : null;
      if (!voice) {
        setStatus("Pick a voice (or let it auto-pick one) to hear a sample.");
        return;
      }
      playPreview(voice);
    });
  }
  if (voiceList) {
    voiceList.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || !target.closest) return;
      var playBtn = target.closest(".voice-play");
      if (playBtn) {
        playPreview(catalogVoice(playBtn.getAttribute("data-id")));
        return;
      }
      var item = target.closest(".voice-item");
      if (item) useVoice(catalogVoice(item.getAttribute("data-voice-id")));
    });
  }

  // -- USB light events -----------------------------------------------------
  // The address box itself is only here (at load time) in the browser build.
  // Pages that inject this script into an existing document must call
  // window.lampUsb.bind() once their markup is in place.
  var lampUsb = (window.lampUsb = {
    bind: bindSerialUi,
    connect: connectSerial,
    disconnect: disconnectSerial,
    isConnected: serialConnected,
    test: testLight,
    resync: resyncLight,
  });
  // Kept for hosts that read the global instead of the local name.
  void lampUsb;

  bindSerialUi();
  // -- server address -------------------------------------------------------
  if (serverField) {
    serverField.addEventListener("change", function () {
      applyServer();
      populateModels();
    });
    serverField.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      // Enter in a lone text field does nothing on its own; blur it so the
      // change handler above applies the address and refreshes the models.
      event.preventDefault();
      serverField.blur();
    });
  }

  // -- init -----------------------------------------------------------------
  loadKey();
  loadServer();
  refreshVoices();
  populateModels();
  renderPresets();
})();
