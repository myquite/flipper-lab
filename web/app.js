// Flipper Lab: talks to the Flipper Zero CLI over Web Serial.
const PROMPT = "\r\n>: ";
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// Firmware 1.5+ colours CLI output with ANSI escapes; strip them and carriage returns for display.
const clean = (s) => s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "").replace(/\r/g, "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ---------- Protobuf (just enough for Flipper RPC) ----------
// Field numbers from flipperzero-protobuf flipper.proto / gui.proto / storage.proto.
const PB = {
  STOP_SESSION: 19, START_SCREEN: 20, STOP_SCREEN: 21, SCREEN_FRAME: 22, INPUT_EVENT: 23,
  LIST_REQ: 7, LIST_RESP: 8, READ_REQ: 9, READ_RESP: 10,
};
const INPUT_KEY = { up: 0, down: 1, right: 2, left: 3, ok: 4, back: 5 };
const INPUT_TYPE = { press: 0, release: 1, short: 2, long: 3 };

function varint(n) {
  const out = [];
  do { let b = n & 0x7f; n >>>= 7; if (n) b |= 0x80; out.push(b); } while (n);
  return out;
}

function readVarint(buf, i) {
  let n = 0, shift = 0;
  for (;;) {
    if (i >= buf.length) return null;
    const c = buf[i++];
    n += (c & 0x7f) * 2 ** shift;
    shift += 7;
    if (!(c & 0x80)) return [n, i];
  }
}

// Decodes one message into {fieldNumber: [values]}; values are numbers or Uint8Arrays.
function pbFields(buf) {
  const fields = {};
  let i = 0;
  while (i < buf.length) {
    const t = readVarint(buf, i); if (!t) break;
    const [tag, j] = t; i = j;
    const wire = tag & 7, n = tag >>> 3;
    let v;
    if (wire === 0) { const r = readVarint(buf, i); v = r[0]; i = r[1]; }
    else if (wire === 2) { const [len, k] = readVarint(buf, i); v = buf.subarray(k, k + len); i = k + len; }
    else if (wire === 5) { i += 4; continue; }
    else if (wire === 1) { i += 8; continue; }
    else break;
    (fields[n] ||= []).push(v);
  }
  return fields;
}

// Same, keeping only the last value of each field (proto3 semantics for singular fields).
function pbDecode(buf) {
  const f = pbFields(buf);
  for (const k in f) f[k] = f[k][f[k].length - 1];
  return f;
}

const pbString = (field, s) => {
  const b = new TextEncoder().encode(s);
  return [...varint((field << 3) | 2), ...varint(b.length), ...b];
};

// Length-delimited PB_Main with command_id and one message-typed content field.
function pbMain(commandId, field, body = []) {
  const m = [0x08, ...varint(commandId), ...varint((field << 3) | 2), ...varint(body.length), ...body];
  return Uint8Array.from([...varint(m.length), ...m]);
}

// ---------- Serial transport ----------
class FlipperCLI {
  constructor() {
    this.port = null;
    this.writer = null;
    this.buf = "";
    this.waiter = null;
    this.queue = Promise.resolve();
    this.onData = () => {};
    this.onClose = () => {};
    this.onFrame = null;
    this.streaming = false;
    this.muted = false;      // suppress console echo for background commands
    this.rpc = false;        // true while the port speaks protobuf instead of text
    this.rbuf = new Uint8Array(0);
    this.cid = 0;
    this.pending = new Map();
    this.stopMirror = null;
  }

  get mirroring() { return !!this.stopMirror; }
  get connected() { return !!this.port; }
  get idle() { return this.connected && !this.streaming && !this.mirroring; }

  async connect() {
    this.port = await navigator.serial.requestPort({
      filters: [{ usbVendorId: 0x0483, usbProductId: 0x5740 }],
    });
    await this.port.open({ baudRate: 230400 });
    this.writer = this.port.writable.getWriter();
    this.readLoop();
    await this.write("\r");
    await this.waitFor(">: ", 3000).catch(() => {});
    this.buf = "";
  }

  async disconnect() {
    const port = this.port;
    if (!port) return;
    try { await this.reader?.cancel(); } catch {}
    try { this.writer?.releaseLock(); } catch {}
    try { await port.close(); } catch {}
  }

  async readLoop() {
    const dec = new TextDecoder();
    this.reader = this.port.readable.getReader();
    try {
      for (;;) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (this.rpc) { this.rpcFeed(value); continue; }
        const s = dec.decode(value, { stream: true });
        this.buf += s;
        if (!this.muted) this.onData(s);
        this.checkWaiter();
      }
    } catch (e) {
      console.warn("read loop ended", e);
    } finally {
      try { this.reader.releaseLock(); } catch {}
      this.port = null;
      this.writer = null;
      this.rpc = false;
      this.stopMirror?.();
      for (const p of this.pending.values()) p.reject(new Error("Disconnected"));
      this.pending.clear();
      if (this.waiter) { this.waiter.reject(new Error("Disconnected")); this.waiter = null; }
      this.onClose();
    }
  }

  checkWaiter() {
    const w = this.waiter;
    if (!w) return;
    const i = this.buf.indexOf(w.token);
    if (i < 0) return;
    const out = this.buf.slice(0, i);
    this.buf = this.buf.slice(i + w.token.length);
    this.waiter = null;
    clearTimeout(w.timer);
    w.resolve(out);
  }

  waitFor(token, ms) {
    return new Promise((resolve, reject) => {
      const timer = ms === Infinity ? null : setTimeout(() => {
        this.waiter = null;
        reject(new Error(`Timed out waiting for Flipper`));
      }, ms);
      this.waiter = { token, resolve, reject, timer };
      this.checkWaiter();
    });
  }

  write(s) {
    if (!this.writer) throw new Error("Not connected");
    return this.writer.write(new TextEncoder().encode(s));
  }

  writeBytes(bytes) {
    if (!this.writer) throw new Error("Not connected");
    return this.writer.write(bytes);
  }

  // Runs one command and resolves with its output (echo and prompt stripped).
  exec(cmd, ms = 10000, { quiet = false } = {}) {
    return this.enqueue(async () => {
      this.buf = "";
      this.muted = quiet;
      try {
        await this.write(cmd + "\r");
        return stripEcho(await this.waitFor(PROMPT, ms));
      } finally {
        this.muted = false;
      }
    });
  }

  // Runs a long-lived command; resolves when it ends (after interrupt()).
  stream(cmd) {
    return this.enqueue(async () => {
      this.streaming = true;
      try {
        this.buf = "";
        await this.write(cmd + "\r");
        return stripEcho(await this.waitFor(PROMPT, Infinity));
      } finally {
        this.streaming = false;
      }
    });
  }

  // Writes a small text file with `storage write_chunk`.
  writeFile(path, text) {
    const data = new TextEncoder().encode(text);
    return this.enqueue(async () => {
      this.muted = true;
      try {
        const dir = path.slice(0, path.lastIndexOf("/"));
        for (const cmd of [`storage mkdir ${dir}`, `storage remove ${path}`]) {
          this.buf = "";
          await this.write(cmd + "\r");
          await this.waitFor(PROMPT, 5000);
        }
        for (let i = 0; i < data.length; i += 256) {
          const chunk = data.subarray(i, i + 256);
          this.buf = "";
          await this.write(`storage write_chunk ${path} ${chunk.length}\r`);
          await this.waitFor("Ready", 5000);
          await this.waitFor("\n", 2000);
          await this.writeBytes(chunk);
          const out = await this.waitFor(PROMPT, 5000);
          if (/error/i.test(out)) throw new Error(clean(out).trim());
        }
      } finally {
        this.muted = false;
      }
    });
  }

  interrupt() {
    if (this.mirroring) this.stopMirror();
    else if (this.writer) this.write("\x03");
  }

  enqueue(fn) {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => {});
    return run;
  }

  // Splits the incoming byte stream into length-delimited PB_Main messages.
  rpcFeed(chunk) {
    const buf = new Uint8Array(this.rbuf.length + chunk.length);
    buf.set(this.rbuf); buf.set(chunk, this.rbuf.length);
    let i = 0;
    for (;;) {
      const h = readVarint(buf, i);
      if (!h || h[1] + h[0] > buf.length) break;
      this.rpcDispatch(pbDecode(buf.subarray(h[1], h[1] + h[0])));
      i = h[1] + h[0];
    }
    this.rbuf = buf.slice(i);
  }

  rpcDispatch(m) {
    if (m[PB.SCREEN_FRAME]) {
      const f = pbDecode(m[PB.SCREEN_FRAME]);
      if (f[1]) this.onFrame?.(f[1], f[2] || 0);
      return;
    }
    const p = this.pending.get(m[1] || 0);
    if (!p) return;
    if (m[2]) { this.pending.delete(m[1]); clearTimeout(p.timer); p.reject(new Error(`Flipper RPC error ${m[2]}`)); return; }
    p.parts.push(m);
    if (!m[3]) { this.pending.delete(m[1]); clearTimeout(p.timer); p.resolve(p.parts); }
  }

  // Sends one RPC request (only while mirroring) and collects every has_next part.
  rpcRequest(field, body, ms = 8000) {
    const cid = ++this.cid;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(cid); reject(new Error("RPC timeout")); }, ms);
      this.pending.set(cid, { parts: [], resolve, reject, timer });
      this.writeBytes(pbMain(cid, field, body)).catch(reject);
    });
  }

  // Switches to RPC and streams screen frames to onFrame until interrupt(),
  // then returns to the text CLI.
  mirror() {
    return this.enqueue(async () => {
      this.buf = "";
      await this.write("start_rpc_session\r");
      await this.waitFor("\n", 3000);
      this.rbuf = new Uint8Array(0);
      this.rpc = true;
      const stopped = new Promise((res) => { this.stopMirror = res; });
      try {
        await this.writeBytes(pbMain(++this.cid, PB.START_SCREEN));
        await stopped;
        if (!this.writer) return;
        await this.writeBytes(pbMain(++this.cid, PB.STOP_SCREEN));
        await this.writeBytes(pbMain(++this.cid, PB.STOP_SESSION));
        await sleep(300);
        this.rpc = false;
        this.buf = "";
        await this.write("\r");
        await this.waitFor(">: ", 3000).catch(() => {});
      } finally {
        this.rpc = false;
        this.stopMirror = null;
      }
    });
  }

  // Presses a button over RPC: press, short/long, release, like the physical keys.
  async sendInput(key, long) {
    for (const type of ["press", long ? "long" : "short", "release"]) {
      await this.writeBytes(pbMain(++this.cid, PB.INPUT_EVENT, [0x08, INPUT_KEY[key], 0x10, INPUT_TYPE[type]]));
    }
  }
}

