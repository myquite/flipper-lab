// Lesson content for the Learn tab.
//
// Step kinds:
//   info    – reading only; completes when you press "Got it".
//   do      – a task on the device; you tick it off yourself.
//   file    – auto-detected: completes when a new file appears in `dir` (matching `ext`),
//             or when the file at `path` changes. The saved file is then explained.
//   listen  – runs a receive command and counts matches of `match` (unique if `unique`)
//             until `goal` is reached.
//   run     – runs `cmd` and shows the output.
//   code    – an editor; saves `code` to `path` on the SD card, optionally runs `runCmd`.
//   pinout  – a "find the pin" game on the GPIO header.
//
// Every demo only receives, reads or works with your own devices.
const LESSONS = [
  {
    id: "basics",
    icon: "🐬",
    title: "First steps",
    blurb: "Meet your dolphin: buttons, menus, the idle screen and the live screen mirror.",
    steps: [
      {
        kind: "do", title: "Turn on the screen mirror",
        html: `<p>Press <b>Start screen mirror</b> on the right. Your Flipper's screen appears here in real time.
          While the mirror is on, the on-screen D-pad and your arrow keys, Enter (OK) and Backspace (Back) press the real buttons.</p>`,
      },
      {
        kind: "do", title: "Open the main menu",
        html: `<p>From the idle screen (the dolphin), press <b>OK</b>. Scroll with <b>Up/Down</b>. The main apps are:
          Sub-GHz, 125 kHz RFID, NFC, Infrared, GPIO, iButton, Bad USB, U2F, Apps and Settings.</p>
          <p>Press <b>Back</b> to leave a menu. <b>Hold Back</b> jumps all the way out to the idle screen.</p>`,
      },
      {
        kind: "do", title: "Explore the idle-screen shortcuts",
        html: `<p>On the idle screen, try each direction on the D-pad, both a short press and a long press.
          Each opens something different: the <b>Lock menu</b>, the <b>Archive</b> (file browser), the <b>Passport</b>, a clock or a favourite app.</p>
          <p>Later you'll learn to change these in Settings → Desktop.</p>`,
      },
      {
        kind: "do", title: "Check your Passport",
        html: `<p>Find the <b>Passport</b>. It shows your dolphin's name (the Dashboard shows yours once connected), level and mood.
          The dolphin earns XP every time you use a feature: reading cards, capturing signals, sending IR…
          These lessons will level it up too.</p>`,
      },
      {
        kind: "run", title: "Ask the Flipper who it is", cmd: "neofetch",
        html: `<p>Your Flipper also has a text command line over USB. This app uses it under the hood. Run a fun one:</p>`,
      },
    ],
    quiz: [
      { q: "How do you jump straight back to the idle screen from deep in a menu?", options: ["Press OK twice", "Hold Back", "Hold Up", "Press Left"], answer: 1, why: "Holding Back exits every menu level at once." },
      { q: "What makes your dolphin level up?", options: ["Charging it", "Using its features", "Leaving it idle", "Updating firmware"], answer: 1, why: "Every feature you use earns the dolphin XP." },
      { q: "While the screen mirror is running, which key presses OK?", options: ["Space", "Enter", "O", "Shift"], answer: 1, why: "Enter = OK, Backspace = Back, arrows = D-pad." },
    ],
  },

  {
    id: "settings",
    icon: "⚙️",
    title: "Make it yours",
    blurb: "Brightness, sounds, LED, auto-lock with a PIN, and custom shortcuts.",
    steps: [
      {
        kind: "do", title: "Tune notifications",
        html: `<p>Open <b>Settings → Notifications</b> (called <i>LCD and Notifications</i> on some versions). Adjust:</p>
          <ul><li><b>LCD backlight</b> and <b>backlight time</b></li><li><b>LED brightness</b></li><li><b>Volume</b> and <b>vibration</b></li></ul>
          <p>Tip: turning the backlight timeout up makes following these lessons easier.</p>`,
      },
      {
        kind: "do", title: "Set a PIN lock",
        html: `<p>Go to <b>Settings → Desktop</b>. Set a <b>PIN</b> (a sequence of arrow presses) and choose an <b>Auto Lock</b> time.</p>
          <p>Then lock the device from the idle screen's Lock menu and unlock it with your PIN.</p>
          <div class="note">Don't forget the PIN. You'd need a factory reset to remove it.</div>`,
      },
      {
        kind: "do", title: "Make your own shortcuts",
        html: `<p>In <b>Settings → Desktop → Keybinds</b>, assign apps to the idle-screen D-pad shortcuts (short and long presses).
          A good choice: put <b>Infrared</b> on one direction so your TV remote is always one press away.</p>`,
      },
      {
        kind: "do", title: "Check the system info",
        html: `<p>Open <b>Settings → About</b> and step through the pages: firmware version, hardware, and the regulatory info.
          <b>Settings → Power</b> shows battery health and lets you reboot or power off.</p>`,
      },
      { kind: "run", title: "Read the clock", cmd: "date", html: `<p>The Flipper has a real-time clock. Check that it's correct:</p>` },
    ],
    quiz: [
      { q: "What is a Flipper PIN made of?", options: ["Digits 0–9", "A sequence of D-pad presses", "A phone code", "An NFC tag"], answer: 1, why: "The PIN is entered with the arrow keys." },
      { q: "Where do you change what the idle-screen arrows open?", options: ["Settings → Desktop → Keybinds", "Settings → Power", "Apps → Tools", "Archive"], answer: 0, why: "Keybinds live under Settings → Desktop." },
    ],
  },

  {
    id: "archive",
    icon: "🗂️",
    title: "Archive & files",
    blurb: "Everything you capture is a text file. Browse, pin, rename and decode them.",
    steps: [
      {
        kind: "do", title: "Open the Archive",
        html: `<p>The <b>Archive</b> is the Flipper's file browser. Open it from its idle-screen shortcut, or via Apps → Archive.
          Use <b>Left/Right</b> to switch tabs: Favourites, iButton, NFC, Sub-GHz, RFID LF, Infrared, Bad USB, U2F, Apps, Browser.</p>`,
      },
      {
        kind: "file", title: "Pin a favourite", path: "/ext/favorites.txt",
        html: `<p>In any tab, select a file (try the <b>Browser</b> tab), press <b>OK</b> and choose <b>Pin</b>.
          Pinned files appear under <b>Favourites</b>. Favourites are stored in <code>/ext/favorites.txt</code>, and this step completes when that file changes.</p>`,
      },
      {
        kind: "run", title: "Peek at the SD card", cmd: "storage list /ext",
        html: `<p>Here's the same SD card seen from the command line. Each app saves into its own folder:
          <code>infrared</code>, <code>subghz</code>, <code>nfc</code>, <code>lfrfid</code>, <code>ibutton</code>, <code>badusb</code>…</p>`,
      },
      {
        kind: "do", title: "Use the Files tab",
        html: `<p>Open this app's <b>Files</b> tab and click into a folder. Opening a capture shows its raw text
          plus a <b>"What does this file mean?"</b> table that explains every field. You'll see this again in every capture lesson.</p>`,
      },
    ],
    quiz: [
      { q: "What format are Flipper capture files in?", options: ["Encrypted binary", "Plain-text Key: value", "SQLite", "ZIP"], answer: 1, why: "Every save starts with Filetype and Version lines, then plain key/value pairs." },
      { q: "Which folder holds your saved IR remotes?", options: ["/ext/ir", "/ext/infrared", "/int/remotes", "/ext/apps"], answer: 1, why: "Infrared saves go in /ext/infrared." },
    ],
  },

  {
    id: "infrared",
    icon: "📺",
    title: "Infrared",
    blurb: "Capture your TV remote, decode it, save it, and become the remote.",
    steps: [
      {
        kind: "listen", title: "IR button bingo: catch 5 buttons",
        cmd: "ir rx", match: "^(\\w+), A:0x\\w+, C:0x\\w+|^RAW, \\d+ samples", unique: true, goal: 5, unit: "different buttons",
        html: `<p>The IR receiver is behind the dark window on the <b>top edge</b>. Press <b>Start listening</b>,
          point one of your remotes at it and press <b>5 different buttons</b>. Each press shows its protocol, address and command.</p>`,
      },
      {
        kind: "do", title: "Try a Universal Remote",
        html: `<p>On the device: <b>Infrared → Universal Remotes → TVs</b>. Point the Flipper at your TV and press <b>Power</b>.
          It cycles through hundreds of known power codes. Hold it steady until the TV reacts.</p>`,
      },
      {
        kind: "file", title: "Learn and save a remote", dir: "/ext/infrared", ext: ".ir",
        html: `<p><b>Infrared → Learn New Remote</b>. Press a button on your remote while pointing it at the Flipper, then <b>Save</b> and name it
          (e.g. "Power"). Add a few more buttons, then save the remote with a name like <i>MyTV</i>.</p>`,
      },
      {
        kind: "do", title: "Be the remote",
        html: `<p>Open <b>Infrared → Saved Remotes → MyTV</b> and press one of your learned buttons while pointing the Flipper at the TV.
          Notice the LED blink: the Flipper replays the exact protocol, address and command it decoded.</p>`,
      },
    ],
    quiz: [
      { q: "What carrier frequency do most IR remotes use?", options: ["38 kHz", "433 MHz", "125 kHz", "2.4 GHz"], answer: 0, why: "Most consumer IR is modulated at around 38 kHz." },
      { q: "In a .ir file, what does type: parsed mean?", options: ["The file is corrupt", "The protocol was recognised, so only address + command are stored", "It was typed by hand", "It's encrypted"], answer: 1, why: "Parsed signals are stored compactly. Unknown ones are stored as raw timings." },
      { q: "Where is the IR window?", options: ["Back", "Top edge", "Under the screen", "Next to USB"], answer: 1, why: "The IR LEDs and receiver sit on the top edge." },
    ],
  },

  {
    id: "subghz",
    icon: "📡",
    title: "Sub-GHz radio",
    blurb: "Find frequencies, decode nearby sensors, and record signals from your own gadgets.",
    steps: [
      {
        kind: "do", title: "Hunt with the Frequency Analyzer",
        html: `<p><b>Sub-GHz → Frequency Analyzer</b>. Press a button on one of <i>your own</i> remotes (doorbell, garage, RF outlet) right next to the Flipper.
          It shows the frequency it detected and the signal strength (RSSI). In the US, look for 315 MHz or 433.92 MHz.</p>`,
      },
      {
        kind: "listen", title: "Catch a signal", cmd: "subghz rx 433920000 0",
        match: "\\d+\\s?bit", unique: false, goal: 1, unit: "decoded signals",
        html: `<p>Start listening at 433.92 MHz, then press a button on your 433 MHz device. Or just wait: weather stations, tyre sensors and
          neighbours' thermometers often transmit every 30–60 s. (Use 315 MHz on the device if your gadget uses that.)</p>`,
      },
      {
        kind: "file", title: "Record and save", dir: "/ext/subghz", ext: ".sub",
        html: `<p>On the device: <b>Sub-GHz → Read</b> (decodes known protocols) or <b>Read RAW</b> (records any signal).
          Capture your own remote, then choose <b>Save</b>.</p>`,
      },
      {
        kind: "do", title: "Replay to your own device",
        html: `<p>Open <b>Sub-GHz → Saved</b>, pick your capture and choose <b>Send</b>. Does your doorbell ring or your outlet switch?</p>
          <div class="note">Only transmit to devices you own, and follow your local radio rules. Your Flipper is set to the <b>US</b> region,
          which limits which frequencies it may transmit on. Don't replay car key fobs: they use rolling codes, and replaying can desync your real key.</div>`,
      },
    ],
    quiz: [
      { q: "What does RSSI tell you?", options: ["Battery level", "Signal strength", "Protocol name", "Data rate"], answer: 1, why: "Received Signal Strength Indicator: higher (closer to 0 dBm) is stronger." },
      { q: "In a RAW_Data line, what does a negative number mean?", options: ["An error", "A period of silence (signal off)", "A checksum", "Low battery"], answer: 1, why: "Positive = carrier on, negative = off, both in microseconds." },
      { q: "Why shouldn't you replay car key fob signals?", options: ["It's too slow", "Rolling codes: it can desync your real key", "The frequency is wrong", "Cars don't use radio"], answer: 1, why: "Each press uses a new code. Old ones are rejected, and replaying can confuse the receiver." },
    ],
  },

  {
    id: "rfid",
    icon: "🏷️",
    title: "125 kHz RFID",
    blurb: "Read low-frequency fobs and cards, save them, and emulate your own.",
    steps: [
      {
        kind: "listen", title: "Read a tag", cmd: "rfid read",
        match: "^(?!Reading|Press Ctrl|\\^C)\\S.+", unique: false, goal: 1, unit: "tags read",
        html: `<p>The 125 kHz antenna is on the <b>back</b>, near the bottom. Start listening and hold one of your own fobs or cards flat against it.
          Low-frequency tags like EM4100 and HID Prox just send a fixed ID number.</p>`,
      },
      {
        kind: "file", title: "Read and save on the device", dir: "/ext/lfrfid", ext: ".rfid",
        html: `<p><b>125 kHz RFID → Read</b>, hold your tag to the back, then <b>Save</b> and name it.</p>`,
      },
      {
        kind: "do", title: "Emulate your tag",
        html: `<p><b>125 kHz RFID → Saved</b> → your tag → <b>Emulate</b>. The Flipper now <i>is</i> that tag.
          If you have a reader for it (your own door or a USB reader), present the Flipper to it.</p>`,
      },
      {
        kind: "do", title: "Add one manually",
        html: `<p><b>125 kHz RFID → Add Manually</b> lets you pick a protocol and type an ID by hand. Notice how short an EM4100 ID is
          (5 bytes). That's why these tags are considered insecure.</p>`,
      },
    ],
    quiz: [
      { q: "Why are many 125 kHz tags considered insecure?", options: ["Weak encryption", "They broadcast a fixed ID with no authentication", "They need batteries", "They work from 100 m"], answer: 1, why: "Formats like EM4100 just send a static number to any reader." },
      { q: "Where is the RFID antenna?", options: ["Top edge", "The back", "Inside the D-pad", "In the USB port"], answer: 1, why: "Both the 125 kHz and NFC antennas are on the back." },
    ],
  },

  {
    id: "nfc",
    icon: "📶",
    title: "NFC",
    blurb: "13.56 MHz cards, stickers and phones. Read, decode, save and emulate.",
    steps: [
      {
        kind: "do", title: "Read your first NFC card",
        html: `<p><b>NFC → Read</b>, then hold a card against the back. Try what's in your wallet: a transit card, a hotel key, an NFC sticker or an amiibo.
          The Flipper identifies the chip type and reads what it can. Bank cards only expose limited public info.</p>`,
      },
      {
        kind: "file", title: "Save a card", dir: "/ext/nfc", ext: ".nfc",
        html: `<p>After a read, choose <b>Save</b> and name it. Then look at the decoded file below: UID, ATQA, SAK and the memory pages or blocks.</p>`,
      },
      {
        kind: "do", title: "Make your phone read the Flipper",
        html: `<p>If you saved an <b>NTAG</b> sticker: open it under <b>NFC → Saved</b> and choose <b>Emulate</b>.
          Hold your phone's NFC area against the Flipper's back. Your phone reads it like the real sticker (e.g. opens the URL stored on it).</p>`,
      },
      {
        kind: "do", title: "Explore Extra Actions",
        html: `<p><b>NFC → Extra Actions</b> has readers for specific card types and tools for MIFARE cards.
          Try them on your own cards to see how much more the Flipper can identify.</p>`,
      },
    ],
    quiz: [
      { q: "Which value does every NFC tag announce first?", options: ["Its UID", "Its owner's name", "A password", "Its battery level"], answer: 0, why: "The UID is sent during anticollision, before anything else." },
      { q: "What does SAK 0x00 typically indicate?", options: ["MIFARE Classic", "NTAG / Ultralight", "A bank card", "No card"], answer: 1, why: "SAK 0x00 = Ultralight family (incl. NTAG). 0x08 = Classic 1K." },
      { q: "What frequency is NFC?", options: ["125 kHz", "13.56 MHz", "433 MHz", "2.4 GHz"], answer: 1, why: "NFC/HF RFID runs at 13.56 MHz." },
    ],
  },

  {
    id: "ibutton",
    icon: "🔑",
    title: "iButton",
    blurb: "Touch-memory keys used on intercoms. Read, save and emulate over 1-Wire.",
    steps: [
      {
        kind: "listen", title: "Read a key", cmd: "ikey read",
        match: "^(?!Reading|Press Ctrl|\\^C)\\S.+", unique: false, goal: 1, unit: "keys read",
        html: `<p>iButtons are metal "tablet" keys. Start listening and press one of your own keys against the <b>pogo pins on the back</b>.</p>`,
      },
      {
        kind: "file", title: "Save it on the device", dir: "/ext/ibutton", ext: ".ibtn",
        html: `<p><b>iButton → Read</b>, touch the key, then <b>Save</b>.</p>`,
      },
      {
        kind: "do", title: "Emulate",
        html: `<p><b>iButton → Saved</b> → your key → <b>Emulate</b>. The pins on the back now act as the key when touched to a reader.</p>`,
      },
    ],
    quiz: [
      { q: "Which bus do Dallas iButtons use?", options: ["1-Wire", "I²C", "SPI", "Bluetooth"], answer: 0, why: "Data and power share a single wire plus ground." },
      { q: "How many bytes is an iButton ROM?", options: ["4", "8", "16", "32"], answer: 1, why: "Family code (1) + serial (6) + CRC (1) = 8 bytes." },
    ],
  },

  {
    id: "gpio",
    icon: "🔌",
    title: "GPIO & pins",
    blurb: "The header on top: power, ground and programmable pins for your own hardware.",
    steps: [
      {
        kind: "pinout", title: "Pin hunt",
        targets: ["GND", "3V3", "5V", "TX", "PA7"],
        html: `<p>The 18-pin header on top is numbered left to right when the screen faces you. Find each pin below by clicking it.</p>`,
      },
      { kind: "run", title: "Ask the GPIO command for help", cmd: "gpio", html: `<p>The CLI can drive pins directly. See its options:</p>` },
      {
        kind: "do", title: "Blink an LED (optional hardware)",
        html: `<p>If you have an LED and a ~330 Ω resistor: wire <b>pin 7 (PC3)</b> → resistor → LED long leg, and the LED short leg → <b>pin 8 (GND)</b>.
          Then open <b>GPIO → GPIO Manual Control</b>, select PC3 and press OK to toggle it.</p>
          <div class="note">The GPIO pins are 3.3 V logic and not 5 V tolerant. Never connect a 5 V signal to them.</div>`,
      },
      {
        kind: "do", title: "Explore the GPIO app",
        html: `<p>Look through <b>GPIO</b>: <b>USB-UART Bridge</b> turns the Flipper into a USB serial adapter,
          and <b>5V on GPIO</b> powers small boards from pin 1. Add-on modules (like the Wi-Fi dev board) plug into this header.</p>`,
      },
    ],
    quiz: [
      { q: "What logic level do the GPIO pins use?", options: ["1.8 V", "3.3 V", "5 V", "12 V"], answer: 1, why: "The STM32 MCU runs at 3.3 V." },
      { q: "Which pin can supply 5 V when enabled?", options: ["Pin 1", "Pin 8", "Pin 9", "Pin 17"], answer: 0, why: "Pin 1 is 5 V (enable it in GPIO → 5V on GPIO). Pin 9 is always 3.3 V." },
    ],
  },

  {
    id: "badusb",
    icon: "⌨️",
    title: "Bad USB",
    blurb: "Make the Flipper type for you. Write a harmless keystroke script and run it on your own computer.",
    steps: [
      {
        kind: "info", title: "How it works",
        html: `<p>With <b>Bad USB</b>, the Flipper pretends to be a USB keyboard and types a script written in <b>DuckyScript</b>.
          It's handy for automating your own setup tasks, and it's a good lesson in why you shouldn't plug in unknown USB devices.</p>
          <ul><li><code>REM</code>: a comment</li><li><code>DELAY 500</code>: wait 500 ms</li>
          <li><code>STRING text</code>: type text</li><li><code>ENTER</code>, <code>TAB</code>, <code>GUI</code>, <code>CTRL</code>…: press keys</li></ul>`,
      },
      {
        kind: "code", title: "Write your script", path: "/ext/badusb/flipperlab_hello.txt", lang: "DuckyScript",
        code: `REM Flipper Lab: a friendly hello. Open a text editor first!
DELAY 1500
STRING Hello from my Flipper Zero! I typed this myself.
ENTER
STRING This line was typed
DELAY 300
STRING slowly...
ENTER
`,
        html: `<p>Edit the script if you like, then save it to the Flipper.</p>`,
      },
      {
        kind: "do", title: "Run it on your computer",
        html: `<ol><li>Open a text editor on <i>this</i> computer and click into it.</li>
          <li>On the Flipper: <b>Bad USB → flipperlab_hello.txt → Run</b>.</li>
          <li>Watch it type!</li></ol>
          <div class="note">While Bad USB runs, the Flipper's USB port acts as a keyboard, so this app's connection drops. Reconnect afterwards.
          If the text comes out garbled, set the keyboard layout in the Bad USB app's config.</div>`,
      },
    ],
    quiz: [
      { q: "Which DuckyScript command types text?", options: ["TYPE", "STRING", "PRINT", "SAY"], answer: 1, why: "STRING types the rest of the line." },
      { q: "Why does this app disconnect while Bad USB runs?", options: ["The battery dies", "The USB port switches to keyboard mode", "Bluetooth takes over", "It crashes"], answer: 1, why: "The USB port can only be one kind of device at a time." },
    ],
  },

  {
    id: "u2f",
    icon: "🛡️",
    title: "U2F security key",
    blurb: "Use your Flipper as a hardware two-factor key for websites.",
    steps: [
      {
        kind: "info", title: "What U2F does",
        html: `<p>U2F/FIDO is phishing-resistant two-factor login: the website asks the key to sign a challenge,
          and you physically confirm on the device. The Flipper's private keys stay on its SD card in <code>/ext/u2f</code>.</p>`,
      },
      {
        kind: "do", title: "Register on a test site",
        html: `<ol><li>On the Flipper, open <b>U2F</b> and leave it on that screen. This app's USB connection will drop.</li>
          <li>In your browser, go to <b>webauthn.io</b>, enter a test username and click <b>Register</b>.</li>
          <li>When the Flipper asks, press <b>OK</b> to confirm. Then click <b>Authenticate</b> and confirm again.</li></ol>
          <div class="note">On Linux, if the browser can't see the key, you may need a udev rule for FIDO devices.
          For real accounts, always set up a backup 2FA method too.</div>`,
      },
    ],
    quiz: [
      { q: "Why is U2F resistant to phishing?", options: ["It uses a long password", "Signatures are bound to the real website's origin", "It needs Bluetooth", "It's encrypted with your PIN"], answer: 1, why: "The browser includes the site origin, so a fake site can't use your key's response." },
    ],
  },

  {
    id: "apps",
    icon: "📱",
    title: "Bluetooth & apps",
    blurb: "The mobile app, the Apps catalog, and turning the Flipper into a Bluetooth remote.",
    steps: [
      {
        kind: "do", title: "Browse the Apps menu",
        html: `<p>Open <b>Apps</b> from the main menu. Apps are grouped in folders: Bluetooth, GPIO, Games, Infrared, NFC, RFID, Scripts, Sub-GHz, USB and iButton.
          Start with a round of <b>Games → Snake</b>!</p>`,
      },
      {
        kind: "do", title: "Install an app from the catalog",
        html: `<p>In the <b>Flipper mobile app</b> (the one you updated with), open <b>Apps</b> and install something that looks fun.
          It arrives over Bluetooth as a <code>.fap</code> file in <code>/ext/apps</code>.</p>`,
      },
      {
        kind: "do", title: "Be a Bluetooth remote",
        html: `<p>Open <b>Apps → Bluetooth → Bluetooth Remote</b>. Pair it with your phone or computer and use it
          as a media remote, keyboard, mouse or presentation clicker. <b>Apps → USB → USB Remote</b> does the same over the cable.</p>`,
      },
      {
        kind: "run", title: "See what's installed", cmd: "storage list /ext/apps",
        html: `<p>Every app category is just a folder on the SD card:</p>`,
      },
    ],
    quiz: [
      { q: "What file extension do Flipper apps use?", options: [".apk", ".fap", ".exe", ".bin"], answer: 1, why: "FAP = Flipper Application Package." },
    ],
  },

  {
    id: "code",
    icon: "🧑‍💻",
    title: "Code your Flipper",
    blurb: "Write a JavaScript program, send it to the Flipper, and run it.",
    steps: [
      {
        kind: "info", title: "JavaScript on a dolphin",
        html: `<p>The firmware includes a small JavaScript engine. Scripts live in <code>/ext/apps/Scripts</code> and run from
          <b>Apps → Scripts</b> on the device, or from the command line with <code>js &lt;path&gt;</code>.
          <code>require()</code> loads modules for the hardware: notifications, GUI, GPIO, Bad USB, storage and more.</p>`,
      },
      {
        kind: "code", title: "Hello, Flipper", path: "/ext/apps/Scripts/flipperlab_hello.js", lang: "JavaScript",
        runCmd: "js /ext/apps/Scripts/flipperlab_hello.js",
        code: `let notify = require("notification");

print("Hello from Flipper Lab!");
notify.success();
delay(1000);

for (let i = 3; i > 0; i--) {
  print("Countdown:", i);
  notify.blink("blue", "short");
  delay(700);
}
print("Lift off!");
notify.success();
`,
        html: `<p>Save it, then run it. Watch the Flipper's LED and listen for the success sound. The output appears below.
          Then change the colour (try <code>"red"</code> or <code>"green"</code>) or the countdown and run it again.</p>`,
      },
      {
        kind: "do", title: "Run it from the device",
        html: `<p>On the Flipper: <b>Apps → Scripts → flipperlab_hello.js</b>. The same program, launched without a computer.
          Look at the other example scripts in that folder for ideas.</p>`,
      },
    ],
    quiz: [
      { q: "How does a script access hardware like the LED?", options: ["window.led", "require(\"notification\")", "import led", "It can't"], answer: 1, why: "Hardware features come from modules loaded with require()." },
    ],
  },

  {
    id: "cli",
    icon: "🔬",
    title: "Under the hood",
    blurb: "The command line, live logs and system stats. How this app talks to your Flipper.",
    steps: [
      { kind: "run", title: "List every command", cmd: "help", html: `<p>Everything this app does is built on these commands:</p>` },
      { kind: "run", title: "Memory check", cmd: "free", html: `<p>The Flipper has 256 KB of RAM, shared by every running app. See how much is free:</p>` },
      { kind: "run", title: "Battery deep-dive", cmd: "info power", html: `<p>Raw battery stats from the fuel gauge chip:</p>` },
      {
        kind: "do", title: "Watch the system log",
        html: `<p>Open the <b>Console</b> tab and run <code>log</code>, then open and close a few apps on the Flipper. You'll see the system
          announce what it's doing. Press Ctrl+C to stop. Try <code>log debug</code> for more detail.</p>`,
      },
      {
        kind: "info", title: "How the screen mirror works",
        html: `<p>The screen mirror uses a second, binary protocol: <code>start_rpc_session</code> switches the USB link to
          <b>protobuf RPC</b>, the same one qFlipper and the mobile app use. The Flipper then streams 1024-byte frames
          (128×64 pixels, 1 bit each). Button presses travel back as input events.</p>`,
      },
    ],
    quiz: [
      { q: "How many bytes is one 128×64 1-bit screen frame?", options: ["128", "1024", "8192", "64"], answer: 1, why: "128 × 64 = 8192 pixels ÷ 8 bits = 1024 bytes." },
      { q: "Which command switches the USB link to binary RPC?", options: ["rpc on", "start_rpc_session", "loader", "update"], answer: 1, why: "qFlipper and this app's mirror both start with start_rpc_session." },
    ],
  },
];
