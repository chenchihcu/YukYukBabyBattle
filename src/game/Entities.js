/* =========================================================
   Entities.js - 超級任天堂 (SNES 16-bit) 坦克、子彈、寶箱與鷹徽實體
   ========================================================= */

import { SNES_PALETTE } from './MapData.js';

// 方向常量
export const DIR = {
  UP: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3,
};

// 依方向與速度計算下一格座標（供玩家/AI 共用）
export function stepInDirection(x, y, dir, speed) {
  let nx = x,
    ny = y;
  if (dir === DIR.UP) ny -= speed;
  else if (dir === DIR.RIGHT) nx += speed;
  else if (dir === DIR.DOWN) ny += speed;
  else if (dir === DIR.LEFT) nx -= speed;
  return { x: nx, y: ny };
}

// ===== 16-bit 坦克基類 =====
export class Tank {
  constructor(x, y, isPlayer = false, playerNum = 1) {
    this.x = x;
    this.y = y;
    this.width = 64;
    this.height = 64;
    this.dir = DIR.UP;
    this.speed = (isPlayer ? 2.2 : 1.4) * (64 / 24);
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
    if (
      this.dashCooldown > 0 ||
      !this.alive ||
      this.isFrozen ||
      this.isParalyzed
    )
      return false;
    this.dashTimer = this.maxDashTimer;
    this.dashCooldown = this.maxDashCooldown;
    this.isDashing = true;
    return true;
  }