function stripEcho(raw) {
  const nl = raw.indexOf("\r\n");
  return clean(nl >= 0 ? raw.slice(nl + 2) : raw).trim();
}

function parseKV(text) {
  const kv = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([\w.]+)\s*:\s*(.*)$/);
    if (m) kv[m[1]] = m[2].trim();
  }
  return kv;
}

const cli = new FlipperCLI();

// ---------- Device helpers (work in CLI and mirror/RPC mode) ----------
async function listFiles(path, { quiet = true } = {}) {
  if (cli.mirroring) {
    const parts = await cli.rpcRequest(PB.LIST_REQ, pbString(1, path));
    const dec = new TextDecoder();
    return parts.flatMap((m) => m[PB.LIST_RESP] ? (pbFields(m[PB.LIST_RESP])[1] || []) : [])
      .map((f) => { const d = pbDecode(f); return { dir: d[1] === 1, name: dec.decode(d[2] || new Uint8Array()), size: d[3] || 0 }; });
  }
  if (cli.streaming) throw new Error("Busy: stop the running command first.");
  const out = await cli.exec(`storage list ${path}`, 10000, { quiet });
  const items = [];
  for (const line of out.split("\n")) {
    const m = line.match(/^\s*\[(D|F)\]\s+(.*?)(?:\s+(\d+)b)?\s*$/);
    if (m) items.push({ dir: m[1] === "D", name: m[2], size: m[3] ? Number(m[3]) : 0 });
  }
  return items;
}

