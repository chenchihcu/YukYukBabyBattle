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
      case "explosion_tank": {
        const dur = 0.35;
        const bufferSize = this.ctx.sampleRate * dur;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(500, t);
        filter.frequency.exponentialRampToValueAtTime(50, t + dur);
        g.gain.setValueAtTime(0.45, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + dur);
        noise.connect(filter);
        filter.connect(g);
        noise.start(t);
        setTimeout(() => { noise.disconnect(); filter.disconnect(); g.disconnect(); }, (dur + 0.1) * 1000);
        break;
      }
      case "hit_brick": {
        const osc = this.ctx.createOscillator();
        osc.type = "square";
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.07);
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.07);
        osc.connect(g);
        osc.start(t);
        osc.stop(t + 0.07);
        setTimeout(() => { osc.disconnect(); g.disconnect(); }, 100);
        break;
      }
      case "hit_steel": {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        osc1.type = "triangle";
        osc2.type = "square";
        osc1.frequency.setValueAtTime(900, t);
        osc2.frequency.setValueAtTime(1350, t);
        osc1.frequency.exponentialRampToValueAtTime(400, t + 0.09);
        osc2.frequency.exponentialRampToValueAtTime(600, t + 0.09);
        g.gain.setValueAtTime(0.22, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
        osc1.connect(g);
        osc2.connect(g);
        osc1.start(t); osc2.start(t);
        osc1.stop(t + 0.09); osc2.stop(t + 0.09);
        setTimeout(() => { osc1.disconnect(); osc2.disconnect(); g.disconnect(); }, 120);
        break;
      }
      case "shield_active": {
        const osc = this.ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(900, t + 0.2);
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc.connect(g);
        osc.start(t);
        osc.stop(t + 0.2);
        setTimeout(() => { osc.disconnect(); g.disconnect(); }, 250);
        break;
      }
      case "time_freeze": {
        const osc = this.ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(900, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.6);
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
        osc.connect(g);
        osc.start(t);
        osc.stop(t + 0.6);
        setTimeout(() => { osc.disconnect(); g.disconnect(); }, 650);
        break;
      }
      case "menu_click": {
        const osc = this.ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, t);
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        osc.connect(g);
        osc.start(t);
        osc.stop(t + 0.05);
        setTimeout(() => { osc.disconnect(); g.disconnect(); }, 80);
        break;
      }
      case "menu_start": {
        [440, 660, 880].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const og = this.ctx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(freq, t + i * 0.06);
          og.gain.setValueAtTime(0.2, t + i * 0.06);
          og.gain.exponentialRampToValueAtTime(0.01, t + i * 0.06 + 0.1);
          osc.connect(og);
          og.connect(this.sfxGain);
          osc.start(t + i * 0.06);
          osc.stop(t + i * 0.06 + 0.1);
          setTimeout(() => { osc.disconnect(); og.disconnect(); }, (i * 60) + 150);
        });
        g.disconnect();
        break;
      }
      case "stage_start_fanfare": {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const og = this.ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, t + i * 0.09);
          og.gain.setValueAtTime(0.25, t + i * 0.09);
          og.gain.exponentialRampToValueAtTime(0.01, t + i * 0.09 + 0.22);
          osc.connect(og);
          og.connect(this.sfxGain);
          osc.start(t + i * 0.09);
          osc.stop(t + i * 0.09 + 0.22);
          setTimeout(() => { osc.disconnect(); og.disconnect(); }, (i * 90) + 300);
        });
        g.disconnect();
        break;
      }
      case "stage_clear": {
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const og = this.ctx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(freq, t + i * 0.1);
          og.gain.setValueAtTime(0.22, t + i * 0.1);
          og.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.25);
          osc.connect(og);
          og.connect(this.sfxGain);
          osc.start(t + i * 0.1);
          osc.stop(t + i * 0.1 + 0.25);
          setTimeout(() => { osc.disconnect(); og.disconnect(); }, (i * 100) + 350);
        });
        g.disconnect();
        break;
      }
      case "game_over": {
        [392, 349.23, 293.66, 220].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const og = this.ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, t + i * 0.18);
          og.gain.setValueAtTime(0.22, t + i * 0.18);
          og.gain.exponentialRampToValueAtTime(0.01, t + i * 0.18 + 0.3);
          osc.connect(og);
          og.connect(this.sfxGain);
          osc.start(t + i * 0.18);
          osc.stop(t + i * 0.18 + 0.3);
          setTimeout(() => { osc.disconnect(); og.disconnect(); }, (i * 180) + 450);
        });
        g.disconnect();
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
