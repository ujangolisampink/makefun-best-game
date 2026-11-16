// EMBERFALL KEEP — audio.js
// Every sound is synthesized live with WebAudio: no audio files, no
// network. Short blips for shots, coins and leaks, a horn for each wave,
// a victory arpeggio, and a low wind pad that hums while the game runs.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let pad = null;

  function ensure() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
      } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo, delay = 0) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function startPad() {
    if (muted || pad || !ensure()) return;
    const ac = ctx;
    const gain = ac.createGain();
    gain.gain.value = 0.035;
    gain.connect(ac.destination);
    const oscs = [55, 82.4, 110].map((f, i) => {
      const o = ac.createOscillator();
      o.type = i === 2 ? 'sine' : 'triangle';
      o.frequency.value = f;
      o.detune.value = i * 4 - 4;
      o.connect(gain);
      o.start();
      return o;
    });
    pad = { gain, oscs };
  }

  function stopPad() {
    if (!pad) return;
    try { pad.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4); } catch (e) {}
    const p = pad;
    pad = null;
    setTimeout(() => { try { p.oscs.forEach((o) => o.stop()); } catch (e) {} }, 500);
  }

  return {
    unlock() { ensure(); startPad(); },
    toggleMute() {
      muted = !muted;
      if (muted) stopPad(); else startPad();
      return muted;
    },
    isMuted() { return muted; },
    shoot(kind) {
      if (kind === 'ember') tone(720, 0.09, 'square', 0.05, 320);
      else if (kind === 'frost') tone(980, 0.14, 'sine', 0.05, 1400);
      else if (kind === 'spark') tone(1500, 0.07, 'sawtooth', 0.045, 500);
      else tone(220, 0.16, 'triangle', 0.07, 90);
    },
    hit() { tone(340, 0.05, 'square', 0.025, 200); },
    coin() { tone(880, 0.08, 'sine', 0.05); tone(1320, 0.12, 'sine', 0.04, null, 0.06); },
    build() { tone(392, 0.1, 'triangle', 0.07); tone(523, 0.14, 'triangle', 0.07, null, 0.08); },
    upgrade() { tone(523, 0.09, 'triangle', 0.06); tone(659, 0.09, 'triangle', 0.06, null, 0.07); tone(784, 0.16, 'triangle', 0.06, null, 0.14); },
    leak() { tone(180, 0.35, 'sawtooth', 0.09, 70); },
    slam() { tone(90, 0.5, 'sawtooth', 0.11, 40); tone(60, 0.5, 'square', 0.06, 30, 0.05); },
    horn() { tone(196, 0.4, 'sawtooth', 0.07, 262); tone(262, 0.4, 'sawtooth', 0.05, 392, 0.05); },
    boon() { tone(523, 0.12, 'sine', 0.06); tone(784, 0.18, 'sine', 0.06, null, 0.09); },
    victory() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, 'triangle', 0.07, null, i * 0.13)); },
    defeat() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.4, 'sawtooth', 0.06, null, i * 0.16)); },
  };
}
