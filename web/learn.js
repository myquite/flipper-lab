// Learn tab: lessons as missions with XP, badges, auto-checks against the device and quizzes.
const XP = { step: 10, quiz: 15, lesson: 50 };
const LEVELS = [
  [0, "Curious Dolphin"], [120, "Button Presser"], [300, "Signal Spotter"], [550, "Frequency Explorer"],
  [850, "Hardware Tinkerer"], [1200, "Protocol Whisperer"], [1600, "Flipper Master"],
];
const PINS = ["5V", "PA7", "PA6", "PA4", "PB3", "PB2", "PC3", "GND", "3V3", "SWC", "GND", "SIO", "TX", "RX", "PC1", "PC0", "1W", "GND"];
const PIN_NOTES = {
  "5V": "5 V power out (enable in GPIO → 5V on GPIO)", "3V3": "3.3 V power out", GND: "Ground",
  TX: "UART transmit", RX: "UART receive", SWC: "SWD clock (debugging)", SIO: "SWD data (debugging)",
  "1W": "1-Wire (iButton)",
};

const prog = store.get("flipperlab.progress", { steps: {}, quiz: {}, found: {}, code: {} });
for (const k of ["steps", "quiz", "found", "code"]) prog[k] ||= {};
let current = store.get("flipperlab.lesson", LESSONS[0].id);
let openStep = null;          // index of the expanded step (null = first incomplete)
let watcher = null;           // active file-detection poller
const pinGame = {};           // per-step pin hunt progress (not persisted)
const save = () => store.set("flipperlab.progress", prog);

const lessonById = (id) => LESSONS.find((l) => l.id === id) || LESSONS[0];
const stepKey = (l, i) => `${l.id}/${i}`;
const stepDone = (l, i) => !!prog.steps[stepKey(l, i)];
const quizDone = (l, i) => !!prog.quiz[stepKey(l, i)];
const lessonTotal = (l) => l.steps.length + l.quiz.length;
const lessonCount = (l) => l.steps.filter((_, i) => stepDone(l, i)).length + l.quiz.filter((_, i) => quizDone(l, i)).length;
const lessonComplete = (l) => lessonCount(l) === lessonTotal(l);

function totalXP() {
  return Object.keys(prog.steps).length * XP.step + Object.keys(prog.quiz).length * XP.quiz +
    LESSONS.filter(lessonComplete).length * XP.lesson;
}

function levelInfo(xp) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++;
  const [base, title] = LEVELS[i];
  const next = LEVELS[i + 1]?.[0];
  return { level: i + 1, title, base, next, pct: next ? ((xp - base) / (next - base)) * 100 : 100 };
}

// ---------- Rewards ----------
function toast(html) {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = html;
  $("#toasts").appendChild(t);
  while ($("#toasts").children.length > 4) $("#toasts").firstChild.remove();
  setTimeout(() => t.classList.add("out"), 2600);
  setTimeout(() => t.remove(), 3100);
}

function confetti() {
  const box = document.createElement("div");
  box.className = "confetti";
  for (let i = 0; i < 40; i++) {
    const s = document.createElement("span");
    s.textContent = ["🐬", "✨", "⭐", "🎉", "📡", "🟧"][i % 6];
    s.style.left = `${Math.random() * 100}%`;
    s.style.animationDelay = `${Math.random() * 0.4}s`;
    s.style.fontSize = `${14 + Math.random() * 18}px`;
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 2600);
}

function award(points, label) {
  const before = levelInfo(totalXP() - points).level;
  toast(`<b>+${points} XP</b> ${esc(label)}`);
  const after = levelInfo(totalXP());
  if (after.level > before) {
    setTimeout(() => toast(`🎖️ <b>Level ${after.level}!</b> You're now a ${esc(after.title)}`), 600);
    confetti();
  }
}

function markStep(l, i) {
  if (stepDone(l, i)) return;
  prog.steps[stepKey(l, i)] = true;
  save();
  award(XP.step, l.steps[i].title);
  celebrate();
  finishCheck(l);
  openStep = null;
  render();
}

function finishCheck(l) {
  if (!lessonComplete(l)) return;
  setTimeout(() => {
    award(XP.lesson, `Lesson complete: ${l.title}`);
    toast(`${l.icon} <b>Badge earned:</b> ${esc(l.title)}`);
    confetti();
    render();
  }, 700);
}

