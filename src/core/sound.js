import { byId } from "./dom.js";
export function createSound() {
  const NOTE = [
    293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25,
  ]; /* re pentatónica */
  const SND = { ctx: null, on: true, master: null };

  function sndCtx() {
    if (SND.ctx) return SND.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    SND.ctx = new AC();
    SND.master = SND.ctx.createGain();
    SND.master.gain.value = SND.on ? 0.55 : 0;
    SND.master.connect(SND.ctx.destination);
    return SND.ctx;
  }
  function ping(freq, dur, vol, type, delay) {
    const c = sndCtx();
    if (!c || !SND.on) return;
    if (c.state === "suspended") c.resume();
    const t0 = c.currentTime + (delay || 0);
    const o = c.createOscillator(),
      g = c.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(SND.master);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }
  const sndHover = (i) => ping(NOTE[i % 5] * 2, 0.22, 0.028, "sine");
  const sndLand = (i) => {
    const n = NOTE[i % 5];
    ping(n, 1.1, 0.075, "sine");
    ping(n * 1.5, 1, 0.05, "sine", 0.06);
    ping(n * 2, 0.9, 0.038, "triangle", 0.13);
  };
  const sndBack = () => {
    ping(NOTE[3], 0.5, 0.045, "sine");
    ping(NOTE[1], 0.7, 0.035, "sine", 0.08);
  };
  const sndPick = (i) => {
    ping(NOTE[(i + 2) % 5] * 2, 0.7, 0.055, "triangle");
    ping(NOTE[(i + 2) % 5] * 4, 0.4, 0.02, "sine", 0.03);
  };
  const sndTick = () => ping(NOTE[5] * 2, 0.14, 0.03, "square");
  const sndProto = () => {
    [0, 1, 2, 3].forEach((i) => ping(NOTE[i] * 2, 0.5, 0.03, "sine", i * 0.09));
  };
  /* sonido de logro: arpegio mayor ascendente y dos chispas arriba */
  const sndLink = () => {
    const n = NOTE[0];
    [
      [1, 0],
      [1.25, 0.075],
      [1.5, 0.15],
      [2, 0.235],
    ].forEach((v, i) =>
      ping(n * v[0], 1.05 - i * 0.09, 0.08 - i * 0.009, "triangle", v[1]),
    );
    ping(n * 3, 0.8, 0.034, "sine", 0.31);
    ping(n * 4, 0.62, 0.022, "sine", 0.375);
    ping(n * 6, 0.5, 0.014, "sine", 0.43);
  };

  function sndToggle() {
    SND.on = !SND.on;
    const c = sndCtx();
    if (c) {
      if (c.state === "suspended") c.resume();
      SND.master.gain.setTargetAtTime(SND.on ? 0.55 : 0, c.currentTime, 0.05);
    }
    const b = byId("sndBtn");
    if (b) {
      b.setAttribute("aria-pressed", SND.on);
      b.querySelector("i").textContent = SND.on ? "●" : "○";
    }
  }
  /* el navegador no deja sonar hasta el primer gesto: sólo se abre el contexto */
  addEventListener(
    "pointerdown",
    () => {
      if (SND.on) sndCtx();
    },
    { once: true },
  );

  return {
    hover: sndHover,
    land: sndLand,
    back: sndBack,
    pick: sndPick,
    tick: sndTick,
    connect: sndProto,
    linked: sndLink,
    toggle: sndToggle,
    ping,
    notes: NOTE,
    mute() {
      SND.on = false;
    },
  };
}
