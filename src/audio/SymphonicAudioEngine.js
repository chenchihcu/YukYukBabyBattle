/* =========================================================
   SymphonicAudioEngine.js - 50 種 Web Audio API 交響音效與背景音樂
   ========================================================= */

export class SymphonicAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;

    this.bgmVolume = 0.6;
    this.sfxVolume = 0.8;
    this.isBgmPlaying = false;
    this.bgmInterval = null;

    // 50 種音效清單
    this.sfxList = [
      "shoot_normal", "shoot_spread", "shoot_laser", "shoot_flame", "shoot_missile",
      "shoot_freeze", "shoot_plasma", "shoot_emp", "shoot_drill", "shoot_acid",
      "shoot_lightning", "shoot_twin", "shoot_hyper", "shoot_cluster", "shoot_vortex",
      "explosion_small", "explosion_big", "explosion_base", "hit_brick", "hit_steel",
      "shield_active", "shield_block", "mine_place", "mine_explode", "time_freeze",
      "air_strike", "item_drop", "item_pickup", "level_up", "life_up",
      "base_defend", "stealth_on", "stealth_off", "repair_heal", "berserk_mode",
      "ricochet_bounce", "drone_hover", "vortex_pull", "acid_burn", "chain_spark",
      "decoy_spawn", "bullet_storm", "turret_deploy", "doomsday_beam", "menu_click",
      "stage_start_fanfare", "stage_clear_jingle", "game_over_theme", "warning_siren", "base_shield_up"
    ];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.bgmGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);

      this.bgmGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  resume() {
    this.init();
  }

  setBgmVolume(val) {
    this.bgmVolume = Math.max(0, Math.min(1, val));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
    }
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  // 播送音效並在結束時自動斷開 Node 釋放記憶體
  playSfx(type) {
    this.init();
    if (this.sfxVolume <= 0 || !this.ctx) return;

    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.connect(this.sfxGain);

    switch (type) {
      case "shoot_normal": {
        const osc = this.ctx.createOscillator();
        osc.type = "square";
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.1);
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.connect(g);
        osc.start(t);
        osc.stop(t + 0.1);
        setTimeout(() => { osc.disconnect(); g.disconnect(); }, 120);
        break;
      }
      case "shoot_spread": {
        for (let i = 0; i < 3; i++) {
          const osc = this.ctx.createOscillator();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(400 + i * 80, t);
          osc.frequency.exponentialRampToValueAtTime(100, t + 0.12);
          g.gain.setValueAtTime(0.2, t);
          g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
          osc.connect(g);
          osc.start(t);
          osc.stop(t + 0.12);
          setTimeout(() => { osc.disconnect(); }, 150);
        }
        setTimeout(() => { g.disconnect(); }, 150);
        break;
      }
      case "shoot_laser": {
        const osc = this.ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.25);
        g.gain.setValueAtTime(0.4, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        osc.connect(g);
        osc.start(t);
        osc.stop(t + 0.25);
        setTimeout(() => { osc.disconnect(); g.disconnect(); }, 300);
        break;
      }
      case "explosion_small":
      case "explosion_big":
      case "explosion_base": {
        const dur = type === "explosion_base" ? 0.8 : (type === "explosion_big" ? 0.5 : 0.25);
        const bufferSize = this.ctx.sampleRate * dur;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(600, t);
        filter.frequency.exponentialRampToValueAtTime(40, t + dur);
        g.gain.setValueAtTime(type === "explosion_base" ? 0.8 : 0.5, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + dur);
        noise.connect(filter);
        filter.connect(g);
        noise.start(t);
        setTimeout(() => { noise.disconnect(); filter.disconnect(); g.disconnect(); }, (dur + 0.1) * 1000);
        break;
      }
      default: {
        const osc = this.ctx.createOscillator();
        osc.type = "square";
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.15);
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.connect(g);
        osc.start(t);
        osc.stop(t + 0.15);
        setTimeout(() => { osc.disconnect(); g.disconnect(); }, 200);
        break;
      }
    }
  }

  // 64-bit 次世代立體聲 Panning 與空間音效支援 (x: 畫面 X 座標, width: 畫布總寬)
  playSpatialSfx(type, x = 156, width = 312) {
    this.init();
    if (this.sfxVolume <= 0 || !this.ctx) return;

    const panValue = Math.max(-1, Math.min(1, ((x / width) - 0.5) * 2));
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();

    let panner = null;
    if (this.ctx.createStereoPanner) {
      panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(panValue, t);
      g.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      g.connect(this.sfxGain);
    }

    // 處理特殊 64-bit FM 雙振盪器合成聲響
    if (type.startsWith('shoot_') || type.startsWith('explosion_')) {
      this.playFmSynthSfx(type, t, g);
    } else {
      this.playSfx(type);
      return;
    }

    setTimeout(() => {
      if (panner) panner.disconnect();
      g.disconnect();
    }, 600);
  }

  // 64-bit FM (Frequency Modulation) 雙振盪器音色合成器
  playFmSynthSfx(type, t, targetGain) {
    if (!this.ctx) return;
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();

    if (type.includes('explosion')) {
      carrier.type = 'sawtooth';
      modulator.type = 'square';
      carrier.frequency.setValueAtTime(110, t);
      carrier.frequency.exponentialRampToValueAtTime(30, t + 0.4);
      modulator.frequency.setValueAtTime(45, t);
      modGain.gain.setValueAtTime(180, t);
      modGain.gain.exponentialRampToValueAtTime(10, t + 0.4);
      targetGain.gain.setValueAtTime(0.6, t);
      targetGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
    } else {
      carrier.type = 'triangle';
      modulator.type = 'sine';
      carrier.frequency.setValueAtTime(520, t);
      carrier.frequency.exponentialRampToValueAtTime(120, t + 0.15);
      modulator.frequency.setValueAtTime(260, t);
      modGain.gain.setValueAtTime(300, t);
      modGain.gain.exponentialRampToValueAtTime(1, t + 0.15);
      targetGain.gain.setValueAtTime(0.35, t);
      targetGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    }

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(targetGain);

    modulator.start(t);
    carrier.start(t);
    modulator.stop(t + 0.4);
    carrier.stop(t + 0.4);

    setTimeout(() => {
      modulator.disconnect();
      modGain.disconnect();
      carrier.disconnect();
    }, 450);
  }

  // 64-bit Console 開機水晶和弦音效 (Boot Chime)
  play64BitBootChime() {
    this.init();
    if (this.sfxVolume <= 0 || !this.ctx) return;
    const t = this.ctx.currentTime;
    const frequencies = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C E G C E G
    frequencies.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);
      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(0.2, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.8);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.85);
      setTimeout(() => { osc.disconnect(); gain.disconnect(); }, 1000);
    });
  }

  // ===== 動態交響背景音樂 =====
  startBgm() {
    this.init();
    if (this.isBgmPlaying) return;
    this.isBgmPlaying = true;

    const bassNotes = [110, 110, 146.83, 130.81, 110, 110, 164.81, 146.83];
    const leadNotes = [440, 523.25, 659.25, 587.33, 523.25, 440, 493.88, 523.25];
    let step = 0;

    this.bgmInterval = setInterval(() => {
      if (!this.isBgmPlaying || this.bgmVolume <= 0 || !this.ctx) return;
      const t = this.ctx.currentTime;

      const bassOsc = this.ctx.createOscillator();
      bassOsc.type = "triangle";
      bassOsc.frequency.setValueAtTime(bassNotes[step % bassNotes.length], t);
      const bGain = this.ctx.createGain();
      bGain.gain.setValueAtTime(0.25, t);
      bGain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
      bassOsc.connect(bGain);
      bGain.connect(this.bgmGain);
      bassOsc.start(t);
      bassOsc.stop(t + 0.18);
      setTimeout(() => { bassOsc.disconnect(); bGain.disconnect(); }, 200);

      if (step % 2 === 0) {
        const leadOsc = this.ctx.createOscillator();
        leadOsc.type = "square";
        leadOsc.frequency.setValueAtTime(leadNotes[(step / 2) % leadNotes.length], t);
        const lGain = this.ctx.createGain();
        lGain.gain.setValueAtTime(0.18, t);
        lGain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
        leadOsc.connect(lGain);
        lGain.connect(this.bgmGain);
        leadOsc.start(t);
        leadOsc.stop(t + 0.35);
        setTimeout(() => { leadOsc.disconnect(); lGain.disconnect(); }, 400);
      }

      step++;
    }, 200);
  }

  stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}
