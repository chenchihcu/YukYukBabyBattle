/* =========================================================
   Particles.js - 超級任天堂 & 下一世代 (2.5D) 粒子、氣候與爆破特效
   ========================================================= */

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.weatherParticles = [];
    this.weatherMode = 'none'; // 'none', 'rain', 'snow', 'night'
    this.thunderTimer = 0;
    this.thunderFlash = 0;
  }

  setWeather(mode) {
    this.weatherMode = mode;
    this.weatherParticles = [];
  }

  // 1. SNES / 2.5D 三階爆破火球（黃-橘-紅火球擴散與黑煙）
  createExplosion(x, y, color = '#ff9800', count = 20) {
    this.particles.push({
      x,
      y,
      radius: 6,
      maxRadius: 28,
      color: '#ffff00',
      innerColor: '#ffffff',
      outerColor: '#ff3d00',
      alpha: 1,
      isFireball: true,
      decay: 0.05,
    });

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      const isDebris = Math.random() < 0.4;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: isDebris ? 2 + Math.random() * 3 : 1.5 + Math.random() * 2,
        color: isDebris ? '#d84315' : color,
        alpha: 1,
        isDebris,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        decay: 0.03 + Math.random() * 0.03,
      });
    }

    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        radius: 4 + Math.random() * 6,
        color: '#263238',
        alpha: 0.8,
        isSmoke: true,
        decay: 0.02,
      });
    }
  }

  // 2. 雷射 / 電磁軌跡衝擊波
  createShockwave(x, y, color = '#00e5ff') {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 4,
      maxRadius: 36,
      color,
      alpha: 1,
      isShockwave: true,
      decay: 0.05,
    });
  }

  // 3. 金屬撞擊火花
  createSparks(x, y, color = '#ffe082', count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1 + Math.random() * 2,
        color,
        alpha: 1,
        isSpark: true,
        decay: 0.08,
      });
    }
  }

  update() {
    // 特效粒子更新
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (p.isFireball) {
        p.radius += (p.maxRadius - p.radius) * 0.18;
        p.alpha -= p.decay;
      } else if (p.isShockwave) {
        p.radius += (p.maxRadius - p.radius) * 0.22;
        p.alpha -= p.decay;
      } else if (p.isSmoke) {
        p.x += p.vx;
        p.y += p.vy;
        p.radius += 0.3;
        p.alpha -= p.decay;
      } else if (p.isDebris) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotSpeed;
        p.alpha -= p.decay;
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
      }

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 動態氣候與閃電邏輯
    if (this.thunderFlash > 0) this.thunderFlash--;

    if (this.weatherMode === 'rain') {
      if (Math.random() < 0.008) this.thunderFlash = 6; // 隨機雷鳴閃電

      if (this.weatherParticles.length < 120) {
        this.weatherParticles.push({
          x: Math.random() * 624,
          y: -10,
          vx: -1.5,
          vy: 12 + Math.random() * 4,
          length: 12 + Math.random() * 8,
        });
      }
    } else if (this.weatherMode === 'snow') {
      if (this.weatherParticles.length < 80) {
        this.weatherParticles.push({
          x: Math.random() * 624,
          y: -10,
          vx: (Math.random() - 0.5) * 1.2,
          vy: 1 + Math.random() * 1.5,
          radius: 1.5 + Math.random() * 2,
        });
      }
    }

    for (let i = this.weatherParticles.length - 1; i >= 0; i--) {
      const wp = this.weatherParticles[i];
      wp.x += wp.vx;
      wp.y += wp.vy;
      if (wp.y > 624 || wp.x < -20 || wp.x > 644) {
        this.weatherParticles.splice(i, 1);
      }
    }
  }

  render(ctx) {
    ctx.save();
    this.particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.isFireball) {
        ctx.fillStyle = p.outerColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.65, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = p.innerColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.isShockwave) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.isDebris) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.radius / 2, -p.radius / 2, p.radius, p.radius);
        ctx.restore();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();

    // 氣候渲染 (暴雨 / 積雪 / 閃電)
    if (this.weatherMode === 'rain') {
      ctx.save();
      ctx.strokeStyle = 'rgba(128, 222, 234, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      this.weatherParticles.forEach((wp) => {
        ctx.moveTo(wp.x, wp.y);
        ctx.lineTo(wp.x + wp.vx, wp.y + wp.length);
      });
      ctx.stroke();
      ctx.restore();
    } else if (this.weatherMode === 'snow') {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      this.weatherParticles.forEach((wp) => {
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, wp.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // 閃電高光全屏效果
    if (this.thunderFlash > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${this.thunderFlash / 8})`;
      ctx.fillRect(0, 0, 624, 624);
      ctx.restore();
    }
  }
}
