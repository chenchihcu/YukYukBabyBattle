/* =========================================================
   Entities.js - 超級任天堂 (SNES 16-bit) 坦克、子彈、寶箱與鷹徽實體
   ========================================================= */

import { SNES_PALETTE } from './MapData.js';

// 方向常量
export const DIR = {
  UP: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3
};

// ===== 16-bit 坦克基類 =====
export class Tank {
  constructor(x, y, isPlayer = false, playerNum = 1) {
    this.x = x;
    this.y = y;
    this.width = 24;
    this.height = 24;
    this.dir = DIR.UP;
    this.speed = isPlayer ? 2.2 : 1.4;
    this.isPlayer = isPlayer;
    this.playerNum = playerNum; // 1: Player 1, 2: Player 2
    this.alive = true;
    this.hp = isPlayer ? 1 : 1;
    this.maxHp = this.hp;

    // 狀態與強化 Buff
    this.hasShield = false;
    this.shieldTimer = 0;
    this.isFrozen = false;
    this.freezeTimer = 0;
    this.isParalyzed = false; // 友軍火力和麻痺電擊
    this.paralyzeTimer = 0;
    this.starLevel = 1; // 1 ~ 4 星
    this.speedBoost = false;
    this.isStealth = false;
    this.stealthTimer = 0;

    // 履帶動畫計數器
    this.treadAnimFrame = 0;
    this.isMoving = false;

    // 砲塔與 360 度瞄準
    this.turretAngle = null; // null 表示預設與底盤一致, 否則為弧度 Radian
    this.dashCooldown = 0;
    this.maxDashCooldown = 180; // 3 秒冷卻
    this.dashTimer = 0;
    this.maxDashTimer = 10;
    this.isDashing = false;

    // 開火冷卻
    this.cooldown = 0;
    this.maxCooldown = 15;
  }

  dash() {
    if (this.dashCooldown > 0 || !this.alive || this.isFrozen || this.isParalyzed) return false;
    this.dashTimer = this.maxDashTimer;
    this.dashCooldown = this.maxDashCooldown;
    this.isDashing = true;
    return true;
  }

  update() {
    if (this.cooldown > 0) this.cooldown--;
    if (this.dashCooldown > 0) this.dashCooldown--;
    if (this.dashTimer > 0) {
      this.dashTimer--;
      if (this.dashTimer <= 0) this.isDashing = false;
    }
    if (this.shieldTimer > 0) {
      this.shieldTimer--;
      if (this.shieldTimer <= 0) this.hasShield = false;
    }
    if (this.freezeTimer > 0) {
      this.freezeTimer--;
      if (this.freezeTimer <= 0) this.isFrozen = false;
    }
    if (this.paralyzeTimer > 0) {
      this.paralyzeTimer--;
      if (this.paralyzeTimer <= 0) this.isParalyzed = false;
    }
    if (this.stealthTimer > 0) {
      this.stealthTimer--;
      if (this.stealthTimer <= 0) this.isStealth = false;
    }
    if (this.isMoving && !this.isFrozen && !this.isParalyzed) {
      this.treadAnimFrame = (this.treadAnimFrame + 1) % 8;
    }
  }

