// Lightweight plexus effect for hero/left panel + slide-out menu panel
(function () {
  const PLEXUS_CONFIG = {
    // calm | medium | chaotic
    mode: 'medium',
    // Fraction of particles inside burst radius required to trigger explosion.
    // e.g. 0.26 = 26% of particles.
    explodeClusterPercent: 0.26
  };

  const MODE_PRESETS = {
    calm: { nodeCount: 30, maxDist: 110, cursorRadius: 180, pullForce: 0.03, burstRadius: 74, burstCooldownFrames: 42, attractResumeFrames: 20, burstPower: 3.0 },
    medium: { nodeCount: 42, maxDist: 130, cursorRadius: 210, pullForce: 0.05, burstRadius: 88, burstCooldownFrames: 32, attractResumeFrames: 16, burstPower: 3.4 },
    chaotic: { nodeCount: 56, maxDist: 145, cursorRadius: 240, pullForce: 0.07, burstRadius: 96, burstCooldownFrames: 22, attractResumeFrames: 12, burstPower: 3.9 }
  };
  const ACTIVE = MODE_PRESETS[PLEXUS_CONFIG.mode] || MODE_PRESETS.medium;

  const NODE_COUNT = ACTIVE.nodeCount;
  const MAX_DIST = ACTIVE.maxDist;
  const CURSOR_RADIUS = ACTIVE.cursorRadius;
  const PULL_FORCE = ACTIVE.pullForce;
  const BURST_RADIUS = ACTIVE.burstRadius;
  const BURST_COOLDOWN_FRAMES = ACTIVE.burstCooldownFrames;
  const ATTRACT_RESUME_FRAMES = ACTIVE.attractResumeFrames;
  const BURST_POWER = ACTIVE.burstPower;
  const BURST_CLUSTER_THRESHOLD = Math.max(2, Math.floor(NODE_COUNT * PLEXUS_CONFIG.explodeClusterPercent));

  function initPlexus(panel) {
    if (!panel) return;
    if (panel.querySelector('.plexus-canvas')) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'plexus-canvas';
    panel.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = {
      w: 0,
      h: 0,
      nodes: [],
      pointer: { x: -9999, y: -9999, active: false },
      burstCooldown: 0,
      attractPause: 0
    };

    function resize() {
      const rect = panel.getBoundingClientRect();
      state.w = Math.max(1, Math.floor(rect.width));
      state.h = Math.max(1, Math.floor(rect.height));
      canvas.width = state.w;
      canvas.height = state.h;

      if (state.nodes.length === 0) {
        for (let i = 0; i < NODE_COUNT; i++) {
          state.nodes.push({
            x: Math.random() * state.w,
            y: Math.random() * state.h,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35
          });
        }
      }
    }

    function moveNodes() {
      let nearCursorCount = 0;
      const nearNodes = [];

      for (const n of state.nodes) {
        if (state.pointer.active) {
          const dx = state.pointer.x - n.x;
          const dy = state.pointer.y - n.y;
          const d2 = dx * dx + dy * dy;
          if (state.attractPause === 0 && d2 < CURSOR_RADIUS * CURSOR_RADIUS) {
            const d = Math.max(1, Math.sqrt(d2));
            const force = (1 - d / CURSOR_RADIUS) * PULL_FORCE;
            n.vx += (dx / d) * force;
            n.vy += (dy / d) * force;
          }
          if (d2 < BURST_RADIUS * BURST_RADIUS) {
            nearCursorCount++;
            nearNodes.push(n);
          }
        }

        n.vx *= 0.992;
        n.vy *= 0.992;
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0 || n.x > state.w) n.vx *= -1;
        if (n.y < 0 || n.y > state.h) n.vy *= -1;
        n.x = Math.max(0, Math.min(state.w, n.x));
        n.y = Math.max(0, Math.min(state.h, n.y));
      }

      if (state.burstCooldown > 0) {
        state.burstCooldown--;
      }
      if (state.attractPause > 0) {
        state.attractPause--;
      }

      // If many particles gather near cursor, explode them away directionally.
      if (state.pointer.active && nearCursorCount >= BURST_CLUSTER_THRESHOLD && state.burstCooldown === 0) {
        for (const n of nearNodes) {
          const dx = n.x - state.pointer.x;
          const dy = n.y - state.pointer.y;
          const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const burst = (1 - Math.min(1, d / BURST_RADIUS)) * BURST_POWER + 0.45;
          n.vx += (dx / d) * burst;
          n.vy += (dy / d) * burst;
        }
        state.burstCooldown = BURST_COOLDOWN_FRAMES;
        state.attractPause = ATTRACT_RESUME_FRAMES;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, state.w, state.h);

      for (let i = 0; i < state.nodes.length; i++) {
        const a = state.nodes[i];

        // Points
        ctx.fillStyle = 'rgba(220, 224, 230, 0.38)';
        ctx.beginPath();
        ctx.arc(a.x, a.y, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Connections
        for (let j = i + 1; j < state.nodes.length; j++) {
          const b = state.nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d <= MAX_DIST) {
            const alpha = (1 - d / MAX_DIST) * 0.2;
            ctx.strokeStyle = 'rgba(205, 211, 220,' + alpha.toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    }

    function frame() {
      moveNodes();
      draw();
      requestAnimationFrame(frame);
    }

    function pointerFromEvent(e) {
      const rect = canvas.getBoundingClientRect();
      state.pointer.x = e.clientX - rect.left;
      state.pointer.y = e.clientY - rect.top;
      state.pointer.active = true;
    }

    panel.addEventListener('mousemove', pointerFromEvent);
    panel.addEventListener('mouseenter', pointerFromEvent);
    panel.addEventListener('mouseleave', function () {
      state.pointer.active = false;
    });

    // Touch support
    panel.addEventListener('touchstart', function (e) {
      if (!e.touches || !e.touches[0]) return;
      pointerFromEvent(e.touches[0]);
    }, { passive: true });
    panel.addEventListener('touchmove', function (e) {
      if (!e.touches || !e.touches[0]) return;
      pointerFromEvent(e.touches[0]);
    }, { passive: true });
    panel.addEventListener('touchend', function () {
      state.pointer.active = false;
    });

    window.addEventListener('resize', resize);
    resize();
    frame();
  }

  initPlexus(document.querySelector('.main__left'));
  initPlexus(document.querySelector('.menu'));
})();
