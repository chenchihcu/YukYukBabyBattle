/* =========================================================
   Engine.js - 主遊戲 Canvas 60FPS 引擎 (支援 2.5D Mode 7、Boss 戰與天氣)
   ========================================================= */

import { TILE, MAP_SIZE, SUB_MAP_SIZE, SUB_TILE_SIZE, SNES_PALETTE, MapDataGenerator } from './MapData.js';
import { DIR, Tank, EnemyTank, Bullet, PowerUpItem, EagleBase } from './Entities.js';
import { BossTank } from './Boss.js';
import { ParticleSystem } from './Particles.js';

export class GameEngine {
  constructor(canvas, levelManager, audioEngine, weaponsManager, uiCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.levelManager = levelManager;
    this.audioEngine = audioEngine;
    this.weaponsManager = weaponsManager;
    this.uiCallbacks = uiCallbacks || {};

    this.tileSize = 24; // 大格 24px
    this.subTileSize = 12; // 1/4 微觀小格 12px
    this.canvas.width = MAP_SIZE * this.tileSize;
    this.canvas.height = MAP_SIZE * this.tileSize;

    this.state = 'START';
    this.gameMode = '1P'; // '1P' 或 '2P'
    this.cameraPerspectiveMode = '2D'; // '2D' 或 '2.5D'
    this.weatherMode = 'none'; // 'none', 'rain', 'snow', 'night'

    this.score = 0;
    this.lives1 = 3;
    this.lives2 = 3;
    this.difficulty = 'normal';
    this.totalEnemiesToSpawn = 20;
    this.enemiesRemaining = 20;
    this.enemiesOnField = [];
    this.bullets = [];
    this.powerUps = [];
    this.particles = new ParticleSystem();

    this.player1 = null;
    this.player2 = null;
    this.eagleBase = null;
    this.boss = null;

    this.map = this.levelManager.loadStage(1);
    this.subMap = MapDataGenerator.convertToSubMap(this.map);

    this.spawnTimer = 0;
    this.keys = {};
    this.controlMode = 'mouse_keyboard';
    this.mouseX = 312;
    this.mouseY = 312;
    this.isMouseDown = false;

    this.bindEvents();
  }

  setGameMode(mode) {
    this.gameMode = mode;
  }

  setCameraPerspectiveMode(mode) {
    this.cameraPerspectiveMode = mode;
  }

  setWeatherMode(mode) {
    this.weatherMode = mode;
    this.particles.setWeather(mode);
  }

  setControlMode(mode) {
    this.controlMode = mode;
    if (this.canvas) {
      if (mode === 'mouse_keyboard' || mode === 'mouse_only') {
        this.canvas.classList.add('crosshair-cursor');
      } else {
        this.canvas.classList.remove('crosshair-cursor');
      }
    }
  }

  setDifficulty(diff) {
    this.difficulty = diff;
  }

  triggerScreenShake() {
    const viewport = document.getElementById('canvas-viewport');
    if (viewport) {
      viewport.classList.remove('shake-effect');
      void viewport.offsetWidth;
      viewport.classList.add('shake-effect');
      setTimeout(() => viewport.classList.remove('shake-effect'), 250);
    }
  }

  bindEvents() {
    window.addEventListener('keydown', e => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      this.keys[e.code] = true;

      if (this.state === 'PLAYING') {
        if (e.code === 'KeyZ' || e.code === 'Space') this.playerShoot(1);
        if (e.code === 'KeyX') this.useSpecialWeapon(1);
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.playerDash(1);

        if (this.gameMode === '2P') {
          if (e.code === 'KeyM' || e.code === 'Numpad0' || e.code === 'Enter') this.playerShoot(2);
          if (e.code === 'KeyN' || e.code === 'NumpadDecimal') this.playerDash(2);
        }
      }
    });