// ---------- Rendering ----------
function renderHeader() {
  const xp = totalXP();
  const lv = levelInfo(xp);
  $("#xpCard").innerHTML = `
    <div class="xp-top">
      <div><span class="lvl">Level ${lv.level}</span> <b>${esc(lv.title)}</b></div>
      <div class="muted small">${xp} XP${lv.next ? ` · ${lv.next - xp} to next level` : " · max level!"}</div>
    </div>
    <div class="meter"><div style="width:${lv.pct}%"></div></div>
    <div class="badges">${LESSONS.map((l) =>
      `<span class="badge ${lessonComplete(l) ? "got" : ""}" title="${esc(l.title)}${lessonComplete(l) ? " (earned)" : ""}">${l.icon}</span>`).join("")}
      <button class="small link" id="resetProg">Reset progress</button></div>`;
}

function renderList() {
  $("#lessonList").innerHTML = LESSONS.map((l, i) => {
    const n = lessonCount(l), t = lessonTotal(l);
    return `<button data-id="${l.id}" class="${l.id === current ? "active" : ""}">
      <span class="li-icon">${l.icon}</span>
      <span class="li-text"><span>${i + 1}. ${esc(l.title)}</span>
        <span class="mini-meter"><span style="width:${(n / t) * 100}%"></span></span></span>
      <span class="li-count ${n === t ? "done" : ""}">${n === t ? "✓" : `${n}/${t}`}</span></button>`;
  }).join("");
}

function stepAction(l, i) {
  const s = l.steps[i];
  const done = stepDone(l, i);
  const markBtn = (label) => done ? "" : `<button data-act="mark" class="primary">${label}</button>`;
  const skip = done ? "" : `<button data-act="mark" class="small link">Mark done without checking</button>`;
  switch (s.kind) {
    case "info": return `<div class="row">${markBtn("Got it ✓")}</div>`;
    case "do": return `<div class="row">${markBtn("I did it ✓")}${cli.mirroring ? "" : `<span class="muted small">Tip: turn on the screen mirror to follow along here.</span>`}</div>`;
    case "run": return `<div class="row"><button data-act="run">▶ Run <code>${esc(s.cmd)}</code></button></div><pre class="out" data-out hidden></pre>`;
    case "listen": return `
      <div class="row"><button data-act="listen" class="primary">🎧 Start listening</button><code class="small">${esc(s.cmd)}</code></div>
      <div class="goal"><span data-count>0</span> / ${s.goal} ${esc(s.unit)}<div class="meter"><div data-goalbar></div></div></div>
      <pre class="out" data-out hidden></pre><div class="row">${skip}</div>`;
    case "file": {
      const found = prog.found[stepKey(l, i)];
      return `<div class="watch" data-watch>${done ? `✅ Found <code>${esc(found || s.path || "")}</code>` : watchStatus(s)}</div>
        <div class="row">${!done && s.dir ? `<button data-act="pick" class="small">Use a file I already saved</button>` : ""}${skip}</div>
        <div data-picker></div><div data-explain></div>`;
    }
    case "code": {
      const text = prog.code[stepKey(l, i)] ?? s.code;
      return `<div class="editor-head"><span>${esc(s.lang)} · <code>${esc(s.path)}</code></span><button data-act="resetcode" class="small link">Reset</button></div>
        <textarea data-code spellcheck="false" rows="${Math.min(18, text.split("\n").length + 1)}">${esc(text)}</textarea>
        <div class="row"><button data-act="savecode" class="primary">💾 Save to Flipper</button>
          ${s.runCmd ? `<button data-act="runcode">▶ Run on Flipper</button>` : ""}<span class="muted small" data-status></span></div>
        <pre class="out" data-out hidden></pre><div class="row">${skip}</div>`;
    }
    case "pinout": {
      const g = pinGame[stepKey(l, i)] ||= { idx: 0, found: [] };
      const target = s.targets[g.idx];
      return `<div class="pinout">
          <div class="pin-board">${PINS.map((p, n) => {
            const shown = done || g.found.includes(n);
            return `<button data-pin="${n}" class="pin ${shown ? "found" : ""}" title="${shown ? `Pin ${n + 1}: ${p}` : `Pin ${n + 1}`}">
              <span class="pin-n">${n + 1}</span><span class="pin-l">${shown ? esc(p) : "?"}</span></button>`;
          }).join("")}</div>
          <div class="pin-prompt" data-pinmsg>${done ? "All found! Hover a pin for its name."
            : `Find: <b>${esc(target)}</b> <span class="muted">(${g.idx + 1} of ${s.targets.length})</span>`}</div>
        </div><div class="row">${skip}</div>`;
    }
  }
  return "";
}

