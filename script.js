/* ═══════════════════════════════════════════════════════════
   AGENTICA — runtime
   Modules: motion utils · pointer field · reveal · nav ·
   AI core · palette · console (chat, voice, vision, files,
   memory, logs, timeline, api, webhooks, analytics, settings)
   ═══════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── rAF frame loop: one loop for all continuous work ── */
  const tasks = new Set();
  const onFrame = (fn) => (tasks.add(fn), () => tasks.delete(fn));
  const tick = () => {
    tasks.forEach((t) => t());
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  /* ═══ POINTER FIELD (throttled via rAF, smoothed) ═══ */
  const ptr = { x: innerWidth / 2, y: innerHeight / 2, sx: innerWidth / 2, sy: innerHeight / 2 };
  addEventListener(
    "pointermove",
    (e) => {
      ptr.x = e.clientX;
      ptr.y = e.clientY;
    },
    { passive: true }
  );

  const cursorLight = $("#cursorLight");
  const meshes = $$(".mesh");
  const coreStage = $("#coreStage");
  const core = $("#core");
  const specular = $(".core__specular");

  onFrame(() => {
    ptr.sx = lerp(ptr.sx, ptr.x, 0.08);
    ptr.sy = lerp(ptr.sy, ptr.y, 0.08);
    const nx = (ptr.sx / innerWidth - 0.5) * 2; // -1 … 1
    const ny = (ptr.sy / innerHeight - 0.5) * 2;

    if (cursorLight) cursorLight.style.transform = `translate3d(${ptr.sx}px,${ptr.sy}px,0)`;

    if (!REDUCED) {
      meshes.forEach((m) => {
        const d = parseFloat(m.dataset.depth || "0.02");
        m.style.setProperty("transform", "");
        m.style.marginLeft = `${nx * d * 260}px`;
        m.style.marginTop = `${ny * d * 260}px`;
      });

      if (core) {
        core.style.setProperty(
          "rotate",
          "" // reserved
        );
        core.parentElement.style.transform = `rotateX(${-ny * 7}deg) rotateY(${nx * 10}deg)`;
      }
      if (specular) {
        specular.style.setProperty("--sx", `${clamp(35 + nx * 26, 4, 92)}%`);
        specular.style.setProperty("--sy", `${clamp(28 + ny * 24, 4, 92)}%`);
      }
    }
  });

  /* ── per-surface specular sheen for glass cards ── */
  $$(".glass, .glass-thin").forEach((el) => {
    el.addEventListener(
      "pointermove",
      (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
        el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
      },
      { passive: true }
    );
  });

  /* ── tactile tilt on cards ── */
  if (!REDUCED) {
    $$(".tilt").forEach((el) => {
      let raf = null;
      const move = (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        if (raf) return;
        raf = requestAnimationFrame(() => {
          el.style.transform = `perspective(900px) rotateX(${-py * 5}deg) rotateY(${px * 6}deg) translateY(-4px)`;
          raf = null;
        });
      };
      el.addEventListener("pointermove", move, { passive: true });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
      });
    });
  }

  /* ═══ SCROLL REVEAL ═══ */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en, i) => {
        if (en.isIntersecting) {
          setTimeout(() => en.target.classList.add("is-in"), i * 70);
          io.unobserve(en.target);
        }
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
  );
  $$(".reveal").forEach((el) => io.observe(el));

  /* ═══ NAV: hide/show + active link + burger ═══ */
  const nav = $("#nav");
  let lastY = scrollY;
  addEventListener(
    "scroll",
    () => {
      const y = scrollY;
      nav.classList.toggle("is-hidden", y > lastY && y > 260 && !nav.classList.contains("is-open"));
      lastY = y;

      // hero → dashboard transition: the core dissolves upward into the OS
      const p = clamp(y / (innerHeight * 0.85), 0, 1);
      if (coreStage && !REDUCED) {
        coreStage.style.opacity = String(1 - p * 0.95);
        coreStage.style.filter = `blur(${p * 14}px)`;
        core.style.scale = String(1 - p * 0.35);
      }
      $(".hero__copy").style.opacity = String(1 - p * 1.1);
    },
    { passive: true }
  );

  $("#burger").addEventListener("click", (e) => {
    const open = nav.classList.toggle("is-open");
    e.currentTarget.setAttribute("aria-expanded", String(open));
  });
  $$(".navlink").forEach((a) =>
    a.addEventListener("click", () => nav.classList.remove("is-open"))
  );

  const sectionIO = new IntersectionObserver(
    (ents) =>
      ents.forEach((en) => {
        if (!en.isIntersecting) return;
        $$(".navlink").forEach((l) =>
          l.classList.toggle("is-active", l.getAttribute("href") === `#${en.target.id}`)
        );
      }),
    { threshold: 0.35 }
  );
  ["system", "console", "surfaces", "pricing"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) sectionIO.observe(el);
  });

  /* ═══ AMBIENT DUST PARTICLES ═══ */
  const canvas = $("#dust");
  if (canvas && !REDUCED) {
    const ctx = canvas.getContext("2d");
    let dpr = 1,
      parts = [];
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      const n = Math.round((innerWidth * innerHeight) / 26000);
      parts = Array.from({ length: n }, () => ({
        x: rand(0, canvas.width),
        y: rand(0, canvas.height),
        r: rand(0.4, 1.5) * dpr,
        vx: rand(-0.14, 0.14) * dpr,
        vy: rand(-0.22, -0.04) * dpr,
        a: rand(0.12, 0.5),
      }));
    };
    size();
    addEventListener("resize", size);
    onFrame(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        ctx.beginPath();
        ctx.fillStyle = `rgba(200,230,255,${p.a})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  /* ═══ SURFACE STACK PARALLAX ═══ */
  const stack = $("#stack");
  if (stack && !REDUCED) {
    addEventListener(
      "scroll",
      () => {
        const r = stack.getBoundingClientRect();
        const p = clamp(1 - (r.top + r.height / 2) / innerHeight, -1, 1);
        $$(".stack__layer", stack).forEach((l, i) => {
          const d = parseFloat(l.dataset.depth);
          l.style.transform = `rotateX(${58 - p * 26}deg) translateZ(${120 - i * 60}px) translateY(${p * d * -420}px)`;
        });
      },
      { passive: true }
    );
  }

  /* ═══ COMMAND PALETTE ═══ */
  const palette = $("#palette");
  const paletteInput = $("#paletteInput");
  const paletteList = $("#paletteList");
  const setPanel = (name) => {
    $$(".side__item").forEach((b) => b.classList.toggle("is-active", b.dataset.panel === name));
    $$(".panel").forEach((p) => p.classList.toggle("is-active", p.dataset.panel === name));
    document.getElementById("console").scrollIntoView({ behavior: REDUCED ? "auto" : "smooth" });
  };
  const COMMANDS = [
    { label: "Open chat", hint: "console", run: () => setPanel("chat") },
    { label: "Start voice session", hint: "console", run: () => setPanel("voice") },
    { label: "Open vision", hint: "console", run: () => setPanel("vision") },
    { label: "Upload files to context", hint: "console", run: () => setPanel("files") },
    { label: "Inspect memory", hint: "console", run: () => setPanel("memory") },
    { label: "Run workflow", hint: "runtime", run: () => (setPanel("logs"), runWorkflow()) },
    { label: "View execution logs", hint: "runtime", run: () => setPanel("logs") },
    { label: "Open workflow timeline", hint: "runtime", run: () => setPanel("timeline") },
    { label: "Test an API endpoint", hint: "integrations", run: () => setPanel("api") },
    { label: "Fire test webhook", hint: "integrations", run: () => (setPanel("webhooks"), fireHook()) },
    { label: "Open analytics", hint: "integrations", run: () => setPanel("analytics") },
    { label: "Workspace settings", hint: "integrations", run: () => setPanel("settings") },
    { label: "Jump to plans", hint: "site", run: () => $("#pricing").scrollIntoView({ behavior: "smooth" }) },
    { label: "Back to top", hint: "site", run: () => scrollTo({ top: 0, behavior: "smooth" }) },
  ];
  let sel = 0,
    shown = COMMANDS;

  function renderPalette(q = "") {
    shown = COMMANDS.filter((c) => c.label.toLowerCase().includes(q.toLowerCase().trim()));
    sel = 0;
    paletteList.innerHTML = shown
      .map((c, i) => `<li class="${i === 0 ? "is-sel" : ""}" data-i="${i}">${c.label}<em>${c.hint}</em></li>`)
      .join("");
  }
  function openPalette() {
    palette.hidden = false;
    paletteInput.value = "";
    renderPalette();
    paletteInput.focus();
  }
  function closePalette() {
    palette.hidden = true;
  }
  function moveSel(d) {
    const items = $$("li", paletteList);
    if (!items.length) return;
    sel = (sel + d + items.length) % items.length;
    items.forEach((li, i) => li.classList.toggle("is-sel", i === sel));
    items[sel].scrollIntoView({ block: "nearest" });
  }
  ["openPalette", "heroPalette", "osPalette"].forEach((id) =>
    document.getElementById(id)?.addEventListener("click", openPalette)
  );
  $("[data-close]").addEventListener("click", closePalette);
  paletteInput.addEventListener("input", (e) => renderPalette(e.target.value));
  paletteList.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    shown[+li.dataset.i].run();
    closePalette();
  });
  addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      palette.hidden ? openPalette() : closePalette();
      return;
    }
    if (palette.hidden) return;
    if (e.key === "Escape") closePalette();
    if (e.key === "ArrowDown") (e.preventDefault(), moveSel(1));
    if (e.key === "ArrowUp") (e.preventDefault(), moveSel(-1));
    if (e.key === "Enter" && shown[sel]) (shown[sel].run(), closePalette());
  });

  /* ═══ CONSOLE: panel switching ═══ */
  $$(".side__item").forEach((b) =>
    b.addEventListener("click", () => {
      $$(".side__item").forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
      $$(".panel").forEach((p) => p.classList.toggle("is-active", p.dataset.panel === b.dataset.panel));
    })
  );
  $$(".seg").forEach((seg) =>
    $$(".seg__i", seg).forEach((i) =>
      i.addEventListener("click", () => {
        $$(".seg__i", seg).forEach((x) => x.classList.remove("is-on"));
        i.classList.add("is-on");
      })
    )
  );

  /* ═══ CHAT with streaming response ═══ */
  const thread = $("#thread");
  const chatInput = $("#chatInput");
  const chatStatus = $("#chatStatus");
  const REPLIES = [
    "Traced it. The retry ceiling was hit three times on `stripe.invoice.sync`; I widened the backoff to 2s→32s and re-queued the batch.",
    "I spun up a scoped run in the sandbox region. 14 spans, 0 failures, 812ms end to end — safe to promote.",
    "Memory recall returned 6 matching episodes. Two contradict the current policy, so I flagged them instead of acting.",
    "Deployed the graph to fra-1, iad-1 and sin-1. Rollback checkpoint saved as run #48812.",
  ];
  let replyIdx = 0;

  function addMsg(text, who) {
    const el = document.createElement("div");
    el.className = `msg msg--${who}`;
    el.innerHTML = `<p>${text}</p>`;
    thread.appendChild(el);
    thread.scrollTop = thread.scrollHeight;
    return el;
  }
  function stream(text) {
    const el = addMsg('<span class="caret"></span>', "ai");
    const p = el.querySelector("p");
    let i = 0;
    chatStatus.innerHTML = "<span>streaming · reasoning</span>";
    const id = setInterval(() => {
      i += Math.ceil(rand(1, 3));
      p.innerHTML = text.slice(0, i).replace(/`([^`]+)`/g, "<code>$1</code>") + '<span class="caret"></span>';
      thread.scrollTop = thread.scrollHeight;
      if (i >= text.length) {
        clearInterval(id);
        p.innerHTML = text.replace(/`([^`]+)`/g, "<code>$1</code>");
        chatStatus.innerHTML = "<span>idle · 1,284 tokens</span>";
        pushActivity("Atlas answered a request");
      }
    }, REDUCED ? 1 : 18);
  }
  function send() {
    const v = chatInput.value.trim();
    if (!v) return;
    addMsg(v, "user");
    chatInput.value = "";
    chatStatus.innerHTML = "<span>thinking…</span>";
    setTimeout(() => stream(REPLIES[replyIdx++ % REPLIES.length]), REDUCED ? 10 : 520);
  }
  $("#chatSend").addEventListener("click", send);
  chatInput.addEventListener("keydown", (e) => e.key === "Enter" && send());

  /* ═══ VOICE ═══ */
  const orb = $("#voiceOrb");
  const wave = $("#wave");
  wave.innerHTML = Array.from({ length: 42 }, () => "<i></i>").join("");
  const bars = $$("i", wave);
  let listening = false;
  orb.addEventListener("click", () => {
    listening = !listening;
    orb.setAttribute("aria-pressed", String(listening));
    $("#voiceHint").textContent = listening
      ? "Listening — duplex session open on fra-1."
      : "Tap to open a live audio session.";
    if (listening) pushActivity("Voice session opened");
  });
  let waveT = 0;
  onFrame(() => {
    waveT += 0.08;
    bars.forEach((b, i) => {
      const amp = listening ? 1 : 0.12;
      const h = 6 + (Math.sin(waveT + i * 0.4) * 0.5 + 0.5) * 34 * amp * (listening ? rand(0.6, 1) : 1);
      b.style.height = `${h}px`;
    });
  });

  /* ═══ FILES: drag & drop ═══ */
  const drop = $("#drop");
  const filelist = $("#filelist");
  const addFile = (name, size) => {
    const li = document.createElement("li");
    li.innerHTML = `<b>${name}</b><i>embedding…</i><span>${size}</span>`;
    filelist.prepend(li);
    setTimeout(() => (li.querySelector("i").textContent = "embedded"), REDUCED ? 10 : 1400);
    pushActivity(`Embedded ${name}`);
  };
  ["dragenter", "dragover"].forEach((ev) =>
    drop.addEventListener(ev, (e) => (e.preventDefault(), drop.classList.add("is-over")))
  );
  ["dragleave", "drop"].forEach((ev) =>
    drop.addEventListener(ev, (e) => (e.preventDefault(), drop.classList.remove("is-over")))
  );
  drop.addEventListener("drop", (e) => {
    const files = Array.from(e.dataTransfer?.files || []);
    if (!files.length) return addFile("dropped-file.bin", "128 KB");
    files.forEach((f) => addFile(f.name, `${(f.size / 1024).toFixed(0)} KB`));
  });
  const fakeDrop = () => addFile(`sample-${Math.floor(rand(100, 999))}.pdf`, `${Math.floor(rand(120, 3200))} KB`);
  drop.addEventListener("click", fakeDrop);
  drop.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), fakeDrop()));

  /* ═══ MEMORY heatmap ═══ */
  const memgrid = $("#memgrid");
  memgrid.innerHTML = Array.from({ length: 180 }, () => {
    const a = Math.random() * 0.8;
    return `<span class="memcell" style="background:rgba(126,240,210,${a.toFixed(2)})" title="vector cluster"></span>`;
  }).join("");

  /* ═══ LOGS + JSON inspector + timeline ═══ */
  const logs = $("#logs");
  const jsonBody = $("#jsonBody");
  const STEPS = [
    ["ok", "trigger.webhook", "received invoice.created"],
    ["ok", "memory.recall", "6 episodes · 41ms"],
    ["ok", "model.reason", "plan drafted · 812 tokens"],
    ["warn", "tool.stripe", "rate limit soft-hit, backing off"],
    ["ok", "tool.stripe", "invoice synced · id in_9f2c"],
    ["ok", "graph.branch", "policy check passed"],
    ["err", "tool.email", "smtp timeout · retrying"],
    ["ok", "tool.email", "receipt delivered"],
    ["ok", "run.complete", "8 spans · 1.24s"],
  ];
  const stamp = () => new Date().toLocaleTimeString("en-GB", { hour12: false });
  function addLog([lvl, src, msg]) {
    const el = document.createElement("div");
    el.className = `log ${lvl}`;
    el.innerHTML = `<time>${stamp()}</time><b>${src}</b><span>${msg}</span>`;
    logs.appendChild(el);
    logs.scrollTop = logs.scrollHeight;
  }
  const highlight = (obj) =>
    JSON.stringify(obj, null, 2)
      .replace(/"([^"]+)":/g, '<span class="k">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="s">"$1"</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="n">$1</span>');
  const setJson = (o) => (jsonBody.innerHTML = highlight(o));
  setJson({
    run: "48812",
    agent: "atlas",
    region: "fra-1",
    spans: 8,
    duration_ms: 1243,
    tokens: { input: 812, output: 472 },
    status: "succeeded",
  });
  $("#jsonToggle").addEventListener("click", (e) => {
    const collapsed = jsonBody.classList.toggle("is-collapsed");
    e.currentTarget.textContent = collapsed ? "expand" : "collapse";
    e.currentTarget.setAttribute("aria-expanded", String(!collapsed));
  });

  let running = false;
  function runWorkflow() {
    if (running) return;
    running = true;
    logs.innerHTML = "";
    STEPS.forEach((s, i) =>
      setTimeout(() => {
        addLog(s);
        if (i === STEPS.length - 1) {
          running = false;
          setJson({
            run: String(48813 + Math.floor(rand(0, 40))),
            agent: "atlas",
            region: "fra-1",
            spans: STEPS.length,
            duration_ms: Math.round(rand(900, 1800)),
            retries: 1,
            status: "succeeded",
          });
          pushActivity("Workflow run completed");
        }
      }, i * (REDUCED ? 10 : 320))
    );
  }
  $("#runFlow").addEventListener("click", runWorkflow);
  STEPS.slice(0, 4).forEach(addLog);

  const timeline = $("#timeline");
  const SPANS = [
    ["trigger.webhook", 6, 0],
    ["memory.recall", 12, 6],
    ["model.reason", 44, 18],
    ["tool.stripe", 22, 62],
    ["graph.branch", 5, 84],
    ["tool.email", 9, 89],
  ];
  timeline.innerHTML = SPANS.map(
    ([name, w, off], i) => `<li>
      <span>${name}</span>
      <span class="bar" style="width:${w}%;margin-left:${off}%;animation-delay:${i * 90}ms"></span>
      <span class="dur">${(w * 14).toFixed(0)}ms</span>
    </li>`
  ).join("");

  /* ═══ API TESTER ═══ */
  $("#apiForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const out = $("#apiOut");
    out.textContent = "// sending…";
    setTimeout(() => {
      out.innerHTML = highlight({
        status: 200,
        method: $("#apiMethod").value,
        path: $("#apiUrl").value,
        latency_ms: Math.round(rand(28, 96)),
        body: { run_id: "48812", accepted: true, queued_at: new Date().toISOString() },
      });
      pushActivity("API request returned 200");
    }, REDUCED ? 10 : 460);
  });

  /* ═══ WEBHOOKS ═══ */
  function fireHook() {
    const li = document.createElement("li");
    const evt = ["run.completed", "run.failed", "memory.written"][Math.floor(rand(0, 3))];
    li.innerHTML = `<b>${evt}</b><i>https://hooks.agentica.dev/…/${Math.random().toString(16).slice(2, 5)}</i><span class="tag">sending</span>`;
    $("#hooks").prepend(li);
    setTimeout(() => {
      li.querySelector(".tag").className = "tag tag--ok";
      li.querySelector(".tag").textContent = "200";
      pushActivity(`Webhook ${evt} delivered`);
    }, REDUCED ? 10 : 900);
  }
  $("#fireHook").addEventListener("click", fireHook);

  /* ═══ ANALYTICS: counters + chart + spark ═══ */
  const chart = $("#chart");
  chart.innerHTML = Array.from({ length: 34 }, () => '<i style="height:8%"></i>').join("");
  const chartBars = $$("i", chart);
  const setChart = () => chartBars.forEach((b) => (b.style.height = `${rand(14, 100).toFixed(0)}%`));

  const spark = $("#spark");
  spark.innerHTML = Array.from({ length: 26 }, () => '<i style="height:20%"></i>').join("");
  const sparkBars = $$("i", spark);
  const setSpark = () => sparkBars.forEach((b) => (b.style.height = `${rand(18, 96).toFixed(0)}%`));

  const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n.toLocaleString("en-US"));
  function countUp(el) {
    const target = +el.dataset.count;
    const t0 = performance.now();
    const dur = REDUCED ? 1 : 1400;
    const step = (t) => {
      const p = clamp((t - t0) / dur, 0, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(target * e));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const analyticsIO = new IntersectionObserver(
    (ents) =>
      ents.forEach((en) => {
        if (!en.isIntersecting) return;
        $$("b[data-count]", en.target).forEach(countUp);
        setChart();
        analyticsIO.unobserve(en.target);
      }),
    { threshold: 0.2 }
  );
  analyticsIO.observe($('[data-panel="analytics"]'));
  $$('.side__item[data-panel="analytics"]').forEach((b) =>
    b.addEventListener("click", () => {
      $$('[data-panel="analytics"] b[data-count]').forEach(countUp);
      setChart();
    })
  );
  setSpark();
  setInterval(() => {
    if (document.hidden) return;
    setSpark();
    setChart();
  }, 3200);

  /* ═══ SETTINGS SWITCHES ═══ */
  $$(".switch").forEach((s) =>
    s.addEventListener("click", () => {
      const on = s.classList.toggle("is-on");
      s.setAttribute("aria-checked", String(on));
    })
  );

  /* ═══ RECENT ACTIVITY FEED ═══ */
  const activity = $("#activity");
  function pushActivity(text) {
    const li = document.createElement("li");
    li.innerHTML = `<time>${stamp().slice(0, 5)}</time><span>${text}</span>`;
    activity.prepend(li);
    while (activity.children.length > 6) activity.lastElementChild.remove();
  }
  ["Runtime promoted to v4.2", "Memory compaction finished", "Atlas deployed to fra-1"].forEach(pushActivity);
  setInterval(() => {
    if (document.hidden) return;
    const msgs = [
      "Scout retried a failed span",
      "Ledger synced 42 records",
      "Trace window compacted",
      "Edge cache warmed in iad-1",
    ];
    pushActivity(msgs[Math.floor(rand(0, msgs.length))]);
  }, 9000);
})();