async function readText(path) {
  if (cli.mirroring) {
    const parts = await cli.rpcRequest(PB.READ_REQ, pbString(1, path), 15000);
    const chunks = parts.map((m) => m[PB.READ_RESP] && pbDecode(pbDecode(m[PB.READ_RESP])[1] || new Uint8Array())[4]).filter(Boolean);
    const all = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
    return new TextDecoder().decode(all);
  }
  if (cli.streaming) throw new Error("Busy: stop the running command first.");
  const out = await cli.exec(`storage read ${path}`, 30000, { quiet: true });
  return out.replace(/^Size: \d+\n/, "");
}

// Gets the port back into text mode (stops a running mirror).
async function ensureCLI() {
  if (cli.mirroring) { cli.interrupt(); await cli.queue; }
}

// Little on-device cheer: green LED + buzz. Skipped when the port is busy.
async function celebrate() {
  if (!cli.idle) return;
  try {
    await cli.exec("led g 255", 2000, { quiet: true });
    await cli.exec("vibro 1", 2000, { quiet: true });
    await sleep(180);
    await cli.exec("vibro 0", 2000, { quiet: true });
    await sleep(400);
    await cli.exec("led g 0", 2000, { quiet: true });
  } catch {}
}

// ---------- UI plumbing ----------
const term = $("#term");
function termAppend(s) {
  const atBottom = term.scrollTop + term.clientHeight >= term.scrollHeight - 20;
  term.textContent += clean(s);
  if (term.textContent.length > 200000) term.textContent = term.textContent.slice(-150000);
  if (atBottom) term.scrollTop = term.scrollHeight;
}
cli.onData = termAppend;

