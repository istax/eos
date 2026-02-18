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

  let prepIntervalId = null;
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
    if (document.visibilityState === "visible" && (prepIntervalId || stopBtn.disabled === false)) {
      acquireWakeLock();
    }
  });

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

  function clampVal(v) { return Math.max(0, Math.min(8, parseInt(v, 10) || 0)); }

  function getBreathPattern() {
    return {
      inhale:   clampVal(document.getElementById("boxInhale")?.value),
      hold_in:  clampVal(document.getElementById("boxHoldIn")?.value),
      exhale:   clampVal(document.getElementById("boxExhale")?.value),
      hold_out: clampVal(document.getElementById("boxHoldOut")?.value),
    };
  }

  async function startSession() {
    if (prepIntervalId) return;
    const durationSelect = document.getElementById("sessionDuration");
    const duration = durationSelect ? parseInt(durationSelect.value, 10) || 10 : 10;
    const pattern = getBreathPattern();

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
        activePattern = pattern;
        fetch(`/api/start?duration=${duration}&inhale=${pattern.inhale}&hold_in=${pattern.hold_in}&exhale=${pattern.exhale}&hold_out=${pattern.hold_out}`, { method: "POST" });
      }
    }, 1000);
  }

  async function stopSession() {
    if (prepIntervalId) {
      cancelPrep();
      return;
    }
    await fetch("/api/stop", { method: "POST" });
    stopAllAudio();
    releaseWakeLock();
  }

  async function getState() {
    const response = await fetch("/api/state");
    return await response.json();
  }

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
      if (phase === "inhale" || phase === "pause_in") {
        const dur = activePattern.inhale + activePattern.hold_in;
        circleEl.style.transition = `background 1s ease, box-shadow 1s ease, transform ${dur}s ease-in-out`;
        circleEl.classList.add("circle-expand");
      } else if (phase === "exhale" || phase === "pause_out") {
        const dur = activePattern.exhale + activePattern.hold_out;
        circleEl.style.transition = `background 1s ease, box-shadow 1s ease, transform ${dur}s ease-in-out`;
        circleEl.classList.add("circle-contract");
      } else {
        circleEl.style.transition = "background 1s ease, box-shadow 1s ease, transform 1s ease-in-out";
      }
    }
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

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

  let previousPhase = null;
  let wasActive = false;

  function playGong() {
    const gongEl = document.getElementById("gongAudio");
    if (gongEl) {
      gongEl.volume = getVolume();
      gongEl.currentTime = 0;
      gongEl.play().catch(() => {});
    }
  }

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
  if (themeSelect) {
    themeSelect.addEventListener("change", () => {
      document.body.className = themeSelect.value;
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
      [document.getElementById("inhaleAudio"), document.getElementById("exhaleAudio"), document.getElementById("gongAudio")].forEach(el => {
        if (el) el.volume = pct / 100;
      });
    });
  }

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

  let summaryShown = false;

  function showSummary(state) {
    if (summaryShown) return;
    summaryShown = true;
    const elapsed = formatTime(state.elapsed || 0);
    const cycles = state.cycles_completed || 0;
    instruction.textContent = "";
    if (circleEl) {
      circleEl.classList.remove("circle-expand", "circle-contract");
      circleEl.style.transition = "background 1s ease, box-shadow 1s ease, transform 1s ease-in-out";
    }
    if (statusEl) {
      statusEl.textContent = elapsed;
    }
    setTimeout(() => {
      if (statusEl) statusEl.innerHTML = "";
      summaryShown = false;
    }, 8000);
  }

  function updateStatus(state) {
    if (!statusEl) return;
    if (!state.active) return;
    if (state.remaining >= 0) {
      statusEl.textContent = formatTime(state.remaining);
    } else {
      statusEl.textContent = formatTime(state.elapsed || 0);
    }
  }

  setInterval(async () => {
    try {
      const state = await getState();
      const phase = state.phase;
      updateUI(phase);
      if (phase !== previousPhase) {
        playPhaseSound(phase);
        previousPhase = phase;
      }
      if (state.active) {
        updateStatus(state);
      }
      if (!state.active) {
        previousPhase = null;
        if (wasActive) {
          stopAllAudio();
          if (state.ended_by === "timer") {
            playGong();
            showSummary(state);
          } else {
            if (statusEl) statusEl.textContent = "";
          }
          releaseWakeLock();
        }
      }
      wasActive = state.active;
      const inPrep = !!prepIntervalId;
      startBtn.disabled = state.active || inPrep;
      stopBtn.disabled = !state.active && !inPrep;
    } catch (err) {
      console.log("API error:", err);
    }
  }, 1000);

}

