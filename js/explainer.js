/**
 * explainer.js — Full Product Explainer Video Mode
 * Automated sequential walkthrough of ROVAC's 6 operational stages.
 * Reuses existing canvas section animations & controls.
 */

(function () {
  // DOM Elements
  const heroStartBtn   = document.getElementById('explainer-start-hero-btn');
  const howStartBtn    = document.getElementById('explainer-start-how-btn');
  const navStartBtn    = document.getElementById('explainer-start-nav-btn');

  // Stages Definition (Crisp, perfectly paced durations matching exact animation lengths)
  const STAGES = [
    {
      num: '01',
      title: 'SCAN ENVIRONMENT',
      sectionId: 'lidar',
      duration: 15000,
      caption: "ROVAC's rotating LiDAR dome fires 1,800 infrared pulses per second at 300 RPM, measuring time-of-flight distances to walls and obstacles.",
      onStart: () => {
        const resetBtn = document.getElementById('lidar-reset-btn');
        if (resetBtn) resetBtn.click();
      }
    },
    {
      num: '02',
      title: 'BUILD MAP',
      sectionId: 'lidar',
      duration: 15000,
      caption: "As scan data accumulates in real-time, ROVAC constructs a precise 360° point-cloud map of the floor plan.",
      onStart: () => {
        const obsBtn = document.getElementById('lidar-obstacle-btn');
        if (obsBtn && !obsBtn.textContent.includes('Remove')) obsBtn.click();
      }
    },
    {
      num: '03',
      title: 'NAVIGATE',
      sectionId: 'navigation',
      duration: 19000,
      caption: "Using the room map, ROVAC plans a systematic boustrophedon (S-pattern) path that guarantees 100% floor coverage without overlapping.",
      onStart: () => {
        const modeBtn = document.getElementById('mode-smart');
        const restartBtn = document.getElementById('nav-restart-btn');
        if (modeBtn) modeBtn.click();
        if (restartBtn) restartBtn.click();
      }
    },
    {
      num: '04',
      title: 'CLEAN',
      sectionId: 'cleaning',
      duration: 17000,
      caption: "Four cleaning stages work simultaneously: side brush sweeps edges, dual roller agitates carpet, suction channels debris, and HEPA filter traps fine dust.",
      onStart: () => {
        const playBtn = document.getElementById('cleaning-play-btn');
        if (playBtn) playBtn.click();
      }
    },
    {
      num: '05',
      title: 'AVOID OBSTACLES',
      sectionId: 'obstacle',
      duration: 16000,
      caption: "Proximity sensors detect obstacles in real-time. Watch ROVAC dynamically reroute its course before any physical contact occurs.",
      onStart: () => {
        const pauseBtn = document.getElementById('obstacle-pause-btn');
        if (pauseBtn && pauseBtn.textContent.includes('Resume')) pauseBtn.click();
      }
    },
    {
      num: '06',
      title: 'RETURN & RECHARGE',
      sectionId: 'dock',
      duration: 20000,
      caption: "When the battery runs low or cleaning completes, ROVAC autonomously locates its charging dock via IR homing signals, aligns, and begins recharging.",
      onStart: () => {
        const dockBtn = document.getElementById('dock-play-btn');
        if (dockBtn && !dockBtn.disabled) dockBtn.click();
      }
    }
  ];

  // Mode State
  let isActive    = false;
  let isPaused    = false;
  let stageIdx    = 0;
  let timerId     = null;
  let progressRaf = null;
  let stageStart  = 0;
  let elapsed     = 0;

  // Dynamic UI Overlay Elements
  let overlayEl, barProgressEl, stageNumEl, stageTitleEl, stageDescEl, playPauseBtn, prevBtn, nextBtn, closeBtn, completionModal;

  function initUI() {
    if (document.getElementById('explainer-overlay')) return;

    // Create top player overlay bar with integrated stage caption
    overlayEl = document.createElement('div');
    overlayEl.id = 'explainer-overlay';
    overlayEl.className = 'explainer-overlay hidden';
    overlayEl.setAttribute('role', 'region');
    overlayEl.setAttribute('aria-label', 'Product Explainer Player Controls');

    overlayEl.innerHTML = `
      <div class="explainer-bar-inner">
        <div class="explainer-badge">
          <span class="explainer-pulse"></span>
          <span>EXPLAINER VIDEO MODE</span>
        </div>

        <div class="explainer-pills">
          ${STAGES.map((s, idx) => `
            <button class="explainer-pill" data-idx="${idx}" title="${s.title}">
              <span class="pill-num">${s.num}</span>
              <span class="pill-name">${s.title.split('.')[1] || s.title}</span>
            </button>
          `).join('')}
        </div>

        <div class="explainer-controls">
          <button class="explainer-ctrl-btn" id="explainer-prev-btn" title="Previous Stage">&larr; Prev</button>
          <button class="explainer-ctrl-btn primary" id="explainer-playpause-btn" title="Play/Pause">Pause</button>
          <button class="explainer-ctrl-btn" id="explainer-next-btn" title="Next Stage">Next &rarr;</button>
          <button class="explainer-ctrl-btn close" id="explainer-close-btn" title="Exit Explainer Mode">&times; Exit</button>
        </div>
      </div>

      <div class="explainer-caption-bar">
        <span class="caption-stage-tag" id="explainer-stage-num">01 / 06</span>
        <span class="caption-stage-title" id="explainer-stage-title">SCAN ENVIRONMENT</span>
        <span class="caption-sep">&bull;</span>
        <span class="caption-body" id="explainer-stage-desc"></span>
      </div>

      <div class="explainer-progress-track">
        <div class="explainer-progress-fill" id="explainer-progress-fill"></div>
      </div>
    `;

    document.body.appendChild(overlayEl);

    // Completion modal
    completionModal = document.createElement('div');
    completionModal.id = 'explainer-completion-modal';
    completionModal.className = 'explainer-modal-backdrop hidden';
    completionModal.innerHTML = `
      <div class="explainer-modal">
        <div class="modal-badge">&#x2714; EXPLAINER COMPLETE</div>
        <h3 class="modal-title">Product Explanation Finished</h3>
        <p class="modal-desc">You have watched how ROVAC&trade; scans, maps, navigates, cleans, avoids obstacles, and returns to recharge.</p>
        <div class="modal-actions">
          <button class="btn-primary" id="explainer-replay-btn">&#x25B6; Replay Video</button>
          <button class="btn-secondary" id="explainer-modal-close-btn">Explore Interactively</button>
        </div>
      </div>
    `;
    document.body.appendChild(completionModal);

    // Cache elements
    barProgressEl = document.getElementById('explainer-progress-fill');
    stageNumEl    = document.getElementById('explainer-stage-num');
    stageTitleEl  = document.getElementById('explainer-stage-title');
    stageDescEl   = document.getElementById('explainer-stage-desc');
    playPauseBtn  = document.getElementById('explainer-playpause-btn');
    prevBtn       = document.getElementById('explainer-prev-btn');
    nextBtn       = document.getElementById('explainer-next-btn');
    closeBtn      = document.getElementById('explainer-close-btn');

    // Event Listeners
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', prevStage);
    nextBtn.addEventListener('click', nextStage);
    closeBtn.addEventListener('click', stopExplainer);

    document.getElementById('explainer-replay-btn').addEventListener('click', () => {
      completionModal.classList.add('hidden');
      startExplainer(0);
    });

    document.getElementById('explainer-modal-close-btn').addEventListener('click', () => {
      completionModal.classList.add('hidden');
      stopExplainer();
    });

    // Pill click navigation
    overlayEl.querySelectorAll('.explainer-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        goToStage(idx);
      });
    });

    // ESC to exit
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isActive) stopExplainer();
    });
  }

  function startExplainer(startIdx = 0) {
    initUI();
    isActive = true;
    isPaused = false;
    completionModal.classList.add('hidden');
    overlayEl.classList.remove('hidden');
    playPauseBtn.textContent = 'Pause';
    goToStage(startIdx);
  }

  function stopExplainer() {
    isActive = false;
    isPaused = false;
    clearTimeout(timerId);
    if (progressRaf) cancelAnimationFrame(progressRaf);
    if (overlayEl) overlayEl.classList.add('hidden');
    if (completionModal) completionModal.classList.add('hidden');
  }

  function getElementOffsetTop(el) {
    let top = 0;
    while (el) {
      top += el.offsetTop;
      el = el.offsetParent;
    }
    return top;
  }

  function goToStage(idx) {
    if (idx < 0) idx = 0;
    if (idx >= STAGES.length) {
      showCompletion();
      return;
    }

    clearTimeout(timerId);
    if (progressRaf) cancelAnimationFrame(progressRaf);

    stageIdx = idx;
    const stage = STAGES[stageIdx];
    elapsed = 0;
    stageStart = performance.now();

    // 1. Scroll directly to target canvas animation element with ~85px gap so section title is visible & canvas is centered
    const secEl = document.getElementById(stage.sectionId);
    if (secEl) {
      const targetEl = secEl.querySelector('canvas') || secEl.querySelector('.lidar-body, .nav-demo-body, .cleaning-body, .obstacle-body, .dock-body') || secEl;
      const overlayH = overlayEl ? overlayEl.offsetHeight : 110;
      const absoluteTop = getElementOffsetTop(targetEl);
      
      // Position top edge of animation canvas ~85px below top player bar to show title & center canvas
      const targetScrollY = Math.max(0, absoluteTop - overlayH - 85);

      window.scrollTo({
        top: targetScrollY,
        behavior: 'smooth'
      });
    }

    // 2. Trigger native section animation
    try {
      stage.onStart();
    } catch (err) {
      console.log('Stage start error:', err);
    }

    // 3. Update UI
    stageNumEl.textContent = `0${stageIdx + 1} / 0${STAGES.length}`;
    stageTitleEl.textContent = stage.title;
    stageDescEl.textContent = stage.caption;

    // Highlight active pill
    overlayEl.querySelectorAll('.explainer-pill').forEach((btn, i) => {
      btn.classList.toggle('active', i === stageIdx);
      btn.classList.toggle('passed', i < stageIdx);
    });

    // Start progress animation & transition timer
    if (!isPaused) {
      runStageTimer(stage.duration);
    }
  }

  function runStageTimer(duration) {
    const start = performance.now() - elapsed;

    function step(now) {
      if (isPaused || !isActive) return;
      elapsed = now - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      if (barProgressEl) barProgressEl.style.width = `${pct}%`;

      if (elapsed < duration) {
        progressRaf = requestAnimationFrame(step);
      } else {
        nextStage();
      }
    }

    progressRaf = requestAnimationFrame(step);
  }

  function togglePlayPause() {
    if (!isActive) return;
    isPaused = !isPaused;
    playPauseBtn.textContent = isPaused ? 'Play' : 'Pause';

    if (isPaused) {
      if (progressRaf) cancelAnimationFrame(progressRaf);
      clearTimeout(timerId);
    } else {
      const stage = STAGES[stageIdx];
      runStageTimer(stage.duration);
    }
  }

  function prevStage() {
    if (stageIdx > 0) {
      goToStage(stageIdx - 1);
    }
  }

  function nextStage() {
    if (stageIdx < STAGES.length - 1) {
      goToStage(stageIdx + 1);
    } else {
      showCompletion();
    }
  }

  function showCompletion() {
    stopExplainer();
    if (completionModal) completionModal.classList.remove('hidden');
  }

  // Attach triggers when DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    initUI();

    if (heroStartBtn) {
      heroStartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        startExplainer(0);
      });
    }

    if (howStartBtn) {
      howStartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        startExplainer(0);
      });
    }

    if (navStartBtn) {
      navStartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        startExplainer(0);
      });
    }
  });

  // Export global trigger function
  window.startProductExplainer = startExplainer;
})();
