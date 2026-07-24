/* =========================================================
   Boss.js - 下一世代 (32-bit PS1 / 2.5D) 巨型 4x4 機械 Boss 實體
   ========================================================= */

import { DIR, Bullet } from './Entities.js';
import { SNES_PALETTE } from './MapData.js';

export class BossTank {
  constructor(x, y, stageNum = 5) {
    this.x = x;
    this.y = y;
    this.width = 96; // 96x96px (佔地 4x4 大格 / 8x8 微觀格)
    this.height = 96;
    this.dir = DIR.DOWN;
    this.speed = 0.9 + (stageNum / 200) * 0.4;
    this.alive = true;

    // Boss 血量隨關卡平滑階梯式成長 (Stage 5: 31 HP, Stage 100: 65 HP, Stage 200: 100 HP)
    this.maxHp = Math.min(100, Math.floor(30 + (stageNum / 200) * 70));
    this.hp = this.maxHp;
    this.phase = 1; // 1: 標準防禦型, 2: 狂暴電磁彈幕型 (HP <= 50%)

    this.cooldown = 0;
    this.maxCooldown = 30;
    this.turretAngle1 = 0;
    this.turretAngle2 = 0;

    this.hasShield = true;
    this.shieldTimer = 150;
    this.isFrozen = false;
    this.freezeTimer = 0;
    this.isParalyzed = false;

    this.treadAnimFrame = 0;
    this.flashTimer = 0;
  }

  update(player1, player2, bulletsArray, particleSystem) {
    if (!this.alive) return;
    this.flashTimer++;

    if (this.cooldown > 0) this.cooldown--;
    if (this.shieldTimer > 0) {
      this.shieldTimer--;
      if (this.shieldTimer <= 0) this.hasShield = false;
    }
    if (this.freezeTimer > 0) {
      this.freezeTimer--;
      if (this.freezeTimer <= 0) this.isFrozen = false;
    }

    // 檢查階段轉換 (HP <= 50% 進入 Phase 2 狂暴狀態)
    if (this.phase === 1 && this.hp <= this.maxHp / 2) {
      this.phase = 2;
      this.speed = 1.3;
      this.hasShield = true;
      this.shieldTimer = 180;
      if (particleSystem) {
        particleSystem.createExplosion(this.x + 48, this.y + 48, '#ff3d00', 30);
        particleSystem.createShockwave(this.x + 48, this.y + 48, '#d500f9');
      }
    }

    if (this.isFrozen) return;

    this.treadAnimFrame = (this.treadAnimFrame + 1) % 8;

    // 尋找最近的玩家目標
    let target = null;
    if (player1 && player1.alive) target = player1;
    if (
      player2 &&
      player2.alive &&
      (!target ||
        Math.hypot(player2.x - this.x, player2.y - this.y) <
          Math.hypot(player1.x - this.x, player1.y - this.y))
    ) {
      target = player2;
    }

    if (target) {
      const dx = target.x + 12 - (this.x + 48);
      const dy = target.y + 12 - (this.y + 48);
      const angle = Math.atan2(dy, dx);
      this.turretAngle1 = angle;
      this.turretAngle2 = angle + (this.phase === 2 ? 0.4 : 0);
    }

    // 雙砲塔開火邏輯
    if (this.cooldown <= 0) {
      this.cooldown = this.phase === 2 ? 20 : 35;
      const bx = this.x + 48;
      const by = this.y + 48;

      if (this.phase === 1) {
        // Phase 1: 三向彈幕
        [-0.2, 0, 0.2].forEach((offset) => {
          bulletsArray.push(
            new Bullet(
              bx,
              by,
              DIR.DOWN,
              false,
              'fast',
              this.turretAngle1 + offset,
              0
            )
          );
        });
      } else {
        // Phase 2: 環形 6 向狂暴星形彈幕
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
          bulletsArray.push(
            new Bullet(
              bx,
              by,
              DIR.DOWN,
              false,
              'laser',
              a + this.flashTimer * 0.1,
              0
            )
          );
        }
      }
    }
  }

  render(ctx) {
    if (!this.alive) return;

    ctx.save();
    ctx.translate(this.x + 48, this.y + 48);

    // 1. 履帶底盤陰影與雙側大車輪
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(-46, -42, 92, 92);

    // 雙側重型履帶
    const treadDark = '#0d1117';
    const treadLight = this.phase === 2 ? '#d500f9' : '#37474f';
    const treadShift = Math.floor(this.treadAnimFrame / 2);

    ctx.fillStyle = treadDark;
    ctx.fillRect(-48, -46, 16, 92);
    ctx.fillRect(32, -46, 16, 92);

    ctx.fillStyle = treadLight;
    for (let i = -46 + (treadShift % 6); i < 46; i += 6) {
      ctx.fillRect(-48, i, 16, 3);
      ctx.fillRect(32, i, 16, 3);
    }

    // 2. 32-bit 主體黑金/紫金裝甲車身
    const mainColor = this.phase === 2 ? '#4a148c' : '#1c2536';
    const lightColor = this.phase === 2 ? '#d500f9' : '#455a64';
    const darkColor = '#0a0c10';

    ctx.fillStyle = darkColor;
    ctx.fillRect(-32, -38, 64, 76);

    ctx.fillStyle = mainColor;
    ctx.fillRect(-30, -36, 60, 72);

    ctx.fillStyle = lightColor;
    ctx.fillRect(-30, -36, 60, 4); // 頂部亮邊
    ctx.fillRect(-30, -36, 4, 72); // 左側亮邊

    // 前端警示斜線條 (Hazard Stripes)
    ctx.fillStyle = '#ffb300';
    for (let x = -26; x < 26; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, 28);
      ctx.lineTo(x + 5, 36);
      ctx.lineTo(x + 2, 36);
      ctx.lineTo(x - 3, 28);
      ctx.fill();
    }

    // 3. 雙獨立旋轉砲塔
    [
      { x: -16, y: -10, a: this.turretAngle1 },
      { x: 16, y: -10, a: this.turretAngle2 },
    ].forEach((t, idx) => {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.a + Math.PI / 2);

      // 巨型雙管砲管
      ctx.fillStyle = '#0a0c10';
      ctx.fillRect(-4, -28, 3, 22);
      ctx.fillRect(1, -28, 3, 22);

      ctx.fillStyle = this.phase === 2 ? '#ff1744' : '#00e5ff';
      ctx.fillRect(-3, -27, 2, 20);
      ctx.fillRect(2, -27, 2, 20);

      // 砲塔圓型護甲
      ctx.fillStyle = lightColor;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.phase === 2 ? '#ff1744' : '#00e5ff';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // 4. 核心發光反應爐 (Reactor Core)
    const isPulsing = Math.floor(this.flashTimer / 6) % 2 === 0;
    ctx.fillStyle =
      this.phase === 2
        ? isPulsing
          ? '#ff1744'
          : '#d500f9'
        : isPulsing
          ? '#00e5ff'
          : '#0091ea';
    ctx.beginPath();
    ctx.arc(0, 16, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 16, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 5. Boss 護盾與狂暴發光
    if (this.hasShield) {
      ctx.save();
      ctx.strokeStyle = this.phase === 2 ? '#d500f9' : '#00e5ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = this.phase === 2 ? '#d500f9' : '#00e5ff';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(this.x + 48, this.y + 48, 54, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
