console.log("JS LOADED");

(function initGuide() {
  const guideOverlay = document.getElementById("guide-overlay");
  const guideCloseBtn = document.getElementById("guide-close-btn");
  const introGuideBtn = document.getElementById("intro-guide-btn");
  const menuGuideBtn = document.getElementById("menu-guide-btn");

  function openGuide() {
    if (guideOverlay) guideOverlay.classList.add("guide-visible");
  }

  function closeGuide() {
    if (guideOverlay) guideOverlay.classList.remove("guide-visible");
  }

  if (guideCloseBtn) guideCloseBtn.addEventListener("click", closeGuide);
  if (introGuideBtn) introGuideBtn.addEventListener("click", openGuide);
  if (menuGuideBtn) menuGuideBtn.addEventListener("click", openGuide);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && guideOverlay && guideOverlay.classList.contains("guide-visible")) {
      closeGuide();
    }
  });
})();

(function initIntro() {
  const overlay = document.getElementById("intro-overlay");
  const beginBtn = document.getElementById("intro-begin-btn");
  const skipBox = document.getElementById("intro-skip-checkbox");

  if (!overlay) return;

  if (localStorage.getItem("eos-skip-intro") === "1") {
    overlay.remove();
    return;
  }

  function dismissIntro() {
    if (skipBox && skipBox.checked) {
      localStorage.setItem("eos-skip-intro", "1");
    }
    overlay.classList.add("intro-hidden");
    setTimeout(() => overlay.remove(), 600);
  }

  if (beginBtn) beginBtn.addEventListener("click", dismissIntro);
})();

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const instruction = document.getElementById("instruction");