function watchStatus(s) {
  if (!cli.connected) return `🔌 Connect your Flipper and this step checks itself automatically.`;
  return s.dir
    ? `👀 Watching <code>${esc(s.dir)}</code> for a new <code>${esc(s.ext)}</code> file…`
    : `👀 Watching <code>${esc(s.path)}</code> for changes…`;
}

function render() {
  renderHeader();
  renderList();
  const l = lessonById(current);
  const firstOpen = l.steps.findIndex((_, i) => !stepDone(l, i));
  const open = openStep ?? (firstOpen === -1 ? null : firstOpen);
  const n = lessonCount(l), t = lessonTotal(l);
  const idx = LESSONS.indexOf(l);

  $("#lessonView").innerHTML = `
    <div class="lesson-head">
      <div class="big-icon">${l.icon}</div>
      <div><h1>${esc(l.title)}</h1><p class="muted">${esc(l.blurb)}</p></div>
    </div>
    <div class="meter"><div style="width:${(n / t) * 100}%"></div></div>
    ${lessonComplete(l) ? `<div class="complete">${l.icon} Lesson complete. Badge earned!
      ${LESSONS[idx + 1] ? `<button data-goto="${LESSONS[idx + 1].id}" class="primary small">Next: ${esc(LESSONS[idx + 1].title)} →</button>` : ""}</div>` : ""}
    <h3>Missions</h3>
    <ol class="steps">${l.steps.map((s, i) => `
      <li class="step ${stepDone(l, i) ? "done" : ""} ${i === open ? "open" : ""}" data-step="${i}">
        <button class="step-head" data-act="toggle">
          <span class="step-check">${stepDone(l, i) ? "✓" : i + 1}</span>
          <span class="step-title">${esc(s.title)}</span>
          <span class="step-kind">${{ do: "on device", file: "auto-check", listen: "live", run: "command", code: "code", pinout: "game", info: "read" }[s.kind]}</span>
        </button>
        ${i === open ? `<div class="step-body">${s.html}${stepAction(l, i)}</div>` : ""}
      </li>`).join("")}</ol>
    <h3>Quiz</h3>
    <div class="quiz">${l.quiz.map((q, qi) => `
      <div class="q ${quizDone(l, qi) ? "done" : ""}" data-q="${qi}">
        <p><b>${qi + 1}.</b> ${esc(q.q)}</p>
        ${q.options.map((o, oi) => `<label class="${quizDone(l, qi) && oi === q.answer ? "right" : ""}">
          <input type="radio" name="q${qi}" value="${oi}" ${quizDone(l, qi) ? "disabled" : ""} ${quizDone(l, qi) && oi === q.answer ? "checked" : ""}> ${esc(o)}</label>`).join("")}
        <p class="why muted">${quizDone(l, qi) ? `✓ ${esc(q.why)}` : ""}</p>
      </div>`).join("")}</div>`;

  startWatcher(l, open);
}

// ---------- File watching ----------
function stopWatcher() {
  if (watcher) clearTimeout(watcher.timer);
  watcher = null;
}

async function snapshot(s) {
  if (s.dir) {
    const items = await listFiles(s.dir);
    return new Set(items.filter((f) => !f.dir && f.name.endsWith(s.ext)).map((f) => f.name));
  }
  const dir = s.path.slice(0, s.path.lastIndexOf("/"));
  const name = s.path.slice(s.path.lastIndexOf("/") + 1);
  const f = (await listFiles(dir)).find((x) => x.name === name);
  return f ? f.size : -1;
}

function startWatcher(l, i) {
  stopWatcher();
  if (i == null || l.steps[i].kind !== "file" || stepDone(l, i)) return;
  const s = l.steps[i];
  const w = (watcher = { baseline: null, timer: null });
  const tick = async () => {
    if (watcher !== w) return;
    if (cli.connected && !cli.streaming && activeTab === "learn") {
      try {
        const now = await snapshot(s);
        if (watcher !== w) return;
        if (w.baseline === null) w.baseline = now;
        else if (s.dir) {
          const fresh = [...now].filter((n) => !w.baseline.has(n));
          if (fresh.length) return detected(l, i, `${s.dir}/${fresh[0]}`);
        } else if (now !== w.baseline) return detected(l, i, s.path);
      } catch (e) { console.warn("watch", e); }
    }
    if (watcher === w) w.timer = setTimeout(tick, 3000);
  };
  tick();
}

