/* A lightweight illustrative signal sequence. No measured traffic data or external services. */
(() => {
  'use strict';

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ROAD_HALF = 34;
  const LANE_OFFSET = 17;
  const STOP_LINE = 54;
  const FRAME_INTERVAL = 1000 / 30;
  const phases = [
    { axis: 0, lamp: 'green', duration: 10 },
    { axis: 0, lamp: 'amber', duration: 1.8 },
    { axis: -1, lamp: 'red', duration: 3.6 },
    { axis: 1, lamp: 'green', duration: 10 },
    { axis: 1, lamp: 'amber', duration: 1.8 },
    { axis: -1, lamp: 'red', duration: 3.6 }
  ];
  const colors = ['#6caeff', '#94cafa', '#b9d6e9', '#4d8ad0', '#e0e9f0'];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  class TrafficScene {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      if (!this.ctx) return;
      this.background = canvas.dataset.traffic === 'background';
      this.wrapper = canvas.closest('[data-traffic-scene]') || canvas.parentElement;
      this.status = this.wrapper.querySelector('[data-traffic-status]');
      this.pauseButton = this.wrapper.querySelector('[data-traffic-pause]');
      this.demandInput = this.wrapper.querySelector('[data-traffic-demand]');
      this.speedInput = this.wrapper.querySelector('[data-traffic-speed]');
      this.demand = this.demandInput ? clamp(Number(this.demandInput.value) || 2, 1, 3) : 1.5;
      this.speed = this.speedInput ? clamp(Number(this.speedInput.value) || 1, 0.5, 2) : 0.8;
      this.staticCanvas = document.createElement('canvas');
      this.staticCtx = this.staticCanvas.getContext('2d');
      this.phase = 0;
      this.phaseTime = 0;
      this.localPaused = false;
      this.inView = !('IntersectionObserver' in window);
      this.frame = 0;
      this.lastFrame = 0;
      this.lastStep = 0;
      this.lanes = [
        { dx: 1, dy: 0, axis: 0, cars: [], spawnIn: 0.5 },
        { dx: -1, dy: 0, axis: 0, cars: [], spawnIn: 1.4 },
        { dx: 0, dy: 1, axis: 1, cars: [], spawnIn: 2.3 },
        { dx: 0, dy: -1, axis: 1, cars: [], spawnIn: 3.1 }
      ];
      this.tick = this.tick.bind(this);
      this.resize = this.resize.bind(this);
      this.refresh = this.refresh.bind(this);
      this.resize();
      this.bindControls();

      if ('IntersectionObserver' in window) {
        this.intersectionObserver = new IntersectionObserver(entries => {
          this.inView = entries[0].isIntersecting;
          this.refresh();
        }, { threshold: 0 });
        this.intersectionObserver.observe(canvas);
      }
      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(this.resize);
        this.resizeObserver.observe(canvas);
      } else {
        window.addEventListener('resize', this.resize, { passive: true });
      }
      document.addEventListener('visibilitychange', this.refresh);
      document.addEventListener('portfolio:motion', this.refresh);
      document.addEventListener('portfolio:view', this.resize);
      motionPreference.addEventListener('change', this.refresh);
      this.refresh();
    }

    globallyPaused() {
      return motionPreference.matches || document.documentElement.classList.contains('motion-paused');
    }

    canRun() {
      return this.inView && !document.hidden && !this.localPaused && !this.globallyPaused()
        && this.width > 0 && this.height > 0 && this.canvas.getClientRects().length > 0
        && !this.canvas.closest('[hidden]');
    }

    bindControls() {
      this.pauseButton?.addEventListener('click', () => {
        this.localPaused = !this.localPaused;
        this.refresh();
      });
      this.demandInput?.addEventListener('input', () => {
        this.demand = clamp(Number(this.demandInput.value) || 2, 1, 3);
        const label = ['Light', 'Moderate', 'Busy'][this.demand - 1];
        this.demandInput.setAttribute('aria-valuetext', label);
        const output = this.wrapper.querySelector('[data-traffic-demand-value]');
        if (output) output.textContent = label;
        this.updateStatus();
      });
      this.speedInput?.addEventListener('input', () => {
        this.speed = clamp(Number(this.speedInput.value) || 1, 0.5, 2);
        this.speedInput.setAttribute('aria-valuetext', `${this.speed} times speed`);
        const output = this.wrapper.querySelector('[data-traffic-speed-value]');
        if (output) output.textContent = `${this.speed}×`;
      });
    }

    refresh() {
      if (this.canRun()) {
        if (!this.frame) {
          this.lastFrame = 0;
          this.lastStep = 0;
          this.frame = requestAnimationFrame(this.tick);
        }
      } else if (this.frame) {
        cancelAnimationFrame(this.frame);
        this.frame = 0;
        this.lastFrame = 0;
        this.lastStep = 0;
      }
      this.updateStatus();
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) {
        this.width = 0;
        this.height = 0;
        this.refresh();
        return;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      if (this.width === rect.width && this.height === rect.height && this.dpr === dpr) {
        this.refresh();
        return;
      }
      this.width = rect.width;
      this.height = rect.height;
      this.dpr = dpr;
      this.scale = Math.min(1.1, Math.max(0.62, Math.min(this.width / 840, this.height / 440)));
      this.worldWidth = this.width / this.scale;
      this.worldHeight = this.height / this.scale;
      this.cx = this.worldWidth * (this.background ? 0.65 : 0.5);
      this.cy = this.worldHeight * 0.5;
      this.canvas.width = Math.round(this.width * dpr);
      this.canvas.height = Math.round(this.height * dpr);
      this.staticCanvas.width = this.canvas.width;
      this.staticCanvas.height = this.canvas.height;
      this.lanes.forEach(lane => {
        lane.entry = lane.dx === 1 ? this.cx : lane.dx === -1 ? this.worldWidth - this.cx
          : lane.dy === 1 ? this.cy : this.worldHeight - this.cy;
        lane.exit = lane.dx === 1 ? this.worldWidth - this.cx : lane.dx === -1 ? this.cx
          : lane.dy === 1 ? this.worldHeight - this.cy : this.cy;
      });
      if (!this.seeded) {
        this.seeded = true;
        this.lanes.forEach((lane, laneIndex) => {
          for (let s = -75 - laneIndex * 8; s > -lane.entry + 10; s -= 82) {
            lane.cars.push(this.makeCar(s, lane.axis === 0 ? 34 : 0));
          }
          for (let s = 100 + laneIndex * 12; s < lane.exit; s += 155) {
            lane.cars.push(this.makeCar(s, 40));
          }
          lane.cars.sort((a, b) => b.s - a.s);
        });
      }
      this.drawRoad();
      this.draw();
      this.refresh();
    }

    makeCar(s, velocity = 40) {
      return {
        s, velocity,
        cruise: 40 + Math.random() * 7,
        length: Math.random() > 0.9 ? 22 : 14,
        color: colors[Math.floor(Math.random() * colors.length)]
      };
    }

    advance(dt) {
      this.phaseTime += dt;
      const phase = phases[this.phase];
      if (this.phaseTime >= phase.duration) {
        // Keep the clearance phase until every vehicle has left the conflict area.
        const occupied = phase.axis === -1 && this.lanes.some(lane => lane.cars.some(car =>
          car.s + car.length / 2 > -STOP_LINE + 1 && car.s - car.length / 2 < STOP_LINE));
        if (!occupied) {
          this.phase = (this.phase + 1) % phases.length;
          this.phaseTime = 0;
          this.updateStatus();
        }
      }
      const current = phases[this.phase];
      this.lanes.forEach(lane => {
        const green = current.axis === lane.axis && current.lamp === 'green';
        let leader = null;
        lane.cars.forEach(car => {
          const stop = -STOP_LINE - car.length / 2;
          let remaining = Infinity;
          if (!green && car.s <= stop + 0.01) remaining = Math.max(0, stop - car.s);
          if (leader) remaining = Math.min(remaining,
            Math.max(0, leader.s - car.s - (leader.length + car.length) / 2 - 7));
          const target = Math.min(car.cruise, Math.sqrt(2 * 36 * remaining), remaining / 0.65);
          const acceleration = target < car.velocity ? 58 : 28;
          car.velocity += clamp(target - car.velocity, -acceleration * dt, acceleration * dt);
          const movement = Math.min(car.velocity * dt, remaining);
          car.s += Math.max(0, movement);
          if (remaining < 0.05) car.velocity = 0;
          leader = car;
        });
        lane.cars = lane.cars.filter(car => car.s - car.length / 2 < lane.exit + 30);
        lane.spawnIn -= dt;
        if (lane.spawnIn <= 0 && lane.cars.length < 24) {
          const entryPosition = -lane.entry - 30;
          const tail = lane.cars[lane.cars.length - 1];
          if (!tail || tail.s - entryPosition > 44) {
            lane.cars.push(this.makeCar(entryPosition));
            lane.spawnIn = (4.7 / this.demand) * (0.8 + Math.random() * 0.4);
          }
        }
      });
    }

    drawRoad() {
      const ctx = this.staticCtx;
      const { cx, cy, worldWidth: w, worldHeight: h } = this;
      ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = this.background ? 'rgba(52, 85, 125, .12)' : 'rgba(46, 76, 111, .27)';
      ctx.beginPath();
      ctx.rect(0, cy - ROAD_HALF, w, ROAD_HALF * 2);
      ctx.rect(cx - ROAD_HALF, 0, ROAD_HALF * 2, h);
      ctx.fill();

      const line = (x1, y1, x2, y2) => {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      };
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(156, 183, 212, .23)';
      [-1, 1].forEach(side => {
        line(0, cy + side * ROAD_HALF, cx - ROAD_HALF, cy + side * ROAD_HALF);
        line(cx + ROAD_HALF, cy + side * ROAD_HALF, w, cy + side * ROAD_HALF);
        line(cx + side * ROAD_HALF, 0, cx + side * ROAD_HALF, cy - ROAD_HALF);
        line(cx + side * ROAD_HALF, cy + ROAD_HALF, cx + side * ROAD_HALF, h);
      });
      ctx.strokeStyle = 'rgba(165, 183, 184, .25)';
      [-1.5, 1.5].forEach(offset => {
        line(0, cy + offset, cx - STOP_LINE - 9, cy + offset);
        line(cx + STOP_LINE + 9, cy + offset, w, cy + offset);
        line(cx + offset, 0, cx + offset, cy - STOP_LINE - 9);
        line(cx + offset, cy + STOP_LINE + 9, cx + offset, h);
      });

      // Crosswalk stripes sit between the stop lines and the intersection.
      ctx.fillStyle = 'rgba(180, 201, 221, .18)';
      [-1, 1].forEach(side => {
        for (let across = -27; across < 30; across += 7) {
          ctx.fillRect(cx + side * 44 - 3, cy + across, 6, 3);
          ctx.fillRect(cx + across, cy + side * 44 - 3, 3, 6);
        }
      });
      ctx.strokeStyle = 'rgba(206, 222, 238, .46)';
      ctx.lineWidth = 2;
      line(cx - STOP_LINE, cy + 5, cx - STOP_LINE, cy + 30);
      line(cx + STOP_LINE, cy - 30, cx + STOP_LINE, cy - 5);
      line(cx + 5, cy + STOP_LINE, cx + 30, cy + STOP_LINE);
      line(cx - 30, cy - STOP_LINE, cx - 5, cy - STOP_LINE);

      // Small approach arrows use the same engineering-plan treatment as the markings.
      ctx.strokeStyle = 'rgba(158, 188, 219, .28)';
      ctx.lineWidth = 1.3;
      this.lanes.forEach(lane => {
        ctx.save();
        ctx.translate(cx + lane.dx * -103 - lane.dy * LANE_OFFSET,
          cy + lane.dy * -103 + lane.dx * LANE_OFFSET);
        ctx.rotate(Math.atan2(lane.dy, lane.dx));
        line(-7, 0, 7, 0);
        line(2, -4, 7, 0);
        line(2, 4, 7, 0);
        ctx.restore();
      });
    }

    drawSignal(lane) {
      const ctx = this.ctx;
      const current = phases[this.phase];
      const lamp = current.axis === lane.axis ? current.lamp : 'red';
      ctx.save();
      ctx.translate(this.cx - lane.dx * 59 - lane.dy * 44,
        this.cy - lane.dy * 59 + lane.dx * 44);
      ctx.rotate(Math.atan2(lane.dy, lane.dx));
      ctx.fillStyle = 'rgba(5, 16, 31, .85)';
      ctx.fillRect(-6, -4, 21, 8);
      ['red', 'amber', 'green'].forEach((name, index) => {
        ctx.beginPath();
        ctx.arc(index * 6 - 1.5, 0, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = name !== lamp ? 'rgba(156, 183, 212, .14)'
          : name === 'green' ? '#5bc8b2' : name === 'amber' ? '#e6b76a' : '#ce777c';
        ctx.fill();
      });
      ctx.restore();
    }

    draw() {
      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.drawImage(this.staticCanvas, 0, 0);
      ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, 0, 0);
      this.lanes.forEach(lane => {
        this.drawSignal(lane);
        lane.cars.forEach(car => {
          ctx.save();
          ctx.translate(this.cx + lane.dx * car.s - lane.dy * LANE_OFFSET,
            this.cy + lane.dy * car.s + lane.dx * LANE_OFFSET);
          ctx.rotate(Math.atan2(lane.dy, lane.dx));
          ctx.globalAlpha = this.background ? 0.55 : 0.95;
          ctx.fillStyle = car.color;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(-car.length / 2, -3.5, car.length, 7, 1.8);
          else ctx.rect(-car.length / 2, -3.5, car.length, 7);
          ctx.fill();
          ctx.fillStyle = 'rgba(15, 40, 67, .64)';
          ctx.fillRect(car.length / 2 - 6, -2.5, 2.4, 5);
          ctx.fillRect(-car.length / 2 + 2.5, -2.5, 1.5, 5);
          ctx.fillStyle = 'rgba(241, 249, 255, .83)';
          ctx.fillRect(car.length / 2 - 1, -2.6, 1, 1.5);
          ctx.fillRect(car.length / 2 - 1, 1.1, 1, 1.5);
          if (car.velocity < 4) {
            ctx.fillStyle = 'rgba(229, 130, 137, .9)';
            ctx.fillRect(-car.length / 2, -2.6, 1, 1.5);
            ctx.fillRect(-car.length / 2, 1.1, 1, 1.5);
          }
          ctx.restore();
        });
      });
    }

    updateStatus() {
      const globallyPaused = this.globallyPaused();
      if (this.pauseButton) {
        this.pauseButton.disabled = globallyPaused;
        this.pauseButton.setAttribute('aria-pressed', String(this.localPaused || globallyPaused));
        this.pauseButton.textContent = globallyPaused ? 'Motion paused' : this.localPaused ? 'Resume sequence' : 'Pause sequence';
      }
      if (!this.status) return;
      const current = phases[this.phase];
      const text = globallyPaused ? 'Motion paused in your preferences'
        : this.localPaused ? 'Sequence paused'
          : current.axis === -1 ? 'All-red clearance'
            : `${current.axis === 0 ? 'East–west' : 'North–south'} traffic · ${current.lamp}`;
      if (this.status.textContent !== text) this.status.textContent = text;
    }

    tick(timestamp) {
      this.frame = 0;
      if (!this.canRun()) return;
      if (!this.lastFrame) this.lastFrame = this.lastStep = timestamp;
      const elapsed = timestamp - this.lastFrame;
      if (elapsed >= FRAME_INTERVAL) {
        // Backgrounded tabs never fast-forward. Simulation and rendering are capped at 30fps.
        this.advance(Math.min((timestamp - this.lastStep) / 1000, 0.08) * this.speed);
        this.draw();
        this.lastStep = timestamp;
        this.lastFrame = timestamp - (elapsed % FRAME_INTERVAL);
      }
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  const start = () => document.querySelectorAll('canvas[data-traffic]').forEach(canvas => new TrafficScene(canvas));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