    window.addEventListener('keyup', e => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      this.keys[e.code] = false;
    });

    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    this.canvas.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mouseX = (e.clientX - rect.left) * scaleX;
      this.mouseY = (e.clientY - rect.top) * scaleY;

      if (this.player1 && this.player1.alive && (this.controlMode === 'mouse_keyboard' || this.controlMode === 'mouse_only')) {
        const dx = this.mouseX - (this.player1.x + 12);
        const dy = this.mouseY - (this.player1.y + 12);
        this.player1.turretAngle = Math.atan2(dy, dx);
      }
    });

    this.canvas.addEventListener('mousedown', e => {
      if (this.state !== 'PLAYING') return;
      if (e.button === 0) {
        this.isMouseDown = true;
        if (this.controlMode === 'mouse_keyboard' || this.controlMode === 'mouse_only') {
          this.playerShoot(1);
        }
      } else if (e.button === 2) {
        e.preventDefault();
        this.playerDash(1);
      }
    });

    window.addEventListener('mouseup', e => {
      if (e.button === 0) this.isMouseDown = false;
    });
  }

  playerDash(playerNum = 1) {
    const p = playerNum === 1 ? this.player1 : this.player2;
    if (p && p.dash()) {
      this.audioEngine.playSfx("shield_active");
      this.particles.createShockwave(p.x + 12, p.y + 12, p.playerNum === 2 ? '#00e5ff' : '#76ff03');
    }
  }

  startStage(stageNum) {
    this.map = this.levelManager.loadStage(stageNum);
    this.subMap = MapDataGenerator.convertToSubMap(this.map);

    this.score = this.score || 0;
    this.enemiesRemaining = 20;
    this.totalEnemiesToSpawn = 20;
    this.enemiesOnField = [];
    this.bullets = [];
    this.powerUps = [];

    this.stageKillsP1 = { basic: 0, fast: 0, power: 0, armor: 0 };
    this.stageKillsP2 = { basic: 0, fast: 0, power: 0, armor: 0 };

    this.player1 = new Tank(8 * this.tileSize, 24 * this.tileSize, true, 1);
    this.player2 = this.gameMode === '2P' ? new Tank(16 * this.tileSize, 24 * this.tileSize, true, 2) : null;
    this.eagleBase = new EagleBase(12 * this.tileSize, 24 * this.tileSize);

    // 每 5 關登場巨型 Boss (Boss Battle)
    if (stageNum % 5 === 0) {
      this.boss = new BossTank(11 * this.tileSize, 2 * this.tileSize);
      this.totalEnemiesToSpawn = 0; // Boss 關卡專屬決戰
      this.enemiesRemaining = 1;
    } else {
      this.boss = null;
    }

    // 隨機動態氣候
    if (stageNum % 4 === 1) this.setWeatherMode('rain');
    else if (stageNum % 4 === 2) this.setWeatherMode('snow');
    else if (stageNum % 4 === 3) this.setWeatherMode('night');
    else this.setWeatherMode('none');

    this.state = 'PLAYING';
    this.audioEngine.playSfx("stage_start_fanfare");
    this.audioEngine.startBgm();

    if (this.uiCallbacks.onStatusUpdate) {
      this.uiCallbacks.onStatusUpdate({
        stage: this.levelManager.currentStage,
        score: this.score,
        lives: this.lives1,
        lives2: this.lives2,
        enemiesLeft: Math.max(0, this.enemiesRemaining),
        bossHp: this.boss ? this.boss.hp : 0,
        bossMaxHp: this.boss ? this.boss.maxHp : 0
      });
    }
  }

  playerShoot(playerNum = 1) {
    const p = playerNum === 1 ? this.player1 : this.player2;
    if (!p || !p.alive || p.isParalyzed || p.cooldown > 0) return;
    p.cooldown = p.maxCooldown;

    const bx = p.x + 12;
    const by = p.y + 12;
    const isMouseAim = (playerNum === 1 && (this.controlMode === 'mouse_keyboard' || this.controlMode === 'mouse_only'));
    const baseAngle = (isMouseAim && p.turretAngle !== null)
      ? p.turretAngle
      : ((p.dir * 90 - 90) * Math.PI / 180);

    if (this.weaponsManager.isActive(2)) {
      [-0.2, 0, 0.2].forEach(angleOffset => {
        const finalAngle = baseAngle + angleOffset;
        this.bullets.push(new Bullet(bx, by, p.dir, true, 'spread', finalAngle, playerNum));
      });
      this.audioEngine.playSfx("shoot_spread");
    } else if (this.weaponsManager.isActive(5)) {
      this.bullets.push(new Bullet(bx, by, p.dir, true, 'laser', baseAngle, playerNum));
      this.audioEngine.playSfx("shoot_laser");
    } else {
      this.bullets.push(new Bullet(bx, by, p.dir, true, 'normal', baseAngle, playerNum));
      this.audioEngine.playSfx("shoot_normal");
    }
  }

  useSpecialWeapon(playerNum = 1) {
    if (this.weaponsManager.isActive(18)) {
      this.enemiesOnField.forEach(e => { e.isFrozen = true; e.freezeTimer = 300; });
      if (this.boss) { this.boss.isFrozen = true; this.boss.freezeTimer = 180; }
      this.audioEngine.playSfx("time_freeze");
    } else if (this.weaponsManager.isActive(21)) {
      this.enemiesOnField.forEach(e => {
        e.alive = false;
        this.particles.createExplosion(e.x + 12, e.y + 12, '#ff3d00', 24);
      });
      this.enemiesOnField = [];
      if (this.boss) {
        this.boss.hp -= 10;
        this.particles.createExplosion(this.boss.x + 48, this.boss.y + 48, '#ff3d00', 35);
      }
      this.audioEngine.playSfx("explosion_big");
    } else if (this.weaponsManager.isActive(3)) {
      const p = playerNum === 1 ? this.player1 : this.player2;
      if (p) { p.hasShield = true; p.shieldTimer = 300; this.audioEngine.playSfx("shield_active"); }
    }
  }

  update() {
    if (this.state !== 'PLAYING') return;

    // 1. Player 1 移動
    if (this.player1 && this.player1.alive && !this.player1.isFrozen && !this.player1.isParalyzed) {
      let moveDir = null;
      if (this.keys['KeyW'] || (this.gameMode === '1P' && this.keys['ArrowUp'])) moveDir = DIR.UP;
      else if (this.keys['KeyD'] || (this.gameMode === '1P' && this.keys['ArrowRight'])) moveDir = DIR.RIGHT;
      else if (this.keys['KeyS'] || (this.gameMode === '1P' && this.keys['ArrowDown'])) moveDir = DIR.DOWN;
      else if (this.keys['KeyA'] || (this.gameMode === '1P' && this.keys['ArrowLeft'])) moveDir = DIR.LEFT;

      if (moveDir === null && this.controlMode === 'mouse_only' && this.isMouseDown) {
        const pdx = this.mouseX - (this.player1.x + 12);
        const pdy = this.mouseY - (this.player1.y + 12);
        if (Math.hypot(pdx, pdy) > 16) {
          moveDir = Math.abs(pdx) > Math.abs(pdy) ? (pdx > 0 ? DIR.RIGHT : DIR.LEFT) : (pdy > 0 ? DIR.DOWN : DIR.UP);
        }
      }

      if (moveDir !== null) {
        this.player1.dir = moveDir;
        let nx = this.player1.x;
        let ny = this.player1.y;
        let baseSpeed = this.player1.speed * (this.weaponsManager.isActive(8) ? 1.4 : 1.0);
        if (this.player1.isDashing) baseSpeed *= 2.5;

        if (moveDir === DIR.UP) ny -= baseSpeed;
        else if (moveDir === DIR.RIGHT) nx += baseSpeed;
        else if (moveDir === DIR.DOWN) ny += baseSpeed;
        else if (moveDir === DIR.LEFT) nx -= baseSpeed;

        if (this.canMoveTo(nx, ny, this.player1)) {
          this.player1.x = nx;
          this.player1.y = ny;
          if (Math.random() < 0.3) {
            this.particles.createTrackMark(this.player1.x + 12, this.player1.y + 12, (moveDir * 90 * Math.PI) / 180);
          }
        }
      }
      this.player1.update();
    }

    // 2. Player 2 移動
    if (this.gameMode === '2P' && this.player2 && this.player2.alive && !this.player2.isFrozen && !this.player2.isParalyzed) {
      let moveDir2 = null;
      if (this.keys['ArrowUp']) moveDir2 = DIR.UP;
      else if (this.keys['ArrowRight']) moveDir2 = DIR.RIGHT;
      else if (this.keys['ArrowDown']) moveDir2 = DIR.DOWN;
      else if (this.keys['ArrowLeft']) moveDir2 = DIR.LEFT;

      if (moveDir2 !== null) {
        this.player2.dir = moveDir2;
        let nx2 = this.player2.x;
        let ny2 = this.player2.y;
        let baseSpeed2 = this.player2.speed * 1.0;
        if (this.player2.isDashing) baseSpeed2 *= 2.5;

        if (moveDir2 === DIR.UP) ny2 -= baseSpeed2;
        else if (moveDir2 === DIR.RIGHT) nx2 += baseSpeed2;
        else if (moveDir2 === DIR.DOWN) ny2 += baseSpeed2;
        else if (moveDir2 === DIR.LEFT) nx2 -= baseSpeed2;

        if (this.canMoveTo(nx2, ny2, this.player2)) {
          this.player2.x = nx2;
          this.player2.y = ny2;
          if (Math.random() < 0.3) {
            this.particles.createTrackMark(this.player2.x + 12, this.player2.y + 12, (moveDir2 * 90 * Math.PI) / 180);
          }
        }
      }
      this.player2.update();
    }

    // 3. 巨型 Boss 更新與 AI
    if (this.boss && this.boss.alive) {
      this.boss.update(this.player1, this.player2, this.bullets, this.particles);
    }

    // 4. 敵方普通坦克生成與 AI
    this.spawnTimer++;
    const maxEnemiesOnField = this.difficulty === 'nightmare' ? 6 : (this.difficulty === 'hard' ? 5 : 4);
    if (!this.boss && this.spawnTimer > 100 && this.enemiesOnField.length < maxEnemiesOnField && this.totalEnemiesToSpawn > 0) {
      this.spawnTimer = 0;
      const spawnCols = [0, 12, 24];
      const col = spawnCols[Math.floor(Math.random() * spawnCols.length)];
      const enemyTypes = ['basic', 'fast', 'power', 'armor'];
      const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      this.enemiesOnField.push(new EnemyTank(col * this.tileSize, 0, type));
      this.totalEnemiesToSpawn--;
    }

    this.enemiesOnField.forEach(enemy => {
      if (!enemy.alive || enemy.isFrozen) return;
      enemy.update();

      if (Math.random() < 0.02) enemy.dir = Math.floor(Math.random() * 4);
      let nx = enemy.x;
      let ny = enemy.y;
      const enemySpeedMultiplier = this.difficulty === 'nightmare' ? 1.5 : (this.difficulty === 'easy' ? 0.8 : 1.0);
      const actualSpeed = enemy.speed * enemySpeedMultiplier;

      if (enemy.dir === DIR.UP) ny -= actualSpeed;
      else if (enemy.dir === DIR.RIGHT) nx += actualSpeed;
      else if (enemy.dir === DIR.DOWN) ny += actualSpeed;
      else if (enemy.dir === DIR.LEFT) nx -= actualSpeed;

      if (this.canMoveTo(nx, ny, enemy)) {
        enemy.x = nx;
        enemy.y = ny;
      } else {
        enemy.dir = Math.floor(Math.random() * 4);
      }

      if (enemy.cooldown <= 0 && Math.random() < 0.04) {
        enemy.cooldown = 35;
        this.bullets.push(new Bullet(enemy.x + 12, enemy.y + 12, enemy.dir, false, 'normal'));
      }
    });

    // 5. 子彈碰撞與微觀地形
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update();

      if (b.x < 0 || b.x > MAP_SIZE * this.tileSize || b.y < 0 || b.y > MAP_SIZE * this.tileSize) {
        b.alive = false;
        this.bullets.splice(i, 1);
        continue;
      }

      const subC = Math.floor(b.x / this.subTileSize);
      const subR = Math.floor(b.y / this.subTileSize);

      if (subR >= 0 && subR < SUB_MAP_SIZE && subC >= 0 && subC < SUB_MAP_SIZE && this.subMap && this.subMap[subR]) {
        const subTile = this.subMap[subR][subC];

        if (subTile === TILE.BRICK) {
          this.subMap[subR][subC] = TILE.EMPTY;
          b.alive = false;
          this.particles.createExplosion(b.x, b.y, '#d84315', 6);
          this.audioEngine.playSfx("hit_brick");
          this.bullets.splice(i, 1);
          continue;
        } else if (subTile === TILE.STEEL) {
          if (b.weaponType === 'laser' || this.weaponsManager.isActive(12)) {
            this.subMap[subR][subC] = TILE.EMPTY;
          }
          b.alive = false;
          this.particles.createExplosion(b.x, b.y, '#90a4ae', 6);
          this.audioEngine.playSfx("hit_steel");
          this.bullets.splice(i, 1);
          continue;
        } else if (subTile === TILE.BASE) {
          if (this.eagleBase) this.eagleBase.alive = false;
          b.alive = false;
          this.particles.createExplosion(b.x, b.y, '#ff1744', 30);
          this.audioEngine.playSfx("explosion_base");
          this.triggerScreenShake();
          this.gameOver();
          break;
        }
      }

      // 子彈撞擊 玩家 / 敵軍 / Boss / 友軍
      if (b.isPlayer) {
        // 擊中 Boss (Boss Battle)
        if (this.boss && this.boss.alive && this.checkOverlap(b.x - 3, b.y - 3, 6, 6, this.boss.x, this.boss.y, 96, 96)) {
          b.alive = false;
          if (this.boss.hasShield) {
            this.audioEngine.playSfx("hit_steel");
          } else {
            this.boss.hp--;
            this.particles.createExplosion(b.x, b.y, '#ff9800', 8);

            if (this.boss.hp <= 0) {
              this.boss.alive = false;
              this.score += 5000;
              this.enemiesRemaining = 0;
              this.particles.createExplosion(this.boss.x + 48, this.boss.y + 48, '#ff3d00', 40);
              this.audioEngine.playSfx("explosion_big");
              this.triggerScreenShake();
              this.victory();
            } else {
              this.audioEngine.playSfx("hit_steel");
            }
          }
          this.bullets.splice(i, 1);
          continue;
        }

        // P1/P2 友軍互射麻痺
        if (this.gameMode === '2P' && this.player2 && this.player2.alive && this.checkOverlap(b.x - 3, b.y - 3, 6, 6, this.player2.x, this.player2.y, 24, 24)) {
          this.player2.isParalyzed = true;
          this.player2.paralyzeTimer = 90;
          b.alive = false;
          this.particles.createSparks(b.x, b.y, '#00e5ff', 8);
          this.audioEngine.playSfx("time_freeze");
          this.bullets.splice(i, 1);
          continue;
        }

        // 擊中敵軍
        for (let j = this.enemiesOnField.length - 1; j >= 0; j--) {
          const enemy = this.enemiesOnField[j];
          if (enemy.alive && this.checkOverlap(b.x - 3, b.y - 3, 6, 6, enemy.x, enemy.y, 24, 24)) {
            b.alive = false;
            enemy.hp--;
            this.particles.createExplosion(b.x, b.y, '#ff3d00', 8);

            if (enemy.hp <= 0) {
              enemy.alive = false;
              this.score += enemy.enemyType === 'armor' ? 400 : (enemy.enemyType === 'fast' ? 200 : 100);

              if (b.shooterPlayerNum === 2) {
                if (this.stageKillsP2[enemy.enemyType] !== undefined) this.stageKillsP2[enemy.enemyType]++;
              } else {
                if (this.stageKillsP1[enemy.enemyType] !== undefined) this.stageKillsP1[enemy.enemyType]++;
              }

              this.enemiesOnField.splice(j, 1);
              this.enemiesRemaining--;
              this.audioEngine.playSfx("explosion_tank");

              if (Math.random() < 0.20) {
                const itemTypes = ['star', 'shield', 'freeze', 'life', 'laser'];
                const pType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
                this.powerUps.push(new PowerUpItem(enemy.x, enemy.y, pType));
              }
            } else {
              this.audioEngine.playSfx("hit_steel");
            }
            this.bullets.splice(i, 1);
            break;
          }
        }
      } else {
        // 敵方擊中 P1
        if (this.player1 && this.player1.alive && this.checkOverlap(b.x - 3, b.y - 3, 6, 6, this.player1.x, this.player1.y, 24, 24)) {
          b.alive = false;
          this.bullets.splice(i, 1);
          if (this.player1.hasShield) {
            this.audioEngine.playSfx("hit_steel");
          } else {
            this.player1.alive = false;
            this.lives1--;
            this.particles.createExplosion(this.player1.x + 12, this.player1.y + 12, '#ff3d00', 25);
            this.audioEngine.playSfx("explosion_player");

            if (this.lives1 > 0) {
              setTimeout(() => { this.player1 = new Tank(8 * this.tileSize, 24 * this.tileSize, true, 1); }, 1000);
            } else if (this.gameMode === '1P' || (this.lives2 <= 0 && (!this.player2 || !this.player2.alive))) {
              this.gameOver();
            }
          }
        }

        // 敵方擊中 P2
        if (this.gameMode === '2P' && this.player2 && this.player2.alive && this.checkOverlap(b.x - 3, b.y - 3, 6, 6, this.player2.x, this.player2.y, 24, 24)) {
          b.alive = false;
          if (this.player2.hasShield) {
            this.audioEngine.playSfx("hit_steel");
          } else {
            this.player2.alive = false;
            this.lives2--;
            this.particles.createExplosion(this.player2.x + 12, this.player2.y + 12, '#00e5ff', 25);
            this.audioEngine.playSfx("explosion_player");

            if (this.lives2 > 0) {
              setTimeout(() => { this.player2 = new Tank(16 * this.tileSize, 24 * this.tileSize, true, 2); }, 1000);
            } else if (this.lives1 <= 0 && (!this.player1 || !this.player1.alive)) {
              this.gameOver();
            }
          }
        }
      }
    }

    // 6. 拾取寶箱道具
    this.powerUps.forEach((p, idx) => {
      [this.player1, this.player2].forEach(pl => {
        if (pl && pl.alive && this.checkOverlap(pl.x, pl.y, 24, 24, p.x, p.y, 24, 24)) {
          p.alive = false;
          this.score += 500;
          this.audioEngine.playSfx("item_pickup");

          if (p.type === 'shield') {
            pl.hasShield = true;
            pl.shieldTimer = 300;
          } else if (p.type === 'freeze') {
            this.enemiesOnField.forEach(e => { e.isFrozen = true; e.freezeTimer = 240; });
            if (this.boss) { this.boss.isFrozen = true; this.boss.freezeTimer = 180; }
          } else if (p.type === 'life') {
            if (pl.playerNum === 1) this.lives1++;
            else this.lives2++;
          }
          this.powerUps.splice(idx, 1);
        }
      });
    });

    // 7. 勝負檢測
    if (!this.boss && this.enemiesRemaining <= 0 && this.enemiesOnField.filter(e => e.alive).length === 0) {
      this.victory();
    }

    if (this.uiCallbacks.onStatusUpdate) {
      this.uiCallbacks.onStatusUpdate({
        stage: this.levelManager.currentStage,
        score: this.score,
        lives: this.lives1,
        lives2: this.lives2,
        enemiesLeft: Math.max(0, this.enemiesRemaining),
        bossHp: this.boss ? this.boss.hp : 0,
        bossMaxHp: this.boss ? this.boss.maxHp : 0
      });
    }

    this.particles.update();
  }

  canMoveTo(x, y, tank) {
    if (x < 0 || x + (tank.width || 24) > MAP_SIZE * this.tileSize || y < 0 || y + (tank.height || 24) > MAP_SIZE * this.tileSize) return false;
    const subC1 = Math.floor(x / this.subTileSize);
    const subC2 = Math.floor((x + (tank.width || 24) - 1) / this.subTileSize);
    const subR1 = Math.floor(y / this.subTileSize);
    const subR2 = Math.floor((y + (tank.height || 24) - 1) / this.subTileSize);

    for (let r = subR1; r <= subR2; r++) {
      for (let c = subC1; c <= subC2; c++) {
        if (r >= 0 && r < SUB_MAP_SIZE && c >= 0 && c < SUB_MAP_SIZE && this.subMap && this.subMap[r]) {
          const tile = this.subMap[r][c];
          if (tile === TILE.BRICK || tile === TILE.STEEL || tile === TILE.WATER || tile === TILE.BASE) {
            return false;
          }
        }
      }
    }
    return true;
  }

  checkOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  getTallyData() {
    return {
      stage: this.levelManager.currentStage,
      score: this.score,
      killsP1: this.stageKillsP1 || { basic: 0, fast: 0, power: 0, armor: 0 },
      killsP2: this.stageKillsP2 || { basic: 0, fast: 0, power: 0, armor: 0 },
      is2P: this.gameMode === '2P'
    };
  }

  gameOver() {
    this.state = 'GAMEOVER';
    this.audioEngine.stopBgm();
    if (this.uiCallbacks.onGameOver) this.uiCallbacks.onGameOver(this.getTallyData());
  }

  victory() {
    this.state = 'VICTORY';
    this.audioEngine.stopBgm();
    this.audioEngine.playSfx("stage_clear_jingle");
    if (this.uiCallbacks.onVictory) this.uiCallbacks.onVictory(this.getTallyData());
  }

  // 2.5D Mode 7 傾斜與天氣透視渲染
  render() {
    this.waterAnimFrame = (this.waterAnimFrame || 0) + 1;
    this.ctx.fillStyle = '#080a0f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (!this.subMap || !Array.isArray(this.subMap)) return;

    this.ctx.save();

    // 2.5D Mode 7 傾斜透視矩陣轉換 (Perspective Matrix Tilt)
    if (this.cameraPerspectiveMode === '2.5D') {
      this.ctx.transform(1, 0, -0.05, 0.94, 16, 12);
    }

    const waveShift = Math.floor(this.waterAnimFrame / 15) % 4;

    // 1. 地形 Tiles
    for (let r = 0; r < SUB_MAP_SIZE; r++) {
      if (!this.subMap[r]) continue;
      for (let c = 0; c < SUB_MAP_SIZE; c++) {
        const tile = this.subMap[r][c];
        const x = c * this.subTileSize;
        const y = r * this.subTileSize;

        if (tile === TILE.BRICK) {
          this.ctx.fillStyle = SNES_PALETTE.MORTAR;
          this.ctx.fillRect(x, y, 12, 12);
          this.ctx.fillStyle = SNES_PALETTE.BRICK_MAIN;
          this.ctx.fillRect(x + 1, y + 1, 10, 10);
          this.ctx.fillStyle = SNES_PALETTE.BRICK_LIGHT;
          this.ctx.fillRect(x + 1, y + 1, 10, 2);
          this.ctx.fillStyle = SNES_PALETTE.BRICK_DARK;
          this.ctx.fillRect(x + 1, y + 9, 10, 2);
        } else if (tile === TILE.STEEL) {
          this.ctx.fillStyle = SNES_PALETTE.STEEL_DARK;
          this.ctx.fillRect(x, y, 12, 12);
          this.ctx.fillStyle = SNES_PALETTE.STEEL_MAIN;
          this.ctx.fillRect(x + 1, y + 1, 10, 10);
          this.ctx.fillStyle = SNES_PALETTE.STEEL_LIGHT;
          this.ctx.fillRect(x + 1, y + 1, 10, 2);
        } else if (tile === TILE.WATER) {
          this.ctx.fillStyle = SNES_PALETTE.WATER_DEEP;
          this.ctx.fillRect(x, y, 12, 12);
          this.ctx.fillStyle = SNES_PALETTE.WATER_SURFACE;
          this.ctx.fillRect(x, y + 2 + (waveShift % 2), 12, 3);
        } else if (tile === TILE.ICE) {
          this.ctx.fillStyle = SNES_PALETTE.ICE_MAIN;
          this.ctx.fillRect(x, y, 12, 12);
          this.ctx.fillStyle = SNES_PALETTE.ICE_HIGHLIGHT;
          this.ctx.fillRect(x + 1, y + 1, 10, 2);
        }
      }
    }

    // 2. 基地、寶箱、坦克、Boss
    if (this.eagleBase) this.eagleBase.render(this.ctx);
    this.powerUps.forEach(p => p.render(this.ctx));

    if (this.player1) this.player1.render(this.ctx);
    if (this.player2) this.player2.render(this.ctx);
    if (this.boss) this.boss.render(this.ctx);

    this.enemiesOnField.forEach(e => e.render(this.ctx));
    this.bullets.forEach(b => b.render(this.ctx));

    // 3. 頂層樹叢遮罩
    for (let r = 0; r < SUB_MAP_SIZE; r++) {
      if (!this.subMap[r]) continue;
      for (let c = 0; c < SUB_MAP_SIZE; c++) {
        if (this.subMap[r][c] === TILE.TREES) {
          const x = c * this.subTileSize;
          const y = r * this.subTileSize;
          this.ctx.fillStyle = SNES_PALETTE.TREES_MAIN;
          this.ctx.fillRect(x, y, 12, 12);
          this.ctx.fillStyle = SNES_PALETTE.TREES_LIGHT;
          this.ctx.fillRect(x + 1, y + 1, 4, 4);
        }
      }
    }

    // 4. 粒子與天氣特效
    this.particles.render(this.ctx);

    this.ctx.restore(); // 結束 2.5D Mode 7 透視

    // 夜間探照燈光束 (Night Flashlight Spotlight Cutout)
    if (this.weatherMode === 'night' && this.state === 'PLAYING') {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(5, 8, 15, 0.88)';
      this.ctx.fillRect(0, 0, 624, 624);

      this.ctx.globalCompositeOperation = 'destination-out';
      [this.player1, this.player2].forEach(p => {
        if (p && p.alive) {
          const px = p.x + 12;
          const py = p.y + 12;
          const grad = this.ctx.createRadialGradient(px, py, 10, px, py, 90);
          grad.addColorStop(0, 'rgba(0,0,0,1)');
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          this.ctx.fillStyle = grad;
          this.ctx.beginPath();
          this.ctx.arc(px, py, 90, 0, Math.PI * 2);
          this.ctx.fill();
        }
      });
      this.ctx.restore();
    }
  }
}