  render(ctx) {
    if (!this.alive) return;
    const bodyAngle = (this.dir * 90 * Math.PI) / 180;
    const currentTurretAngle = this.turretAngle !== null ? this.turretAngle : (bodyAngle - Math.PI / 2);

    ctx.save();
    ctx.translate(this.x + 12, this.y + 12);

    // 1. 繪製 16-bit 履帶底盤 (隨車身方向旋轉)
    ctx.save();
    ctx.rotate(bodyAngle);

    // 履帶陰影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(-11, -10, 24, 24);

    // 左履帶與右履帶 (16-bit 金屬滾輪與細碎履帶齒)
    const treadColorDark = '#10141d';
    const treadColorLight = '#455a64';
    const treadShift = Math.floor(this.treadAnimFrame / 2);

    ctx.fillStyle = treadColorDark;
    ctx.fillRect(-12, -12, 5, 24);
    ctx.fillRect(7, -12, 5, 24);

    // 履帶節點動畫條紋
    ctx.fillStyle = this.isDashing ? '#00e5ff' : treadColorLight;
    for (let i = -12 + (treadShift % 4); i < 12; i += 4) {
      ctx.fillRect(-12, i, 5, 2);
      ctx.fillRect(7, i, 5, 2);
    }

    // 2. 16-bit 車身金屬裝甲 (層次與切角高光)
    let bodyColorMain, bodyColorLight, bodyColorDark;

    if (this.isPlayer) {
      if (this.playerNum === 2) {
        // Player 2 湛藍/賽博專屬配色
        if (this.isDashing) {
          bodyColorMain = '#00e5ff'; bodyColorLight = '#ffffff'; bodyColorDark = '#00838f';
        } else if (this.starLevel >= 4) {
          bodyColorMain = '#00b0ff'; bodyColorLight = '#80d8ff'; bodyColorDark = '#0056b3';
        } else if (this.starLevel === 3) {
          bodyColorMain = '#0288d1'; bodyColorLight = '#b3e5fc'; bodyColorDark = '#01579b';
        } else if (this.starLevel === 2) {
          bodyColorMain = '#29b6f6'; bodyColorLight = '#e0f7fa'; bodyColorDark = '#0277bd';
        } else {
          bodyColorMain = '#00e5ff'; bodyColorLight = '#b2ebf2'; bodyColorDark = '#0097a7'; // P1 經典藍
        }
      } else {
        // Player 1 經典翠綠/黃金配色
        if (this.isDashing) {
          bodyColorMain = '#00b0ff'; bodyColorLight = '#80d8ff'; bodyColorDark = '#0056b3';
        } else if (this.starLevel >= 4) {
          bodyColorMain = '#d500f9'; bodyColorLight = '#ff80ab'; bodyColorDark = '#aa00ff';
        } else if (this.starLevel === 3) {
          bodyColorMain = '#ffb300'; bodyColorLight = '#ffe57f'; bodyColorDark = '#ff6f00';
        } else if (this.starLevel === 2) {
          bodyColorMain = '#00c853'; bodyColorLight = '#b9f6ca'; bodyColorDark = '#007e33';
        } else {
          bodyColorMain = '#76ff03'; bodyColorLight = '#ccff90'; bodyColorDark = '#33691e';
        }
      }
    } else {
      // 敵方坦克配色
      if (this.enemyType === 'armor') {
        if (this.hp === 3) { bodyColorMain = '#9c27b0'; bodyColorLight = '#e1bee7'; bodyColorDark = '#4a148c'; }
        else if (this.hp === 2) { bodyColorMain = '#ff9800'; bodyColorLight = '#ffe0b2'; bodyColorDark = '#e65100'; }
        else { bodyColorMain = '#d50000'; bodyColorLight = '#ff8a80'; bodyColorDark = '#b71c1c'; }
      } else if (this.enemyType === 'fast') {
        bodyColorMain = '#00e5ff'; bodyColorLight = '#80deea'; bodyColorDark = '#00838f';
      } else if (this.enemyType === 'power') {
        bodyColorMain = '#ffeb3b'; bodyColorLight = '#fff9c4'; bodyColorDark = '#f57f17';
      } else {
        bodyColorMain = '#ff3d00'; bodyColorLight = '#ff9e80'; bodyColorDark = '#dd2c00';
      }
    }

    // 車身底板 shadow / border
    ctx.fillStyle = bodyColorDark;
    ctx.fillRect(-7, -9, 14, 18);

    // 車身高光與立體切角
    ctx.fillStyle = bodyColorMain;
    ctx.fillRect(-6, -8, 12, 16);
    ctx.fillStyle = bodyColorLight;
    ctx.fillRect(-6, -8, 12, 2); // 頂部亮邊
    ctx.fillRect(-6, -8, 2, 16); // 左側亮邊

    // 裝甲金屬鉚釘 (16-bit 裝飾點)
    ctx.fillStyle = bodyColorDark;
    ctx.fillRect(-5, -6, 2, 2);
    ctx.fillRect(3, -6, 2, 2);
    ctx.fillRect(-5, 4, 2, 2);
    ctx.fillRect(3, 4, 2, 2);

    ctx.restore(); // 結束底盤旋轉

    // 3. 獨立 16-bit 砲塔 (跟隨瞄準角度)
    ctx.save();
    ctx.rotate(currentTurretAngle + Math.PI / 2); // 預設砲口朝上

    // 砲管 (含金屬護套與砲口防火帽)
    ctx.fillStyle = '#1c2536';
    ctx.fillRect(-3, -15, 6, 13);
    ctx.fillStyle = this.isPlayer ? bodyColorLight : '#cfd8dc';
    ctx.fillRect(-2, -14, 4, 11);
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(-2, -15, 4, 2); // 砲口黑洞

    // 雙管砲塔 (3星/4星 玩家)
    if (this.isPlayer && this.starLevel >= 3) {
      ctx.fillStyle = bodyColorMain;
      ctx.fillRect(-5, -13, 2, 10);
      ctx.fillRect(3, -13, 2, 10);
    }

    // 砲塔圓形鑄造護罩
    ctx.fillStyle = bodyColorDark;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bodyColorMain;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bodyColorLight;
    ctx.beginPath();
    ctx.arc(-2, -2, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();

    // 4. 16-bit 護盾 (立體防護罩與旋轉發光點)
    if (this.hasShield) {
      ctx.save();
      const shieldTime = Date.now() / 150;
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(this.x + 12, this.y + 12, 17, 0, Math.PI * 2);
      ctx.stroke();

      // 旋轉高光點
      const sx = this.x + 12 + Math.cos(shieldTime) * 17;
      const sy = this.y + 12 + Math.sin(shieldTime) * 17;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. 冰凍結晶覆蓋效果
    if (this.isFrozen) {
      ctx.save();
      ctx.fillStyle = 'rgba(128, 222, 234, 0.4)';
      ctx.fillRect(this.x - 2, this.y - 2, 28, 28);
      ctx.strokeStyle = '#e0f7fa';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x - 2, this.y - 2, 28, 28);
      ctx.restore();
    }

    // 6. 友軍麻痺電擊效果
    if (this.isParalyzed) {
      ctx.save();
      ctx.strokeStyle = (Math.floor(Date.now() / 80) % 2 === 0) ? '#ffe082' : '#00e5ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x - 1, this.y - 1, 26, 26);

      // 電磁火花
      const time = Date.now() / 50;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x + 12 + Math.cos(time) * 14, this.y + 12 + Math.sin(time) * 14, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ===== 敵方坦克特化 =====
export class EnemyTank extends Tank {
  constructor(x, y, enemyType = 'basic') {
    super(x, y, false);
    this.enemyType = enemyType;
    this.dir = DIR.DOWN;

    if (enemyType === 'fast') {
      this.speed = 2.4;
      this.hp = 1;
    } else if (enemyType === 'power') {
      this.speed = 1.2;
      this.hp = 1;
    } else if (enemyType === 'armor') {
      this.speed = 1.0;
      this.hp = 3; // 重裝坦克需要 3 槍
    }
    this.maxHp = this.hp;
  }
}

// ===== 16-bit 子彈實體 =====
export class Bullet {
  constructor(x, y, dir, isPlayer = true, weaponType = 'normal', angle = null, shooterPlayerNum = 1) {
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.isPlayer = isPlayer;
    this.shooterPlayerNum = shooterPlayerNum; // 1: P1, 2: P2
    this.weaponType = weaponType;
    this.speed = weaponType === 'laser' ? 12 : (weaponType === 'fast' ? 8 : 5.5);
    this.width = weaponType === 'laser' ? 4 : 6;
    this.height = weaponType === 'laser' ? 16 : 6;
    this.alive = true;
    this.ricochetCount = weaponType === 'ricochet' ? 2 : 0;
    this.angle = angle;

    if (this.angle !== null) {
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;
    } else {
      if (this.dir === DIR.UP) { this.vx = 0; this.vy = -this.speed; this.angle = -Math.PI / 2; }
      else if (this.dir === DIR.RIGHT) { this.vx = this.speed; this.vy = 0; this.angle = 0; }
      else if (this.dir === DIR.DOWN) { this.vx = 0; this.vy = this.speed; this.angle = Math.PI / 2; }
      else if (this.dir === DIR.LEFT) { this.vx = -this.speed; this.vy = 0; this.angle = Math.PI; }
    }
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }

  render(ctx) {
    if (!this.alive) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);

    if (this.weaponType === 'laser') {
      ctx.fillStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 10;
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1, -this.height / 2 + 2, 2, this.height - 4);
    } else if (this.weaponType === 'freeze') {
      ctx.fillStyle = '#80deea';
      ctx.fillRect(-3, -3, 6, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1, -1, 2, 2);
    } else if (this.weaponType === 'flame') {
      ctx.fillStyle = '#ff6d00';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 標準彈頭 (高對比黃/紅 16-bit 金屬彈頭)
      const mainColor = this.isPlayer ? '#ffee58' : '#ff1744';
      const capColor = '#ffffff';
      ctx.fillStyle = mainColor;
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.fillStyle = capColor;
      ctx.fillRect(-1, -this.height / 2, 2, 2);
    }

    ctx.restore();
  }
}

// ===== 16-bit 掉落寶箱道具 =====
export class PowerUpItem {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.width = 24;
    this.height = 24;
    this.type = type; // star, shield, freeze, bomb, clock, base_wall, life, laser
    this.alive = true;
    this.flashTimer = 0;
  }

  render(ctx) {
    if (!this.alive) return;
    this.flashTimer++;
    ctx.save();

    // 16-bit 寶箱金屬框底座
    const isGlow = Math.floor(this.flashTimer / 8) % 2 === 0;
    const borderGold = isGlow ? '#ffe57f' : '#ffb300';
    const bgDark = '#10141d';

    ctx.fillStyle = bgDark;
    ctx.fillRect(this.x, this.y, 24, 24);

    // 立體金屬雙重邊框
    ctx.strokeStyle = borderGold;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x + 1, this.y + 1, 22, 22);

    ctx.fillStyle = isGlow ? 'rgba(255, 235, 59, 0.15)' : 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(this.x + 3, this.y + 3, 18, 18);

    // 16-bit 像素圖示渲染
    ctx.font = '14px "Press Start 2P", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let icon = '⭐';
    if (this.type === 'shield') icon = '🛡️';
    else if (this.type === 'freeze') icon = '❄️';
    else if (this.type === 'bomb') icon = '💣';
    else if (this.type === 'clock') icon = '⏱️';
    else if (this.type === 'life') icon = '❤️';
    else if (this.type === 'laser') icon = '⚡';
    else if (this.type === 'base_wall') icon = '🏰';

    ctx.fillText(icon, this.x + 12, this.y + 13);
    ctx.restore();
  }
}