async function detected(l, i, path) {
  stopWatcher();
  prog.found[stepKey(l, i)] = path;
  toast(`🔍 Detected <code>${esc(path.split("/").pop())}</code>`);
  markStep(l, i);
  // markStep re-rendered and moved on; show the explanation in the completed step.
  openStep = i;
  render();
  showExplanation(i, path);
}

async function showExplanation(i, path) {
  const el = $(`#lessonView [data-step="${i}"] [data-explain]`);
  if (!el || !path || path.endsWith("favorites.txt")) return;
  el.innerHTML = `<p class="muted small">Loading ${esc(path)}…</p>`;
  try {
    const text = await readText(path);
    el.innerHTML = `<details open><summary>Raw file</summary><pre class="out">${esc(text.slice(0, 4000))}</pre></details>${explainFile(text)}`;
  } catch (e) {
    el.innerHTML = `<p class="muted small">Couldn't read the file: ${esc(e.message)}</p>`;
  }
}

// ---------- Interactions ----------
async function onAction(act, l, i, stepEl, target) {
  const s = l.steps[i];
  const out = stepEl.querySelector("[data-out]");
  switch (act) {
    case "toggle":
      openStep = stepEl.classList.contains("open") ? -1 : i;
      render();
      return;
    case "mark": return markStep(l, i);
    case "run": {
      if (!requireConn()) return;
      await ensureCLI();
      if (cli.streaming) return alert("Stop the running command first.");
      out.hidden = false;
      out.textContent = `$ ${s.cmd}\n…`;
      try {
        out.textContent = `$ ${s.cmd}\n${await cli.exec(s.cmd, 15000)}`;
        markStep(l, i);
      } catch (e) { out.textContent += `\n${e.message}`; }
      return;
    }
    case "listen": return listen(l, i, stepEl);
    case "pick": return pickExisting(l, i, stepEl);
    case "resetcode":
      delete prog.code[stepKey(l, i)]; save(); render();
      return;
    case "savecode": case "runcode": {
      if (!requireConn()) return;
      const status = stepEl.querySelector("[data-status]");
      const text = stepEl.querySelector("[data-code]").value;
      prog.code[stepKey(l, i)] = text; save();
      await ensureCLI();
      if (cli.streaming) return alert("Stop the running command first.");
      try {
        status.textContent = "Saving…";
        await cli.writeFile(s.path, text);
        status.textContent = `✓ Saved to ${s.path}`;
      } catch (e) { status.textContent = `Save failed: ${e.message}`; return; }
      if (act === "savecode") { if (!s.runCmd) markStep(l, i); return; }
      let output = "";
      await runStream(s.runCmd, out, (t) => { output += t; });
      if (!/error|exception|not found/i.test(output)) markStep(l, i);
      return;
    }
  }
  if (target?.dataset.pin != null) return pinClick(l, i, Number(target.dataset.pin), stepEl);
}

async function listen(l, i, stepEl) {
  const s = l.steps[i];
  const re = new RegExp(s.match, "m");
  const seen = new Set();
  let count = 0, partial = "";
  const out = stepEl.querySelector("[data-out]");
  const update = () => {
    stepEl.querySelector("[data-count]").textContent = Math.min(count, s.goal);
    stepEl.querySelector("[data-goalbar]").style.width = `${Math.min(100, (count / s.goal) * 100)}%`;
  };
  let reached = false;
  await runStream(s.cmd, out, (text) => {
    partial += text;
    const lines = partial.split("\n");
    partial = lines.pop();
    for (const line of lines) {
      if (line.trim() === s.cmd) continue;   // the CLI echoes the command back
      const m = line.trim().match(re);
      if (!m) continue;
      const key = s.unique ? m[0] : `${count}`;
      if (seen.has(key)) continue;
      seen.add(key); count++;
      update();
      toast(`📥 ${esc(m[0].slice(0, 60))}`);
      if (count >= s.goal && !reached) { reached = true; cli.interrupt(); }
    }
  });
  if (reached) markStep(l, i);
}