if (!startBtn || !stopBtn || !instruction) {
  console.log("Some elements missing");
} else {

  // --- Session state ---
  const session = {
    active: false,
    phase: "ready",
    pattern: { inhale: 5, hold_in: 1, exhale: 5, hold_out: 1 },
    durationMinutes: 0,
    startTime: null,
    phaseTimerId: null,
    tickTimerId: null,
    cyclesCompleted: 0,
    endedBy: null,
  };

  // --- Wake lock ---
  let wakeLock = null;

  async function acquireWakeLock() {
    if ("wakeLock" in navigator) {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => { wakeLock = null; });
      } catch (e) {
        console.log("Wake lock not available:", e.message);
      }
    }
  }

  async function releaseWakeLock() {
    if (wakeLock) {
      try { await wakeLock.release(); } catch (e) {}
      wakeLock = null;
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && session.active) {
      acquireWakeLock();
    }
  });

  // --- Prep countdown ---
  let prepIntervalId = null;

  function cancelPrep() {
    if (prepIntervalId) {
      clearInterval(prepIntervalId);
      prepIntervalId = null;
    }
    const prepEl = document.getElementById("prep-countdown");
    if (prepEl) {
      prepEl.classList.remove("prep-visible");
      prepEl.textContent = "";
    }
    instruction.textContent = "";
    if (statusEl) statusEl.textContent = "";
    startBtn.disabled = false;
    stopBtn.disabled = true;
    stopAllAudio();
    releaseWakeLock();
  }

  // --- Pattern reading ---
  function clampVal(v) { return Math.max(0, Math.min(8, parseInt(v, 10) || 0)); }

  function getBreathPattern() {
    return {
      inhale:   clampVal(document.getElementById("boxInhale")?.value),
      hold_in:  clampVal(document.getElementById("boxHoldIn")?.value),
      exhale:   clampVal(document.getElementById("boxExhale")?.value),
      hold_out: clampVal(document.getElementById("boxHoldOut")?.value),
    };
  }

  // --- Phase logic ---
  function phaseDuration(phase) {
    switch (phase) {
      case "inhale":   return session.pattern.inhale * 1000;
      case "pause_in": return session.pattern.hold_in * 1000;
      case "exhale":   return session.pattern.exhale * 1000;
      case "pause_out":return session.pattern.hold_out * 1000;
      default: return 0;
    }
  }

  function nextPhase(phase) {
    switch (phase) {
      case "inhale":   return "pause_in";
      case "pause_in": return "exhale";
      case "exhale":   return "pause_out";
      case "pause_out":return "inhale";
      default: return "complete";
    }
  }

  function advancePhase() {
    if (!session.active) return;

    if (session.durationMinutes > 0) {
      const elapsed = (Date.now() - session.startTime) / 1000;
      if (elapsed >= session.durationMinutes * 60) {
        endSession("timer");
        return;
      }
    }

    if (session.phase === "pause_out") {
      session.cyclesCompleted++;
    }

    session.phase = nextPhase(session.phase);

    updateUI(session.phase);
    playPhaseSound(session.phase);

    const dur = phaseDuration(session.phase);
    if (dur > 0) {
      session.phaseTimerId = setTimeout(advancePhase, dur);
    } else {
      session.phaseTimerId = setTimeout(advancePhase, 0);
    }
  }

  function beginBreathing() {
    session.active = true;
    session.phase = "inhale";
    session.startTime = Date.now();
    session.cyclesCompleted = 0;
    session.endedBy = null;

    activePattern = { ...session.pattern };

    updateUI(session.phase);
    playPhaseSound(session.phase);

    const dur = phaseDuration(session.phase);
    if (dur > 0) {
      session.phaseTimerId = setTimeout(advancePhase, dur);
    } else {
      session.phaseTimerId = setTimeout(advancePhase, 0);
    }

    session.tickTimerId = setInterval(tick, 1000);
  }

  function endSession(reason) {
    session.active = false;
    session.phase = "complete";
    session.endedBy = reason;

    clearTimeout(session.phaseTimerId);
    clearInterval(session.tickTimerId);
    session.phaseTimerId = null;
    session.tickTimerId = null;

    stopAllAudio();
    updateUI(session.phase);
    releaseWakeLock();

    if (reason === "timer") {
      playGong();
      showSummary();
    } else {
      if (statusEl) statusEl.textContent = "";
    }

    startBtn.disabled = false;
    stopBtn.disabled = true;
  }

  // --- Start / Stop ---
  async function startSession() {
    if (prepIntervalId) return;

    const durationSelect = document.getElementById("sessionDuration");
    const durationMinutes = durationSelect ? parseInt(durationSelect.value, 10) || 0 : 10;
    const pattern = getBreathPattern();

    session.pattern = pattern;
    session.durationMinutes = durationMinutes;

    acquireWakeLock();

    const gongEl = document.getElementById("gongAudio");
    if (gongEl) {
      gongEl.volume = getVolume();
      gongEl.currentTime = 0;
      gongEl.play().catch(() => {});
    }

    const prepEl = document.getElementById("prep-countdown");
    if (prepEl) {
      prepEl.classList.add("prep-visible");
    }
    instruction.textContent = "";
    startBtn.disabled = true;
    stopBtn.disabled = false;

    let count = 10;
    if (prepEl) prepEl.textContent = count;

    prepIntervalId = setInterval(() => {
      count--;
      if (prepEl) prepEl.textContent = count > 0 ? count : "0";
      if (count <= 0) {
        clearInterval(prepIntervalId);
        prepIntervalId = null;
        if (prepEl) {
          prepEl.classList.remove("prep-visible");
          prepEl.textContent = "";
        }
        beginBreathing();
      }
    }, 1000);
  }

  function stopSession() {
    if (prepIntervalId) {
      cancelPrep();
      return;
    }
    if (session.active) {
      endSession("user");
    }
  }

  // --- UI ---
  const circleEl = document.getElementById("circle");
  const statusEl = document.getElementById("status");
  let activePattern = { inhale: 5, hold_in: 1, exhale: 5, hold_out: 1 };

  function displayPhase(phase) {
    if (phase === "inhale" || phase === "pause_in") return "inhale";
    if (phase === "exhale" || phase === "pause_out") return "exhale";
    return "";
  }

  function updateUI(phase) {
    instruction.textContent = displayPhase(phase);
    if (circleEl) {
      circleEl.classList.remove("circle-expand", "circle-contract");
      const baseTransition = "background 1s ease, box-shadow 1s ease";
      if (phase === "inhale") {
        circleEl.style.transition = `${baseTransition}, transform ${activePattern.inhale}s ease-in-out`;
        circleEl.classList.add("circle-expand");
      } else if (phase === "pause_in") {
        circleEl.style.transition = `${baseTransition}, transform 0s ease-in-out`;
        circleEl.classList.add("circle-expand");
      } else if (phase === "exhale") {
        circleEl.style.transition = `${baseTransition}, transform ${activePattern.exhale}s ease-in-out`;
        circleEl.classList.add("circle-contract");
      } else if (phase === "pause_out") {
        circleEl.style.transition = `${baseTransition}, transform 0s ease-in-out`;
        circleEl.classList.add("circle-contract");
      } else {
        circleEl.style.transition = `${baseTransition}, transform 1s ease-in-out`;
      }
    }
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  function tick() {
    if (!session.active || !statusEl) return;
    const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
    if (session.durationMinutes > 0) {
      const remaining = Math.max(0, session.durationMinutes * 60 - elapsed);
      statusEl.textContent = formatTime(remaining);
    } else {
      statusEl.textContent = formatTime(elapsed);
    }
  }

  // --- Audio ---
  function getVolume() {
    const slider = document.getElementById("volumeSlider");
    return slider ? Math.min(1, Math.max(0, parseFloat(slider.value) / 100)) : 0.8;
  }

  const inhaleAudio = document.getElementById("inhaleAudio");
  const exhaleAudio = document.getElementById("exhaleAudio");

  function stopAllAudio() {
    [inhaleAudio, exhaleAudio].forEach(el => {
      if (el) { el.pause(); el.currentTime = 0; }
    });
  }

  function playPhaseSound(phase) {
    const vol = getVolume();
    stopAllAudio();
    if (vol <= 0) return;

    let el = null;
    if (phase === "inhale") el = inhaleAudio;
    else if (phase === "exhale") el = exhaleAudio;

    if (el) {
      el.volume = vol;
      el.currentTime = 0;
      el.play().catch(() => {});
    }
  }

  function playGong() {
    const gongEl = document.getElementById("gongAudio");
    if (gongEl) {
      gongEl.volume = getVolume();
      gongEl.currentTime = 0;
      gongEl.play().catch(() => {});
    }
  }

  // --- Summary ---
  let summaryShown = false;

  function showSummary() {
    if (summaryShown) return;
    summaryShown = true;
    const elapsed = session.startTime ? Math.floor((Date.now() - session.startTime) / 1000) : 0;
    instruction.textContent = "";
    if (circleEl) {
      circleEl.classList.remove("circle-expand", "circle-contract");
      circleEl.style.transition = "background 1s ease, box-shadow 1s ease, transform 1s ease-in-out";
    }
    if (statusEl) {
      statusEl.textContent = formatTime(elapsed);
    }
    setTimeout(() => {
      if (statusEl) statusEl.textContent = "";
      summaryShown = false;
    }, 8000);
  }

  // --- Menu ---
  const menuBtn = document.getElementById("menu-btn");
  const menuPanel = document.getElementById("menu-panel");
  const menuBackdrop = document.getElementById("menu-backdrop");

  function setMenuOpen(open) {
    const isOpen = !!open;
    if (menuPanel) menuPanel.classList.toggle("open", isOpen);
    if (menuBackdrop) menuBackdrop.classList.toggle("open", isOpen);
    if (menuBtn) {
      menuBtn.setAttribute("aria-expanded", isOpen);
      menuBtn.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    }
    document.body.style.overflow = isOpen ? "hidden" : "";
  }

  function toggleMenu() {
    const isOpen = menuPanel && menuPanel.classList.contains("open");
    setMenuOpen(!isOpen);
  }

  if (menuBtn) menuBtn.addEventListener("click", toggleMenu);
  if (menuBackdrop) menuBackdrop.addEventListener("click", setMenuOpen.bind(null, false));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuPanel && menuPanel.classList.contains("open")) {
      setMenuOpen(false);
    }
  });

  if (menuPanel) {
    menuPanel.addEventListener("click", (e) => e.stopPropagation());
  }

  // --- Event listeners ---
  startBtn.addEventListener("click", startSession);
  stopBtn.addEventListener("click", stopSession);

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && e.target === document.body) {
      e.preventDefault();
      if (!startBtn.disabled) {
        startSession();
      } else if (!stopBtn.disabled) {
        stopSession();
      }
    }
  });

  const themeSelect = document.getElementById("themeSelect");
  const THEME_KEY = "eos-theme";

  function applyTheme(theme) {
    if (!theme) return;
    document.body.className = theme;
    if (themeSelect) themeSelect.value = theme;
  }

  // Load saved theme on startup
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme) {
    applyTheme(savedTheme);
  }

  if (themeSelect) {
    themeSelect.addEventListener("change", () => {
      const value = themeSelect.value;
      applyTheme(value);
      try {
        localStorage.setItem(THEME_KEY, value);
      } catch (_) {
        // ignore storage errors
      }
    });
  }

  const fullscreenBtn = document.getElementById("fullscreenBtn");
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    });
  }

  const volumeSlider = document.getElementById("volumeSlider");
  const volumeValue = document.getElementById("volumeValue");
  if (volumeSlider) {
    volumeSlider.addEventListener("input", () => {
      const pct = volumeSlider.value;
      if (volumeValue) volumeValue.textContent = pct + "%";
      [inhaleAudio, exhaleAudio, document.getElementById("gongAudio")].forEach(el => {
        if (el) el.volume = pct / 100;
      });
    });
  }

  // --- Presets & pattern boxes ---
  const presetBtns = document.querySelectorAll(".preset-btn");
  const boxInhale = document.getElementById("boxInhale");
  const boxHoldIn = document.getElementById("boxHoldIn");
  const boxExhale = document.getElementById("boxExhale");
  const boxHoldOut = document.getElementById("boxHoldOut");

  function setBoxValues(inhale, holdIn, exhale, holdOut) {
    if (boxInhale) boxInhale.value = inhale;
    if (boxHoldIn) boxHoldIn.value = holdIn;
    if (boxExhale) boxExhale.value = exhale;
    if (boxHoldOut) boxHoldOut.value = holdOut;
  }

  function updatePresetHighlight() {
    const current = [
      clampVal(boxInhale?.value),
      clampVal(boxHoldIn?.value),
      clampVal(boxExhale?.value),
      clampVal(boxHoldOut?.value),
    ].join("-");
    presetBtns.forEach(btn => {
      btn.classList.toggle("preset-active", btn.dataset.preset === current);
    });
  }

  presetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const parts = btn.dataset.preset.split("-").map(Number);
      setBoxValues(parts[0], parts[1], parts[2], parts[3]);
      updatePresetHighlight();
    });
  });

  [boxInhale, boxHoldIn, boxExhale, boxHoldOut].forEach(box => {
    if (!box) return;
    box.addEventListener("input", () => {
      let v = parseInt(box.value, 10);
      if (isNaN(v)) return;
      if (v < 0) box.value = 0;
      if (v > 8) box.value = 8;
      updatePresetHighlight();
    });
    box.addEventListener("blur", () => {
      box.value = clampVal(box.value);
      updatePresetHighlight();
    });
  });

}

(function initDonate() {
  const BTC_ADDRESS = "bc1qafp8x7ks0dq4pkpkdvk22x5756fmgj3p962s0fryvwqg9t85helq7gjgz9";
  const LN_ADDRESS = "friendlycachet457239@getalby.com";

  const btcLink = document.getElementById("btc-donate-link");
  const lnLink = document.getElementById("ln-donate-link");
  if (!btcLink && !lnLink) return;

  function attachCopyHandler(linkEl, value, label) {
    if (!linkEl) return;
    const labelSpan = linkEl.querySelector(".donate-label");
    const originalText = labelSpan ? labelSpan.textContent : null;
    linkEl.addEventListener("click", (e) => {
      e.preventDefault();
      navigator.clipboard.writeText(value).then(() => {
        if (labelSpan && originalText !== null) {
          labelSpan.textContent = "Copied!";
          setTimeout(() => { labelSpan.textContent = originalText; }, 2000);
        } else {
          alert(label + " copied to clipboard.");
        }
      }).catch(() => {
        prompt(label + ":", value);
      });
    });
  }

  attachCopyHandler(btcLink, BTC_ADDRESS, "Bitcoin address");
  attachCopyHandler(lnLink, LN_ADDRESS, "Lightning address");
})();