const connListeners = [];
function setConnected(on) {
  $("#statusDot").classList.toggle("on", on);
  $("#connectBtn").textContent = on ? "Disconnect" : "Connect";
  $("#connectBtn").classList.toggle("primary", !on);
  if (!on) {
    $("#devInfo").innerHTML = "<dt>Status</dt><dd>Not connected</dd>";
    setBusy(null);
  }
  connListeners.forEach((fn) => fn(on));
}
cli.onClose = () => setConnected(false);

function setBusy(label) {
  $("#busyBanner").hidden = !label;
  if (label) $("#busyText").textContent = `Running: ${label}`;
}
$("#stopBtn").onclick = () => cli.interrupt();

function requireConn() {
  if (!cli.connected) { alert("Connect your Flipper first (top-right button)."); return false; }
  return true;
}

async function run(cmd, ms) {
  if (!requireConn()) return "";
  if (cli.streaming || cli.mirroring) { alert("Stop the running command or screen mirror first."); return ""; }
  try { return await cli.exec(cmd, ms); }
  catch (e) { console.error(e); return `Error: ${e.message}`; }
}

// Long-running command; output lands in `outEl` live and is passed to onText.
async function runStream(cmd, outEl, onText) {
  if (!requireConn()) return;
  await ensureCLI();
  if (cli.streaming) { alert("Stop the running command first."); return; }
  outEl.hidden = false;
  outEl.textContent = `$ ${cmd}\n(press Stop when you're done)\n`;
  const prev = cli.onData;
  cli.onData = (s) => {
    prev(s);
    outEl.textContent += clean(s);
    outEl.scrollTop = outEl.scrollHeight;
    onText?.(clean(s));
  };
  setBusy(cmd);
  try { await cli.stream(cmd); }
  catch (e) { outEl.textContent += `\n${e.message}`; }
  finally { cli.onData = prev; setBusy(null); }
}

// ---------- Tabs ----------
let activeTab = "dashboard";
const tabListeners = [];
function showTab(name) {
  activeTab = name;
  $$("#tabs button").forEach((x) => x.classList.toggle("active", x.dataset.tab === name));
  $$(".tab").forEach((t) => t.classList.toggle("active", t.id === `tab-${name}`));
  if (name === "files" && cli.connected && !$("#fileList").children.length) listDir();
  tabListeners.forEach((fn) => fn(name));
}
$("#tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-tab]");
  if (!b) return;
  showTab(b.dataset.tab);
  history.replaceState(null, "", `#${b.dataset.tab}`);
});

// ---------- Connect ----------
if (!("serial" in navigator)) {
  $("#unsupported").hidden = false;
  $("#connectBtn").disabled = true;
}
$("#connectBtn").onclick = async () => {
  if (cli.connected) {
    await ensureCLI();
    await cli.disconnect();
    setConnected(false);
    return;
  }
  try {
    await cli.connect();
    setConnected(true);
    refreshDashboard();
  } catch (e) {
    if (e.name !== "NotFoundError") alert(`Could not connect: ${e.message}\n\nClose other programs using the port (qFlipper, screen, minicom) and try again.`);
  }
};