  // 重生：重設位置與存活/異常狀態，並給予短暫護盾避免重生秒殺
  respawn(x, y) {
    this.x = x;
    this.y = y;
    this.alive = true;
    this.hasShield = true;
    this.shieldTimer = 90; // 1.5 秒重生無敵
    this.isFrozen = false;
    this.freezeTimer = 0;
    this.isParalyzed = false;
    this.paralyzeTimer = 0;
    this.isDashing = false;
    this.dashTimer = 0;
    this.cooldown = 0;
    this.turretAngle = null;
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

  render(ctx, renderMode = '2D') {
    if (!this.alive) return;
    const bodyAngle = (this.dir * 90 * Math.PI) / 180;
    const currentTurretAngle =
      this.turretAngle !== null ? this.turretAngle : bodyAngle - Math.PI / 2;
    const is64Bit = renderMode === '64BIT';

    ctx.save();

    // 64-bit 次世代物體動態地面投影 (Dynamic Cast Shadows)
    if (is64Bit) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(this.x + 40, this.y + 48, 37, 32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.translate(this.x + 32, this.y + 32);
    ctx.scale(64 / 24, 64 / 24); // 2.66 倍縮放以無縫銜接原 24px 繪圖代碼

    // 1. 繪製履帶底盤 (隨車身方向旋轉)
    ctx.save();
    ctx.rotate(bodyAngle);

    // 履帶陰影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(-11, -10, 24, 24);

    // 履帶與細碎履帶齒
    const treadColorDark = is64Bit ? '#0a0d14' : '#10141d';
    const treadColorLight = is64Bit ? '#607d8b' : '#455a64';
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

    // 2. 車身金屬裝甲 (層次與切角高光)
    let bodyColorMain, bodyColorLight, bodyColorDark;

    if (this.isPlayer) {
      if (this.playerNum === 2) {
        // Player 2 湛藍/賽博專屬配色
        if (this.isDashing) {
          bodyColorMain = '#00e5ff';
          bodyColorLight = '#ffffff';
          bodyColorDark = '#00838f';
        } else if (this.starLevel >= 4) {
          bodyColorMain = '#00b0ff';
          bodyColorLight = '#80d8ff';
          bodyColorDark = '#0056b3';
        } else if (this.starLevel === 3) {
          bodyColorMain = '#0288d1';
          bodyColorLight = '#b3e5fc';
          bodyColorDark = '#01579b';
        } else if (this.starLevel === 2) {
          bodyColorMain = '#29b6f6';
          bodyColorLight = '#e0f7fa';
          bodyColorDark = '#0277bd';
        } else {
          bodyColorMain = '#00e5ff';
          bodyColorLight = '#b2ebf2';
          bodyColorDark = '#0097a7';
        }
      } else {
        // Player 1 經典翠綠/黃金配色
        if (this.isDashing) {
          bodyColorMain = '#00b0ff';
          bodyColorLight = '#80d8ff';
          bodyColorDark = '#0056b3';
        } else if (this.starLevel >= 4) {
          bodyColorMain = '#d500f9';
          bodyColorLight = '#ff80ab';
          bodyColorDark = '#aa00ff';
        } else if (this.starLevel === 3) {
          bodyColorMain = '#ffb300';
          bodyColorLight = '#ffe57f';
          bodyColorDark = '#ff6f00';
        } else if (this.starLevel === 2) {
          bodyColorMain = '#00c853';
          bodyColorLight = '#b9f6ca';
          bodyColorDark = '#007e33';
        } else {
          bodyColorMain = '#76ff03';
          bodyColorLight = '#ccff90';
          bodyColorDark = '#33691e';
        }
      }
    } else {
      // 敵方坦克配色
      if (this.enemyType === 'armor') {
        if (this.hp === 3) {
          bodyColorMain = '#9c27b0';
          bodyColorLight = '#e1bee7';
          bodyColorDark = '#4a148c';
        } else if (this.hp === 2) {
          bodyColorMain = '#ff9800';
          bodyColorLight = '#ffe0b2';
          bodyColorDark = '#e65100';
        } else {
          bodyColorMain = '#d50000';
          bodyColorLight = '#ff8a80';
          bodyColorDark = '#b71c1c';
        }
      } else if (this.enemyType === 'fast') {
        bodyColorMain = '#00e5ff';
        bodyColorLight = '#80deea';
        bodyColorDark = '#00838f';
      } else if (this.enemyType === 'power') {
        bodyColorMain = '#ffeb3b';
        bodyColorLight = '#fff9c4';
        bodyColorDark = '#f57f17';
      } else {
        bodyColorMain = '#ff3d00';
        bodyColorLight = '#ff9e80';
        bodyColorDark = '#dd2c00';
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

    // 64-bit 金屬裝甲倒角斜面與高光 Specular
    if (is64Bit) {
      ctx.strokeStyle = bodyColorLight;
      ctx.lineWidth = 1;
      ctx.strokeRect(-6.5, -8.5, 13, 17);
    }

    // 裝甲金屬鉚釘
    ctx.fillStyle = bodyColorDark;
    ctx.fillRect(-5, -6, 2, 2);
    ctx.fillRect(3, -6, 2, 2);
    ctx.fillRect(-5, 4, 2, 2);
    ctx.fillRect(3, 4, 2, 2);

    ctx.restore(); // 結束底盤旋轉

    // 3. 獨立砲塔 (跟隨瞄準角度)
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
      ctx.arc(0, 0, 17, 0, Math.PI * 2);
      ctx.stroke();

      // 旋轉高光點
      const sx = Math.cos(shieldTime) * 17;
      const sy = Math.sin(shieldTime) * 17;
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
      ctx.fillRect(-14, -14, 28, 28);
      ctx.strokeStyle = '#e0f7fa';
      ctx.lineWidth = 1;
      ctx.strokeRect(-14, -14, 28, 28);
      ctx.restore();
    }

    // 6. 友軍麻痺電擊效果
    if (this.isParalyzed) {
      ctx.save();
      ctx.strokeStyle =
        Math.floor(Date.now() / 80) % 2 === 0 ? '#ffe082' : '#00e5ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-13, -13, 26, 26);

      // 電磁火花
      const time = Date.now() / 50;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(Math.cos(time) * 14, Math.sin(time) * 14, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore(); // 取消 scale 與 translate
  }
}

// ===== 敵方坦克特化 =====
export class EnemyTank extends Tank {
  constructor(x, y, enemyType = 'basic') {
    super(x, y, false);
    this.enemyType = enemyType;
    this.dir = DIR.DOWN;
    const scale = 64 / 24;

    if (enemyType === 'fast') {
      this.speed = 2.4 * scale;
      this.hp = 1;
    } else if (enemyType === 'power') {
      this.speed = 1.2 * scale;
      this.hp = 1;
    } else if (enemyType === 'armor') {
      this.speed = 1.0 * scale;
      this.hp = 3; // 重裝坦克需要 3 槍
    }
    this.maxHp = this.hp;
  }
}

// ===== 新特化敵軍 AI =====
export class ChaserTank extends EnemyTank {
  constructor(x, y) {
    super(x, y, 'fast');
    this.enemyType = 'chaser';
    this.isChaser = true;
    this.speed = 1.8 * (64 / 24);
  }
  updateChaser(target, engine) {
    if (this.isFrozen || this.isParalyzed) return;
    this.update();
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      this.dir = dx > 0 ? DIR.RIGHT : DIR.LEFT;
    } else {
      this.dir = dy > 0 ? DIR.DOWN : DIR.UP;
    }
    const { x: nx, y: ny } = stepInDirection(
      this.x,
      this.y,
      this.dir,
      this.speed
    );

    if (engine.canMoveTo(nx, ny, this)) {
      this.x = nx;
      this.y = ny;
    } else {
      this.dir = Math.floor(Math.random() * 4); // 繞道
    }
  }
}

export class PatrolTank extends EnemyTank {
  constructor(x, y) {
    super(x, y, 'armor');
    this.enemyType = 'patrol';
    this.isPatrol = true;
    this.speed = 1.2 * (64 / 24);
  }
  updatePatrol(engine) {
    if (this.isFrozen || this.isParalyzed) return;
    this.update();
    const { x: nx, y: ny } = stepInDirection(
      this.x,
      this.y,
      this.dir,
      this.speed
    );

    if (engine.canMoveTo(nx, ny, this)) {
      this.x = nx;
      this.y = ny;
    } else {
      this.dir = (this.dir + 1) % 4; // 碰壁向右轉
    }
  }
}

export class KamikazeTank extends EnemyTank {
  constructor(x, y) {
    super(x, y, 'basic');
    this.enemyType = 'kamikaze';
    this.isKamikaze = true;
    this.speed = 3.0 * (64 / 24);
  }
  updateKamikaze(target, engine) {
    if (this.isFrozen || this.isParalyzed) return;
    this.update();
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 自爆檢測
    if (dist < 80) {
      this.alive = false;
      engine.particles.createExplosion(this.x + 32, this.y + 32, '#ff3d00', 30);
      engine.audioEngine.playSfx('explosion_big');
      if (target.isPlayer && !target.hasShield) {
        engine.damagePlayer(
          target,
          target.playerNum === 1 ? 8 * 64 : 16 * 64,
          22 * 64
        );
      }
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      this.dir = dx > 0 ? DIR.RIGHT : DIR.LEFT;
    } else {
      this.dir = dy > 0 ? DIR.DOWN : DIR.UP;
    }
    const { x: nx, y: ny } = stepInDirection(
      this.x,
      this.y,
      this.dir,
      this.speed
    );

    if (engine.canMoveTo(nx, ny, this)) {
      this.x = nx;
      this.y = ny;
    } else {
      this.dir = Math.floor(Math.random() * 4);
    }
  }
}

// ===== 16-bit 子彈實體 =====
export class Bullet {
  constructor(
    x,
    y,
    dir,
    isPlayer = true,
    weaponType = 'normal',
    angle = null,
    shooterPlayerNum = 1
  ) {
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.isPlayer = isPlayer;
    this.shooterPlayerNum = shooterPlayerNum; // 1: P1, 2: P2
    this.weaponType = weaponType;
    const scale = 64 / 24;
    this.speed =
      (weaponType === 'laser' ? 12 : weaponType === 'fast' ? 8 : 5.5) * scale;
    this.width = (weaponType === 'laser' ? 4 : 6) * scale;
    this.height = (weaponType === 'laser' ? 16 : 6) * scale;
    this.alive = true;
    this.ricochetCount = weaponType === 'ricochet' ? 2 : 0;
    this.angle = angle;

    if (this.angle !== null) {
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;
    } else {
      if (this.dir === DIR.UP) {
        this.vx = 0;
        this.vy = -this.speed;
        this.angle = -Math.PI / 2;
      } else if (this.dir === DIR.RIGHT) {
        this.vx = this.speed;
        this.vy = 0;
        this.angle = 0;
      } else if (this.dir === DIR.DOWN) {
        this.vx = 0;
        this.vy = this.speed;
        this.angle = Math.PI / 2;
      } else if (this.dir === DIR.LEFT) {
        this.vx = -this.speed;
        this.vy = 0;
        this.angle = Math.PI;
      }
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
    this.width = 64;
    this.height = 64;
    this.type = type; // star, shield, freeze, bomb, clock, base_wall, life, laser
    this.alive = true;
    this.flashTimer = 0;
  }

  render(ctx) {
    if (!this.alive) return;
    this.flashTimer++;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(64 / 24, 64 / 24);

    // 16-bit 寶箱金屬框底座
    const isGlow = Math.floor(this.flashTimer / 8) % 2 === 0;
    const borderGold = isGlow ? '#ffe57f' : '#ffb300';
    const bgDark = '#10141d';

    ctx.fillStyle = bgDark;
    ctx.fillRect(0, 0, 24, 24);

    // 立體金屬雙重邊框
    ctx.strokeStyle = borderGold;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 22, 22);

    ctx.fillStyle = isGlow ? 'rgba(255, 235, 59, 0.15)' : 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(3, 3, 18, 18);

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
    else if (this.type === 'coin') icon = '💰';

    ctx.fillText(icon, 12, 13);
    ctx.restore();
  }
}

// ===== 16-bit 鷹徽基地 Eagle Base =====
export class EagleBase {
  constructor(x = 12 * 64, y = 24 * 64) {
    this.x = x;
    this.y = y;
    this.width = 128; // 佔地 2x2 個 64px 磁磚
    this.height = 128;
    this.alive = true;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(128 / 48, 128 / 48); // 從原 48px 放大到 128px
    if (this.alive) {
      // 16-bit 石材與鍍金鷹徽
      ctx.fillStyle = '#263238';
      ctx.fillRect(0, 0, 48, 48);
      ctx.fillStyle = '#37474f';
      ctx.fillRect(2, 2, 44, 44);

      // 黃金基座
      ctx.fillStyle = SNES_PALETTE.GOLD_BASE;
      ctx.fillRect(6, 6, 36, 36);
      ctx.fillStyle = SNES_PALETTE.GOLD_HIGHLIGHT;
      ctx.fillRect(6, 6, 36, 4);
      ctx.fillRect(6, 6, 4, 36);

      // 經典立體老鷹羽翼圖騰
      ctx.fillStyle = '#b71c1c';
      ctx.beginPath();
      ctx.moveTo(24, 10);
      ctx.lineTo(40, 38);
      ctx.lineTo(8, 38);
      ctx.fill();

      // 老鷹頭部寶石
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(23, 14, 2, 4);
    } else {
      // 殘破瓦礫廢墟狀態
      ctx.fillStyle = '#1c2536';
      ctx.fillRect(0, 0, 48, 48);
      ctx.fillStyle = '#424242';
      ctx.fillRect(4, 4, 40, 40);

      // 碎石瓦礫
      ctx.fillStyle = '#757575';
      ctx.fillRect(8, 12, 12, 10);
      ctx.fillRect(26, 24, 14, 12);
      ctx.fillRect(14, 30, 8, 8);

      // 毀滅標記
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💀', 24, 24);
    }
    ctx.restore();
  }
}

// ===== 場景可破壞物件 (油桶/樹樁/小屋) =====
export class DestructibleProp {
  constructor(x, y, type = 'barrel') {
    this.x = x;
    this.y = y;
    this.width = 64;
    this.height = 64;
    this.type = type;
    this.alive = true;
  }
  render(ctx) {
    if (!this.alive) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.type === 'barrel') {
      ctx.fillStyle = '#ff6820';
      ctx.fillRect(16, 16, 32, 32);
      ctx.fillStyle = '#a33000';
      ctx.fillRect(16, 16, 32, 4);
      ctx.fillRect(16, 44, 32, 4);
    } else if (this.type === 'stump') {
      ctx.fillStyle = '#4a2c10';
      ctx.fillRect(12, 24, 40, 32);
      ctx.fillStyle = '#d2a679';
      ctx.beginPath();
      ctx.ellipse(32, 24, 20, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'shack') {
      ctx.fillStyle = '#5c4033';
      ctx.fillRect(8, 24, 48, 36);
      ctx.fillStyle = '#26140b';
      ctx.beginPath();
      ctx.moveTo(4, 24);
      ctx.lineTo(32, 4);
      ctx.lineTo(60, 24);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ===== 隱藏地雷 =====
export class LandMine {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 64;
    this.height = 64;
    this.alive = true;
  }
  render(ctx) {
    if (!this.alive) return;
    // 只有極淡的痕跡
    ctx.save();
    ctx.fillStyle = 'rgba(200, 50, 0, 0.1)';
    ctx.beginPath();
    ctx.arc(this.x + 32, this.y + 32, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
