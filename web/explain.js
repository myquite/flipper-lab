// Annotates Flipper's "Key: value" save files so you can see what each field means.
const FIELD_NOTES = {
  Filetype: "What kind of file this is. The Flipper uses this to pick the app that opens it.",
  Version: "File format version, so newer firmware can still read older saves.",
  // Infrared
  name: "The button name you typed when saving. A remote file holds many buttons, each starting with name.",
  type: "parsed = the Flipper recognised the protocol and stores just address + command. raw = it stores the light pulses themselves.",
  protocol: "The IR protocol (NEC, Samsung32, RC5, SIRC…). Each manufacturer tends to use one.",
  address: "Which device the command is for (e.g. 'TV' vs 'soundbar'), as 4 little-endian bytes.",
  command: "Which button was pressed (power, volume up…), as 4 little-endian bytes.",
  frequency: "Carrier frequency in Hz. The IR LED flickers this fast while 'on'. 38000 is the most common.",
  duty_cycle: "Fraction of each carrier cycle the LED is lit (0.33 = one third).",
  data: "Raw timings in microseconds, alternating LED-on and LED-off durations.",
  // Sub-GHz
  Frequency: "Radio frequency in Hz. 433920000 = 433.92 MHz.",
  Preset: "Radio modulation settings. Ook = on/off keying (AM); 2FSK = frequency shift (FM). The number is the receiver bandwidth in kHz.",
  Protocol: "The decoded protocol or chip family. RAW means the signal was recorded without decoding.",
  Bit: "How many data bits the transmission carries.",
  Key: "The decoded data bits, shown in hex.",
  TE: "Timing element in microseconds: the length of the shortest pulse. Everything else is a multiple of it.",
  RAW_Data: "Recorded pulse lengths in microseconds. Positive = signal on, negative = signal off.",
  Repeat: "How many times to repeat the signal when sending.",
  // 125 kHz RFID
  "Key type": "The tag's protocol (EM4100, HIDProx, Indala…).",
  Data: "The tag's stored ID or data bytes, in hex.",
  // NFC
  "Device type": "NFC card family the Flipper detected (NTAG/Ultralight, MIFARE Classic, ISO14443-4A…).",
  UID: "Unique ID of the chip. Every NFC tag announces this first.",
  ATQA: "Answer To Request: two bytes that hint at the chip type during the first handshake.",
  SAK: "Select Acknowledge: one byte saying what the card supports (e.g. 0x08 = MIFARE Classic 1K, 0x00 = Ultralight/NTAG).",
  "Data format version": "Version of the NFC data section format.",
  "NTAG/Ultralight type": "Exact chip model (NTAG213/215/216, Ultralight…). NTAG215 is what amiibo use.",
  Signature: "The manufacturer's originality signature, used to tell genuine chips from clones.",
  "Mifare version": "Version info the chip reports about itself.",
  "Pages total": "How many 4-byte memory pages the chip has.",
  "Pages read": "How many pages the Flipper could read.",
  // iButton
  "Rom Data": "The key's 8-byte ROM: family code, serial number and CRC.",
};

const PATTERN_NOTES = [
  [/^Page \d+$/, "One 4-byte page of NFC tag memory. Pages 0–2 hold the UID and lock bits; user data starts at page 4."],
  [/^Block \d+$/, "One 16-byte block of MIFARE Classic memory. ?? means the block couldn't be read with the known keys."],
  [/^Counter \d+$/, "A one-way counter on the chip (used by some tags to count reads)."],
  [/^Tearing \d+$/, "Flag that tells whether the counter write was interrupted."],
];

function noteFor(key) {
  if (FIELD_NOTES[key]) return FIELD_NOTES[key];
  const p = PATTERN_NOTES.find(([re]) => re.test(key));
  return p ? p[1] : "";
}

// Returns an HTML table explaining a Flipper text file, or "" if it isn't one.
function explainFile(text) {
  const lines = text.split("\n");
  if (!/^Filetype:/m.test(text)) return "";
  const rows = [];
  const seen = new Set();
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) { rows.push(`<tr class="sep"><td colspan="3">${esc(line)}</td></tr>`); continue; }
    const m = line.match(/^([^:]+):\s?(.*)$/);
    if (!m) continue;
    const [, key, value] = m;
    // Explain each key once; repeats (many buttons, "Page 0..N") just show the value.
    const group = key.replace(/ \d+$/, " #");
    const note = seen.has(group) ? "" : noteFor(key);
    seen.add(group);
    const shown = value.length > 120 ? `${value.slice(0, 120)}… (${value.split(" ").length} values)` : value;
    rows.push(`<tr><th>${esc(key)}</th><td><code>${esc(shown)}</code></td><td>${esc(note)}</td></tr>`);
  }
  // Long NFC dumps: keep the table readable.
  const capped = rows.length > 60 ? [...rows.slice(0, 60), `<tr><td colspan="3" class="muted">…${rows.length - 60} more lines</td></tr>`] : rows;
  return `<h3>What does this file mean?</h3><table class="explain">${capped.join("")}</table>`;
}