async function pickExisting(l, i, stepEl) {
  const s = l.steps[i];
  const box = stepEl.querySelector("[data-picker]");
  if (!requireConn()) return;
  try {
    const files = (await listFiles(s.dir)).filter((f) => !f.dir && f.name.endsWith(s.ext));
    box.innerHTML = files.length
      ? `<div class="picker">${files.map((f) => `<button data-file="${esc(f.name)}" class="small">${esc(f.name)}</button>`).join("")}</div>`
      : `<p class="muted small">No ${esc(s.ext)} files in ${esc(s.dir)} yet. Save one on the device!</p>`;
  } catch (e) { box.innerHTML = `<p class="muted small">${esc(e.message)}</p>`; }
}

function pinClick(l, i, n, stepEl) {
  if (stepDone(l, i)) return;
  const s = l.steps[i];
  const g = pinGame[stepKey(l, i)] ||= { idx: 0, found: [] };
  const target = s.targets[g.idx];
  const btn = stepEl.querySelector(`[data-pin="${n}"]`);
  if (PINS[n] === target) {
    g.found.push(n);
    g.idx++;
    toast(`✅ Pin ${n + 1} is <b>${esc(target)}</b>${PIN_NOTES[target] ? `: ${esc(PIN_NOTES[target])}` : ""}`);
    if (g.idx >= s.targets.length) return markStep(l, i);
    render();
  } else {
    btn.classList.add("wrong");
    setTimeout(() => btn.classList.remove("wrong"), 500);
    stepEl.querySelector("[data-pinmsg]").innerHTML =
      `Nope, pin ${n + 1} is <b>${esc(PINS[n])}</b>. Still looking for <b>${esc(target)}</b>.`;
  }
}

$("#lessonView").addEventListener("click", (e) => {
  const goto = e.target.closest("[data-goto]");
  if (goto) return selectLesson(goto.dataset.goto);
  const stepEl = e.target.closest("[data-step]");
  if (!stepEl) return;
  const l = lessonById(current);
  const i = Number(stepEl.dataset.step);
  const file = e.target.closest("[data-file]");
  if (file) {
    const path = `${l.steps[i].dir}/${file.dataset.file}`;
    prog.found[stepKey(l, i)] = path;
    markStep(l, i);
    openStep = i; render();
    return showExplanation(i, path);
  }
  const actEl = e.target.closest("[data-act]");
  const pin = e.target.closest("[data-pin]");
  if (actEl) onAction(actEl.dataset.act, l, i, stepEl, actEl);
  else if (pin) onAction(null, l, i, stepEl, pin);
});

$("#lessonView").addEventListener("input", (e) => {
  if (!e.target.matches("[data-code]")) return;
  const l = lessonById(current);
  prog.code[stepKey(l, Number(e.target.closest("[data-step]").dataset.step))] = e.target.value;
  save();
});

$("#lessonView").addEventListener("change", (e) => {
  const qEl = e.target.closest("[data-q]");
  if (!qEl) return;
  const l = lessonById(current);
  const qi = Number(qEl.dataset.q);
  const q = l.quiz[qi];
  const right = Number(e.target.value) === q.answer;
  qEl.querySelectorAll("label").forEach((lab) => lab.classList.remove("right", "wrong"));
  e.target.parentElement.classList.add(right ? "right" : "wrong");
  qEl.querySelector(".why").textContent = right ? `✓ ${q.why}` : "Not quite. Try another answer.";
  if (right && !quizDone(l, qi)) {
    prog.quiz[stepKey(l, qi)] = true;
    save();
    award(XP.quiz, "Quiz answer");
    finishCheck(l);
    setTimeout(render, 900);
  }
});

function selectLesson(id) {
  if (cli.streaming) cli.interrupt();
  current = id;
  openStep = null;
  store.set("flipperlab.lesson", id);
  render();
  $("#tab-learn").scrollIntoView({ behavior: "smooth" });
}

$("#lessonList").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-id]");
  if (b) selectLesson(b.dataset.id);
});

$("#xpCard").addEventListener("click", (e) => {
  if (e.target.id !== "resetProg") return;
  if (!confirm("Reset all lesson progress and XP?")) return;
  for (const k of ["steps", "quiz", "found"]) prog[k] = {};
  save();
  render();
});

connListeners.push(() => render());
tabListeners.push((name) => { if (name === "learn") render(); else stopWatcher(); });
render();