// ---------- Dashboard ----------
function fillKV(el, rows) {
  el.innerHTML = rows.filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(String(v))}</dd>`).join("");
}

async function refreshDashboard() {
  const d = parseKV(await run("info device"));
  fillKV($("#devInfo"), [
    ["Name", d["hardware.name"]],
    ["Model", d["hardware.model"]],
    ["Firmware", d["firmware.version"] && `${d["firmware.version"]} (${d["firmware.origin.fork"] || "?"})`],
    ["Built", d["firmware.build.date"]],
    ["Hardware rev", d["hardware.ver"]],
    ["Region", d["hardware.region.provisioned"]],
    ["BLE MAC", d["radio.ble.mac"]],
  ]);

  const p = parseKV(await run("info power"));
  const lvl = Number(p["charge.level"] || 0);
  $("#battBar").style.width = `${lvl}%`;
  fillKV($("#battInfo"), [
    ["Charge", `${lvl}%`],
    ["State", p["charge.state"]],
    ["Voltage", p["battery.voltage"] && `${(p["battery.voltage"] / 1000).toFixed(2)} V`],
    ["Temp", p["battery.temp"] && `${p["battery.temp"]} °C`],
    ["Health", p["battery.health"] && `${p["battery.health"]}%`],
  ]);

  const s = await run("storage info /ext");
  const total = Number((s.match(/(\d+)KiB total/) || [])[1] || 0);
  const free = Number((s.match(/(\d+)KiB free/) || [])[1] || 0);
  if (total) {
    const used = total - free;
    $("#sdBar").style.width = `${(used / total) * 100}%`;
    const gb = (k) => `${(k / 1024 / 1024).toFixed(1)} GB`;
    fillKV($("#sdInfo"), [
      ["Used", `${gb(used)} of ${gb(total)}`],
      ["Free", gb(free)],
      ["Format", (s.match(/Type: (\w+)/) || [])[1]],
    ]);
  } else {
    fillKV($("#sdInfo"), [["Status", s || "No SD card?"]]);
  }
}
$("#refreshBtn").onclick = refreshDashboard;

$("#ledSet").onclick = async () => {
  const hex = $("#ledColor").value;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  await run(`led r ${r}`); await run(`led g ${g}`); await run(`led b ${b}`);
};
$("#ledOff").onclick = async () => { for (const c of "rgb") await run(`led ${c} 0`); };
$("#vibroBtn").onclick = async () => {
  await run("vibro 1");
  setTimeout(() => run("vibro 0"), 300);
};

// ---------- Remote ----------
async function press(key, long) {
  $$(`.dpad [data-key="${key}"]`).forEach((btn) => {
    btn.classList.add("flash");
    setTimeout(() => btn.classList.remove("flash"), 150);
  });
  if (cli.mirroring) {
    try { await cli.sendInput(key, long); } catch (e) { console.error(e); }
  } else {
    await run(`input send ${key} ${long ? "long" : "short"}`);
  }
}
document.addEventListener("click", (e) => {
  const b = e.target.closest(".dpad button[data-key]");
  if (b) press(b.dataset.key, $("#longPress").checked || e.shiftKey);
});
const KEYMAP = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", Enter: "ok", Backspace: "back" };
document.addEventListener("keydown", (e) => {
  if (!KEYMAP[e.key] || e.target.matches("input, textarea, select")) return;
  // Screen tab always; Learn tab only while the mirror is live.
  if (!(activeTab === "remote" || (activeTab === "learn" && cli.mirroring))) return;
  e.preventDefault();
  if (!e.repeat) press(KEYMAP[e.key], e.shiftKey || $("#longPress").checked);
});

// ---------- Screen mirror ----------
const LCD_BG = [255, 130, 0];   // orange backlight
const LCD_FG = [26, 16, 0];     // dark pixels

// Frames are 128x64, 1 bit per pixel, in 8 pages of 128 column bytes (bit 0 = top row of the page).
function drawFrame(data, orientation) {
  const canvases = $$("canvas.lcd");
  const img = canvases[0].getContext("2d").createImageData(128, 64);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 128; x++) {
      const on = (data[x + (y >> 3) * 128] >> (y & 7)) & 1;
      // HORIZONTAL_FLIP (1) is the left-handed mode: rotate 180°.
      const [dx, dy] = orientation === 1 ? [127 - x, 63 - y] : [x, y];
      const o = (dy * 128 + dx) * 4;
      const c = on ? LCD_FG : LCD_BG;
      img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
    }
  }
  canvases.forEach((cv) => cv.getContext("2d").putImageData(img, 0, 0));
}
cli.onFrame = drawFrame;

function setMirrorButtons(on) {
  $$(".mirror-toggle").forEach((b) => {
    b.textContent = on ? "Stop screen mirror" : "Start screen mirror";
    b.classList.toggle("primary", !on);
  });
}

async function toggleMirror() {
  if (cli.mirroring) { cli.interrupt(); return; }
  if (!requireConn()) return;
  if (cli.streaming) { alert("Stop the running command first."); return; }
  setMirrorButtons(true);
  $("#shotBtn").disabled = false;
  setBusy("screen mirror");
  try { await cli.mirror(); }
  catch (e) { console.error(e); alert(`Screen mirror stopped: ${e.message}`); }
  finally { setBusy(null); setMirrorButtons(false); }
}
document.addEventListener("click", (e) => { if (e.target.closest(".mirror-toggle")) toggleMirror(); });

$("#shotBtn").onclick = () => {
  const big = document.createElement("canvas");
  big.width = 512; big.height = 256;
  const g = big.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage($("#screen"), 0, 0, 512, 256);
  const a = document.createElement("a");
  a.download = `flipper-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
  a.href = big.toDataURL("image/png");
  a.click();
};

