/* =========================================================
   Engine.js - 主遊戲 Canvas 60FPS 視窗滿版與攝影機引擎
   (支援 52x52 大地圖、平滑攝影機、2.5D Mode 7、Boss 戰與天氣)
   ========================================================= */

import { TILE, MAP_SIZE, EXTENDED_MAP_SIZE, SUB_MAP_SIZE, SUB_TILE_SIZE, SNES_PALETTE, N64_PALETTE, MapDataGenerator } from './MapData.js';
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

    // 視窗滿版 100vw x 100vh
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // 平滑攝影機 (Smooth Follow Camera)
    this.camera = { x: 0, y: 0, targetX: 0, targetY: 0 };

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

    // 預設載入 52x52 大地圖
    this.map = this.levelManager.loadStage(1, true);
    this.subMap = MapDataGenerator.convertToSubMap(this.map);

    this.spawnTimer = 0;
    this.keys = {};
    this.controlMode = 'mouse_keyboard';
    this.mouseX = window.innerWidth / 2;
    this.mouseY = window.innerHeight / 2;
    this.isMouseDown = false;

    this.bindEvents();

    // Resize 監聽
    window.addEventListener('resize', () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    });
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
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;

      // 轉換為世界座標算角度
      if (this.player1 && this.player1.alive && (this.controlMode === 'mouse_keyboard' || this.controlMode === 'mouse_only')) {
        const worldMouseX = this.mouseX + this.camera.x;
        const worldMouseY = this.mouseY + this.camera.y;
        const dx = worldMouseX - (this.player1.x + 12);
        const dy = worldMouseY - (this.player1.y + 12);
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
    // 載入 52x52 擴展戰術大地圖
    this.map = this.levelManager.loadStage(stageNum, true);
    this.subMap = MapDataGenerator.convertToSubMap(this.map);

    this.score = this.score || 0;
    if (this.lives1 <= 0) this.lives1 = 1;
    if (this.gameMode === '2P' && this.lives2 <= 0) this.lives2 = 1;

    this.enemiesRemaining = 20;
    this.totalEnemiesToSpawn = 20;
    this.enemiesOnField = [];
    this.bullets = [];
    this.powerUps = [];

    this.stageKillsP1 = { basic: 0, fast: 0, power: 0, armor: 0 };
    this.stageKillsP2 = { basic: 0, fast: 0, power: 0, armor: 0 };

    // 在 52x52 大地圖的中央守護區置放玩家 (col 21, row 37) 與基地 (col 25, row 38)
    const gridCols = this.map.length; // 52
    const offsetC = (gridCols === 52) ? 13 : 0;
    const offsetR = (gridCols === 52) ? 13 : 0;

    this.player1 = new Tank((8 + offsetC) * this.tileSize, (24 + offsetR) * this.tileSize, true, 1);
    this.player2 = this.gameMode === '2P' ? new Tank((16 + offsetC) * this.tileSize, (24 + offsetR) * this.tileSize, true, 2) : null;
    this.eagleBase = new EagleBase((12 + offsetC) * this.tileSize, (24 + offsetR) * this.tileSize);

    // 每 5 關登場 Boss
    if (stageNum % 5 === 0) {
      this.boss = new BossTank((11 + offsetC) * this.tileSize, (2 + offsetR) * this.tileSize, stageNum);
      this.totalEnemiesToSpawn = 0;
      this.enemiesRemaining = 1;
    } else {
      this.boss = null;
    }

    // 動態氣候
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

    const currentWpn = this.weaponsManager.getCurrentWeapon();

    if (currentWpn.id === 'rapid') {
      this.bullets.push(new Bullet(bx - 6, by - 6, p.dir, true, 'rapid', baseAngle, playerNum));
      this.bullets.push(new Bullet(bx + 6, by + 6, p.dir, true, 'rapid', baseAngle, playerNum));
      this.audioEngine.playSfx("shoot_normal");
    } else if (currentWpn.id === 'shotgun') {
      [-0.3, 0, 0.3].forEach(angleOffset => {
        this.bullets.push(new Bullet(bx, by, p.dir, true, 'spread', baseAngle + angleOffset, playerNum));
      });
      this.audioEngine.playSfx("shoot_spread");
    } else if (currentWpn.id === 'laser') {
      this.bullets.push(new Bullet(bx, by, p.dir, true, 'laser', baseAngle, playerNum));
      this.audioEngine.playSfx("shoot_laser");
    } else if (currentWpn.id === 'ap') {
      this.bullets.push(new Bullet(bx, by, p.dir, true, 'ap', baseAngle, playerNum));
      this.audioEngine.playSfx("shoot_normal");
    } else if (currentWpn.id === 'homing') {
      this.bullets.push(new Bullet(bx, by, p.dir, true, 'homing', baseAngle, playerNum));
      this.audioEngine.playSfx("shoot_normal");
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
        this.particles.createExplosion(e.x + 12, e.y + 12, '#ff3d00', 25);
      });
      this.enemiesOnField = [];
      this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 5);
      this.triggerScreenShake();
      this.audioEngine.playSfx("explosion_big");
    }
  }

  update() {
    if (this.state !== 'PLAYING') return;

    const gridCols = this.map ? this.map.length : 52;
    const worldWidth = gridCols * this.tileSize;
    const worldHeight = gridCols * this.tileSize;

    // 1. 平滑跟隨攝影機 Camera Target Calculation
    if (this.player1 && this.player1.alive) {
      this.camera.targetX = (this.player1.x + 12) - this.canvas.width / 2;
      this.camera.targetY = (this.player1.y + 12) - this.canvas.height / 2;
    }
    this.camera.targetX = Math.max(0, Math.min(worldWidth - this.canvas.width, this.camera.targetX));
    this.camera.targetY = Math.max(0, Math.min(worldHeight - this.canvas.height, this.camera.targetY));

    this.camera.x += (this.camera.targetX - this.camera.x) * 0.1;
    this.camera.y += (this.camera.targetY - this.camera.y) * 0.1;

    // 2. 玩家 1 & 2 物理移動
    [this.player1, this.player2].forEach((p, idx) => {
      if (!p || !p.alive || p.isParalyzed) return;
      p.update();

      let moveSpeed = p.speed;
      // 多元地形交互：泥沼減速 & 加速軌道
      const pTileCol = Math.floor((p.x + 12) / this.tileSize);
      const pTileRow = Math.floor((p.y + 12) / this.tileSize);
      if (this.map && this.map[pTileRow] && this.map[pTileRow][pTileCol]) {
        const curTile = this.map[pTileRow][pTileCol];
        if (curTile === TILE.SAND) moveSpeed *= 0.5;
        else if (curTile === TILE.BOOST) moveSpeed *= 1.7;
        else if (curTile === TILE.LAVA) {
          this.particles.createSparks(p.x + 12, p.y + 12, '#ff4800', 2);
        } else if (curTile === TILE.PORTAL) {
          // 4 角躍遷對角傳送
          p.x = worldWidth - p.x - 24;
          p.y = worldHeight - p.y - 24;
          this.particles.createShockwave(p.x + 12, p.y + 12, '#f72585');
          this.audioEngine.playSfx("time_freeze");
        }
      }

      let dx = 0;
      let dy = 0;

      if (idx === 0) { // P1 Key input
        if (this.controlMode === 'mouse_keyboard' || this.controlMode === 'mouse_only') {
          if (this.keys['KeyW']) { dy -= moveSpeed; p.dir = DIR.UP; }
          if (this.keys['KeyS']) { dy += moveSpeed; p.dir = DIR.DOWN; }
          if (this.keys['KeyA']) { dx -= moveSpeed; p.dir = DIR.LEFT; }
          if (this.keys['KeyD']) { dx += moveSpeed; p.dir = DIR.RIGHT; }
        } else {
          if (this.keys['ArrowUp'] || this.keys['KeyW']) { dy -= moveSpeed; p.dir = DIR.UP; p.turretAngle = null; }
          else if (this.keys['ArrowDown'] || this.keys['KeyS']) { dy += moveSpeed; p.dir = DIR.DOWN; p.turretAngle = null; }
          else if (this.keys['ArrowLeft'] || this.keys['KeyA']) { dx -= moveSpeed; p.dir = DIR.LEFT; p.turretAngle = null; }
          else if (this.keys['ArrowRight'] || this.keys['KeyD']) { dx += moveSpeed; p.dir = DIR.RIGHT; p.turretAngle = null; }
        }
      } else if (idx === 1) { // P2 Key input
        if (this.keys['ArrowUp']) { dy -= moveSpeed; p.dir = DIR.UP; }
        else if (this.keys['ArrowDown']) { dy += moveSpeed; p.dir = DIR.DOWN; }
        else if (this.keys['ArrowLeft']) { dx -= moveSpeed; p.dir = DIR.LEFT; }
        else if (this.keys['ArrowRight']) { dx += moveSpeed; p.dir = DIR.RIGHT; }
      }

      if (dx !== 0 || dy !== 0) {
        let nx = Math.max(0, Math.min(worldWidth - 24, p.x + dx));
        let ny = Math.max(0, Math.min(worldHeight - 24, p.y + dy));
        if (this.canMoveTo(nx, ny, p)) {
          p.x = nx;
          p.y = ny;
        }
      }
    });

    // 連發按鍵
    if (this.isMouseDown && (this.controlMode === 'mouse_keyboard' || this.controlMode === 'mouse_only')) {
      this.playerShoot(1);
    }

    // 3. 生成敵軍
    this.spawnTimer++;
    if (this.spawnTimer > 120 && this.enemiesOnField.length < 6 && this.totalEnemiesToSpawn > 0) {
      this.spawnTimer = 0;
      const spawnCols = [0, Math.floor(gridCols / 2), gridCols - 1];
      const col = spawnCols[Math.floor(Math.random() * spawnCols.length)];

      const currentStg = this.levelManager.currentStage;
      let enemyPool = ['basic', 'basic', 'fast'];
      if (currentStg > 100) enemyPool = ['armor', 'fast', 'power'];
      else if (currentStg > 40) enemyPool = ['basic', 'fast', 'power', 'armor'];

      const type = enemyPool[Math.floor(Math.random() * enemyPool.length)];
      this.enemiesOnField.push(new EnemyTank(col * this.tileSize, 0, type));
      this.totalEnemiesToSpawn--;
    }

    // 4. 更新敵軍
    this.enemiesOnField.forEach(enemy => {
      if (!enemy.alive || enemy.isFrozen) return;
      enemy.update();

      if (Math.random() < 0.02) enemy.dir = Math.floor(Math.random() * 4);
      let nx = enemy.x;
      let ny = enemy.y;
      const actualSpeed = enemy.speed;

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

    // 5. Boss AI (Boss Battle)
    if (this.boss && this.boss.alive && !this.boss.isFrozen) {
      this.boss.update();
      if (Math.random() < 0.05 && this.player1 && this.player1.alive) {
        const dx = (this.player1.x + 12) - (this.boss.x + 48);
        const dy = (this.player1.y + 12) - (this.boss.y + 48);
        const bossAngle = Math.atan2(dy, dx);

        // 巨型彈幕轟炸
        [-0.4, -0.2, 0, 0.2, 0.4].forEach(off => {
          this.bullets.push(new Bullet(this.boss.x + 48, this.boss.y + 48, 0, false, 'boss_bullet', bossAngle + off));
        });
        this.audioEngine.playSfx("shoot_laser");
      }
    }

    // 6. 子彈更新與碰撞
    const subMapRows = this.subMap ? this.subMap.length : 104;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update();

      if (b.x < 0 || b.x > worldWidth || b.y < 0 || b.y > worldHeight) {
        b.alive = false;
        this.bullets.splice(i, 1);
        continue;
      }

      const subC = Math.floor(b.x / this.subTileSize);
      const subR = Math.floor(b.y / this.subTileSize);

      if (subR >= 0 && subR < subMapRows && subC >= 0 && subC < subMapRows && this.subMap && this.subMap[subR]) {
        const subTile = this.subMap[subR][subC];

        if (subTile === TILE.BRICK) {
          this.subMap[subR][subC] = TILE.EMPTY;
          b.alive = false;
          this.particles.createExplosion(b.x, b.y, '#d84315', 6);
          this.audioEngine.playSfx("hit_brick");
          this.bullets.splice(i, 1);
          continue;
        } else if (subTile === TILE.STEEL) {
          if (b.weaponType === 'laser' || b.weaponType === 'ap' || this.weaponsManager.isActive(12)) {
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

      // 子彈擊中對象
      if (b.isPlayer) {
        if (this.boss && this.boss.alive && this.checkOverlap(b.x - 3, b.y - 3, 6, 6, this.boss.x, this.boss.y, 96, 96)) {
          b.alive = false;
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
          }
          this.bullets.splice(i, 1);
          continue;
        }

        for (let j = this.enemiesOnField.length - 1; j >= 0; j--) {
          const enemy = this.enemiesOnField[j];
          if (enemy.alive && this.checkOverlap(b.x - 3, b.y - 3, 6, 6, enemy.x, enemy.y, 24, 24)) {
            b.alive = false;
            enemy.hp--;
            this.particles.createExplosion(b.x, b.y, '#ff3d00', 8);

            if (enemy.hp <= 0) {
              enemy.alive = false;
              this.score += 200;
              this.enemiesOnField.splice(j, 1);
              this.enemiesRemaining--;
              this.audioEngine.playSfx("explosion_tank");
            }
            this.bullets.splice(i, 1);
            break;
          }
        }
      } else {
        // 敵彈打玩家
        [this.player1, this.player2].forEach(p => {
          if (p && p.alive && this.checkOverlap(b.x - 3, b.y - 3, 6, 6, p.x, p.y, 24, 24)) {
            b.alive = false;
            if (p.isInvulnerable || p.hasShield) {
              this.audioEngine.playSfx("hit_steel");
            } else {
              this.particles.createExplosion(p.x + 12, p.y + 12, '#ff1744', 20);
              this.audioEngine.playSfx("explosion_tank");
              if (p.playerNum === 1) {
                this.lives1--;
                if (this.lives1 > 0) p.respawn(21 * this.tileSize, 37 * this.tileSize);
                else p.alive = false;
              } else {
                this.lives2--;
                if (this.lives2 > 0) p.respawn(29 * this.tileSize, 37 * this.tileSize);
                else p.alive = false;
              }
              if (this.lives1 <= 0 && (this.gameMode === '1P' || (this.lives2 <= 0))) {
                this.gameOver();
              }
            }
          }
        });
      }
    }

    // 7. 更新粒子
    this.particles.update();

    // 8. 勝利條件判斷
    if (this.enemiesRemaining <= 0 && this.enemiesOnField.length === 0 && (!this.boss || !this.boss.alive)) {
      this.victory();
    }

    // 9. 更新 UI 狀態回調
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

  canMoveTo(x, y, entity) {
    const gridCols = this.map ? this.map.length : 52;
    const subMapRows = this.subMap ? this.subMap.length : 104;

    if (x < 0 || x + 24 > gridCols * this.tileSize || y < 0 || y + 24 > gridCols * this.tileSize) {
      return false;
    }

    const subC1 = Math.floor(x / this.subTileSize);
    const subC2 = Math.floor((x + 23) / this.subTileSize);
    const subR1 = Math.floor(y / this.subTileSize);
    const subR2 = Math.floor((y + 23) / this.subTileSize);

    for (let r = subR1; r <= subR2; r++) {
      for (let c = subC1; c <= subC2; c++) {
        if (r >= 0 && r < subMapRows && c >= 0 && c < subMapRows && this.subMap && this.subMap[r]) {
          const t = this.subMap[r][c];
          if (t === TILE.BRICK || t === TILE.STEEL || t === TILE.WATER || t === TILE.BASE) {
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

  victory() {
    this.state = 'VICTORY';
    this.audioEngine.stopBgm();
    this.audioEngine.playSfx("stage_clear");
    if (this.uiCallbacks.onStageClear) {
      this.uiCallbacks.onStageClear({
        stage: this.levelManager.currentStage,
        score: this.score,
        killsP1: this.stageKillsP1,
        killsP2: this.stageKillsP2
      });
    }
  }

  gameOver() {
    this.state = 'GAME_OVER';
    this.audioEngine.stopBgm();
    this.audioEngine.playSfx("game_over");
    if (this.uiCallbacks.onGameOver) {
      this.uiCallbacks.onGameOver({ score: this.score });
    }
  }

  // ===== 60FPS 平滑跟隨繪製 Render Loop =====
  render() {
    this.ctx.fillStyle = '#07090e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (!this.map) return;

    this.ctx.save();
    // 平滑攝影機位移 Translation
    this.ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));

    const gridCols = this.map.length;
    const subMapRows = this.subMap ? this.subMap.length : 104;

    // 1. 繪製 52x52 地形與多元元素 (SAND, BOOST, LAVA, PORTAL)
    for (let r = 0; r < subMapRows; r++) {
      if (!this.subMap[r]) continue;
      for (let c = 0; c < subMapRows; c++) {
        const t = this.subMap[r][c];
        const px = c * this.subTileSize;
        const py = r * this.subTileSize;

        if (t === TILE.BRICK) {
          this.ctx.fillStyle = SNES_PALETTE.BRICK_MAIN;
          this.ctx.fillRect(px, py, this.subTileSize, this.subTileSize);
          this.ctx.fillStyle = SNES_PALETTE.BRICK_DARK;
          this.ctx.fillRect(px, py + 10, 12, 2);
        } else if (t === TILE.STEEL) {
          this.ctx.fillStyle = SNES_PALETTE.STEEL_MAIN;
          this.ctx.fillRect(px, py, this.subTileSize, this.subTileSize);
          this.ctx.fillStyle = SNES_PALETTE.STEEL_HIGHLIGHT;
          this.ctx.fillRect(px + 2, py + 2, 3, 3);
        } else if (t === TILE.WATER) {
          this.ctx.fillStyle = SNES_PALETTE.WATER_SURFACE;
          this.ctx.fillRect(px, py, this.subTileSize, this.subTileSize);
        } else if (t === TILE.ICE) {
          this.ctx.fillStyle = SNES_PALETTE.ICE_MAIN;
          this.ctx.fillRect(px, py, this.subTileSize, this.subTileSize);
        } else if (t === TILE.SAND) {
          this.ctx.fillStyle = SNES_PALETTE.SAND_MAIN;
          this.ctx.fillRect(px, py, this.subTileSize, this.subTileSize);
        } else if (t === TILE.BOOST) {
          this.ctx.fillStyle = SNES_PALETTE.BOOST_MAIN;
          this.ctx.fillRect(px, py, this.subTileSize, this.subTileSize);
        } else if (t === TILE.LAVA) {
          this.ctx.fillStyle = SNES_PALETTE.LAVA_MAIN;
          this.ctx.fillRect(px, py, this.subTileSize, this.subTileSize);
        } else if (t === TILE.PORTAL) {
          this.ctx.fillStyle = SNES_PALETTE.PORTAL_MAIN;
          this.ctx.fillRect(px, py, this.subTileSize, this.subTileSize);
          this.ctx.fillStyle = SNES_PALETTE.PORTAL_GLOW;
          this.ctx.fillRect(px + 3, py + 3, 6, 6);
        }
      }
    }

    // 2. 繪製 鷹徽基地 Eagle Base
    if (this.eagleBase) this.eagleBase.render(this.ctx);

    // 3. 繪製 Boss
    if (this.boss && this.boss.alive) this.boss.render(this.ctx);

    // 4. 繪製 玩家 1 & 2
    if (this.player1 && this.player1.alive) this.player1.render(this.ctx);
    if (this.player2 && this.player2.alive) this.player2.render(this.ctx);

    // 5. 繪製 敵軍
    this.enemiesOnField.forEach(e => { if (e.alive) e.render(this.ctx); });

    // 6. 繪製 子彈
    this.bullets.forEach(b => { if (b.alive) b.render(this.ctx); });

    // 7. 繪製 粒子系統與天氣
    this.particles.render(this.ctx);

    // 8. 繪製 叢林遮蔽層 (TREES)
    for (let r = 0; r < subMapRows; r++) {
      if (!this.subMap[r]) continue;
      for (let c = 0; c < subMapRows; c++) {
        if (this.subMap[r][c] === TILE.TREES) {
          this.ctx.fillStyle = 'rgba(46, 125, 50, 0.85)';
          this.ctx.fillRect(c * this.subTileSize, r * this.subTileSize, this.subTileSize, this.subTileSize);
        }
      }
    }

    this.ctx.restore();
  }
}
