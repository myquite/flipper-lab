# Flipper Lab

A browser app for controlling a [Flipper Zero](https://flipperzero.one/) over USB and learning what it can do.

**Live:** https://myquite.github.io/flipper-lab/

## Features

- **Dashboard**: device info, battery, SD card, LED and vibration controls.
- **Screen**: live screen mirror and remote control (the same protobuf RPC protocol qFlipper uses), plus screenshots.
- **Learn**: 14 interactive lessons covering Infrared, Sub-GHz, RFID, NFC, iButton, GPIO, BadUSB, U2F, apps, JavaScript and the CLI. Lessons have missions, XP, badges and quizzes, and the app checks your Flipper to see when you complete a step.
- **Files**: browse the SD card, with plain-English explanations of saved signal and card files.
- **Console**: a full Flipper CLI terminal.

## Requirements

- A desktop browser with [Web Serial](https://developer.mozilla.org/docs/Web/API/Web_Serial_API) support: Chrome, Edge or Chromium. Firefox and Safari don't support it.
- A Flipper Zero connected by USB, with qFlipper closed (only one program can use the port).
- On Linux, your user needs access to the serial port (for example, membership in the `uucp` or `dialout` group).

Progress is stored in your browser's localStorage.

## Run locally

```sh
./serve.sh   # http://localhost:8080
```

It's a static site with no build step. `serve.py` just serves `web/` with caching disabled. Web Serial only works on `localhost` or HTTPS.

## Deploy

Every push to `main` publishes `web/` to GitHub Pages through `.github/workflows/pages.yml`.

## Disclaimer

Only use the Flipper's radio and card features on devices you own or have permission to test, and follow your local laws on transmitting.