// Leave the Flipper in CLI mode if the page closes mid-mirror.
window.addEventListener("pagehide", () => {
  if (!cli.mirroring) return;
  cli.writeBytes(pbMain(++cli.cid, PB.STOP_SCREEN));
  cli.writeBytes(pbMain(++cli.cid, PB.STOP_SESSION));
});

// ---------- Files ----------
let cwd = "/ext";
const TEXT_EXT = /\.(txt|sub|ir|nfc|rfid|ibtn|json|md|log|conf|cfg|csv|fuf|u2f|settings|js|yml|ini)$/i;

async function listDir() {
  if (!requireConn()) return;
  $("#cwd").textContent = cwd;
  let items;
  try { items = await listFiles(cwd, { quiet: false }); }
  catch (e) { $("#fileList").innerHTML = `<li class="muted">${esc(e.message)}</li>`; return; }
  items.sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name));
  $("#fileList").innerHTML = items.length
    ? items.map((it, i) => `<li data-i="${i}"><span>${it.dir ? "📁" : "📄"} ${esc(it.name)}</span>
        <span class="size">${it.dir ? "" : fmtSize(it.size)}</span></li>`).join("")
    : `<li class="muted">Empty folder</li>`;
  $("#fileList").onclick = (e) => {
    const li = e.target.closest("li[data-i]");
    if (!li) return;
    const it = items[li.dataset.i];
    if (it.dir) { cwd = `${cwd}/${it.name}`; listDir(); }
    else viewFile(`${cwd}/${it.name}`, it.size);
  };
}

function fmtSize(n) {
  return n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;
}

async function viewFile(path, size) {
  $("#fileViewCard").hidden = false;
  $("#fileViewName").textContent = path;
  $("#fileExplain").innerHTML = "";
  if (!TEXT_EXT.test(path) || size > 64 * 1024) {
    $("#fileView").textContent = `Not shown: binary or larger than 64 KB (${fmtSize(size ?? 0)}).`;
    return;
  }
  $("#fileView").textContent = "Loading…";
  try {
    const text = await readText(path);
    $("#fileView").textContent = text;
    $("#fileExplain").innerHTML = explainFile(text);
  } catch (e) {
    $("#fileView").textContent = e.message;
  }
  $("#fileViewCard").scrollIntoView({ behavior: "smooth" });
}

$("#upBtn").onclick = () => {
  if (cwd === "/ext" || cwd === "/int") return;
  cwd = cwd.slice(0, cwd.lastIndexOf("/")) || "/ext";
  listDir();
};
$("#lsBtn").onclick = listDir;

// ---------- Console ----------
const cmdHistory = [];
let hIdx = 0;
$("#termForm").onsubmit = async (e) => {
  e.preventDefault();
  const cmd = $("#termInput").value.trim();
  if (!cmd || !requireConn()) return;
  cmdHistory.push(cmd); hIdx = cmdHistory.length;
  $("#termInput").value = "";
  if (cli.mirroring) { alert("Stop the screen mirror first."); return; }
  if (cli.streaming) { await cli.write(cmd + "\r"); return; }
  // Run as a stream so long-lived commands show live output; Ctrl+C ends them.
  setBusy(cmd);
  try { await cli.stream(cmd); } catch (err) { termAppend(`\n${err.message}\n`); }
  finally { setBusy(null); }
};
$("#termInput").addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp" && hIdx > 0) { $("#termInput").value = cmdHistory[--hIdx]; e.preventDefault(); }
  if (e.key === "ArrowDown") { hIdx = Math.min(cmdHistory.length, hIdx + 1); $("#termInput").value = cmdHistory[hIdx] ?? ""; e.preventDefault(); }
  if (e.key === "c" && e.ctrlKey) { cli.interrupt(); e.preventDefault(); }
});
$("#ctrlC").onclick = () => cli.interrupt();
$("#clearTerm").onclick = () => { term.textContent = ""; };

// Open the tab named in the URL hash (e.g. #learn).
if ($(`#tab-${location.hash.slice(1)}`)) showTab(location.hash.slice(1));