// ===== 16-bit 鷹徽基地 Eagle Base =====
export class EagleBase {
  constructor(x = 12 * 24, y = 24 * 24) {
    this.x = x;
    this.y = y;
    this.width = 48;
    this.height = 48;
    this.alive = true;
  }

  render(ctx) {
    ctx.save();
    if (this.alive) {
      // 16-bit 石材與鍍金鷹徽
      ctx.fillStyle = '#263238';
      ctx.fillRect(this.x, this.y, 48, 48);
      ctx.fillStyle = '#37474f';
      ctx.fillRect(this.x + 2, this.y + 2, 44, 44);

      // 黃金基座
      ctx.fillStyle = SNES_PALETTE.GOLD_BASE;
      ctx.fillRect(this.x + 6, this.y + 6, 36, 36);
      ctx.fillStyle = SNES_PALETTE.GOLD_HIGHLIGHT;
      ctx.fillRect(this.x + 6, this.y + 6, 36, 4);
      ctx.fillRect(this.x + 6, this.y + 6, 4, 36);

      // 經典立體老鷹羽翼圖騰
      ctx.fillStyle = '#b71c1c';
      ctx.beginPath();
      ctx.moveTo(this.x + 24, this.y + 10);
      ctx.lineTo(this.x + 40, this.y + 38);
      ctx.lineTo(this.x + 8, this.y + 38);
      ctx.fill();

      // 老鷹頭部寶石
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(this.x + 23, this.y + 14, 2, 4);
    } else {
      // 殘破瓦礫廢墟狀態
      ctx.fillStyle = '#1c2536';
      ctx.fillRect(this.x, this.y, 48, 48);
      ctx.fillStyle = '#424242';
      ctx.fillRect(this.x + 4, this.y + 4, 40, 40);

      // 碎石瓦礫
      ctx.fillStyle = '#757575';
      ctx.fillRect(this.x + 8, this.y + 12, 12, 10);
      ctx.fillRect(this.x + 26, this.y + 24, 14, 12);
      ctx.fillRect(this.x + 14, this.y + 30, 8, 8);

      // 毀滅標記
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💀', this.x + 24, this.y + 24);
    }
    ctx.restore();
  }
}
