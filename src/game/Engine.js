/* =========================================================
   Engine.js - 主遊戲 Canvas 60FPS 視窗滿版與攝影機引擎
   (支援 64px Tile、三層地圖、五期主題、52x52 大地圖、平滑攝影機、2.5D Mode 7、Boss 戰與天氣)
   ========================================================= */

import { TILE, SNES_PALETTE, MapDataGenerator } from './MapData.js';
import { TILE_EXT } from './MapDataJSON.js';
import { DIR, Tank, EnemyTank, ChaserTank, PatrolTank, KamikazeTank, Bullet, PowerUpItem, DestructibleProp, LandMine, EagleBase, stepInDirection } from './Entities.js';
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

    this.tileSize = 64;     // 大格 64px（升級自 24px）
    this.subTileSize = 32;   // 1/2 微觀小格 32px（升級自 12px）

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
    this.props = [];        // 可破壞物件（油桶/樹樁/小屋）
    this.mines = [];        // 地雷
    this.particles = new ParticleSystem();

    // 三層地圖
    this.mapFloor    = [];  // 地面層（主題底材）
    this.mapObstacle = [];  // 障礙層（碰撞用）
    this.mapRoof     = [];  // 屋頂裝飾層
    this.currentTheme = 'VILLAGE'; // 五期主題名稱
    this._waterAnim = 0;    // 水域動畫計數器
    this._lavaAnim  = 0;    // 熔岩動畫計數器

    this.player1 = null;
    this.player2 = null;
    this.eagleBase = null;
    this.boss = null;

    // 特殊武器 (E 鍵) 冷卻與輪替狀態，避免每幀重複觸發
    this.specialWeaponCooldown = { 1: 0, 2: 0 };
    this.specialWeaponToggle = { 1: false, 2: false };

    // 預設載入 52x52 大地圖
    this.map = this.levelManager.loadStage(1, true);
    this.subMap = MapDataGenerator.convertToSubMap(this.map);

    this.spawnTimer = 0;
    this.keys = {};
    this.controlMode = 'mouse_keyboard';
    this.mouseX = window.innerWidth / 2;
    this.mouseY = window.innerHeight / 2;
    this.isMouseDown = false;

    // 暫停狀態
    this.isPaused = false;

    // ===== 可自訂快捷鍵綁定系統 =====
    // 預設綁定，可由外部 (main.js KeyBinding Manager) 覆蓋
    this.keyBindings = {
      shoot: 'Space',
      shootAlt: 'KeyZ',
      specialWeapon: 'KeyE',
      specialTech: 'KeyF',
      weaponWheel: 'KeyQ',
      dash: 'ShiftLeft',
      dashAlt: 'ShiftRight',
      pause: 'KeyP',
      mute: 'KeyM',
      moveUp: 'KeyW',
      moveDown: 'KeyS',
      moveLeft: 'KeyA',
      moveRight: 'KeyD',
      arrowUp: 'ArrowUp',
      arrowDown: 'ArrowDown',
      arrowLeft: 'ArrowLeft',
      arrowRight: 'ArrowRight',
      p2shoot: 'KeyM_P2',      // P2 使用不同按鍵
      p2dash: 'KeyN',
      weapon1: 'Digit1',
      weapon2: 'Digit2',
      weapon3: 'Digit3',
      weapon4: 'Digit4',
      weapon5: 'Digit5',
      weapon6: 'Digit6',
    };

    // 外部回調鉤子（供 main.js 注入）
    this.onToggleWeaponWheel = null;
    this.onTogglePause = null;
    this.onToggleMute = null;

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
      const kb = this.keyBindings;
      // 阻止方向鍵/空白鍵捲動頁面
      if ([kb.arrowUp, kb.arrowDown, kb.arrowLeft, kb.arrowRight, 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      this.keys[e.code] = true;

      // ===== 暫停（PLAYING 或 PAUSED 皆可切換）=====
      if (e.code === kb.pause) {
        this.togglePause();
        return;
      }

      // ===== 靜音切換（任何狀態可用）=====
      if (e.code === kb.mute) {
        if (this.onToggleMute) this.onToggleMute();
        return;
      }

      // ===== 武器輪盤（Q 或 Tab，任何非 PLAYING 狀態也可呼出）=====
      if (e.code === kb.weaponWheel || e.code === 'Tab') {
        e.preventDefault();
        if (this.onToggleWeaponWheel) this.onToggleWeaponWheel();
        return;
      }

      if (this.state === 'PLAYING' && !this.isPaused) {
        // 射擊
        if (e.code === kb.shoot || e.code === kb.shootAlt) this.playerShoot(1);
        // 特殊武器 E
        if (e.code === kb.specialWeapon) this.useSpecialWeapon(1);
        // 特殊技 F（目前映射到 useSpecialWeapon，未來可分開）
        if (e.code === kb.specialTech) this.useSpecialTech(1);
        // 疾衝 Shift
        if (e.code === kb.dash || e.code === kb.dashAlt) this.playerDash(1);

        if (this.gameMode === '2P') {
          if (e.code === 'Numpad0' || e.code === 'Enter') this.playerShoot(2);
          if (e.code === kb.p2dash || e.code === 'NumpadDecimal') this.playerDash(2);
        }
      }
    });

    window.addEventListener('keyup', e => {
      const kb = this.keyBindings;
      if ([kb.arrowUp, kb.arrowDown, kb.arrowLeft, kb.arrowRight, 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      this.keys[e.code] = false;
    });

    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    this.canvas.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;

      // 轉換為世界座標算角度（僅在 PLAYING 且非暫停時更新）
      if (this.player1 && this.player1.alive &&
          (this.controlMode === 'mouse_keyboard' || this.controlMode === 'mouse_only') &&
          this.state === 'PLAYING') {
        const worldMouseX = this.mouseX + this.camera.x;
        const worldMouseY = this.mouseY + this.camera.y;
        const dx = worldMouseX - (this.player1.x + 12);
        const dy = worldMouseY - (this.player1.y + 12);
        this.player1.turretAngle = Math.atan2(dy, dx);
      }
    });

    this.canvas.addEventListener('mousedown', e => {
      // 僅在 PLAYING 且非暫停狀態才處理
      if (this.state !== 'PLAYING' || this.isPaused) return;
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

  // ===== 暫停/繼續遊戲 =====
  togglePause() {
    if (this.state !== 'PLAYING' && !this.isPaused) return;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.audioEngine.stopBgm();
    } else {
      this.audioEngine.startBgm();
    }
    if (this.onTogglePause) this.onTogglePause(this.isPaused);
  }

  // ===== 特殊技（F 鍵，與特殊武器 E 分開，未來可擴充）=====
  useSpecialTech(playerNum = 1) {
    // 目前實作：觸發衝擊波 + 粒子效果，未來可連接新技能
    const p = playerNum === 1 ? this.player1 : this.player2;
    if (p && p.alive) {
      this.particles.createShockwave(p.x + 12, p.y + 12, '#f72585');
      this.audioEngine.playSfx('shield_active');
    }
  }

  playerDash(playerNum = 1) {
    const p = playerNum === 1 ? this.player1 : this.player2;
    if (p && p.dash()) {
      this.audioEngine.playSfx("shield_active");
      this.particles.createShockwave(p.x + 12, p.y + 12, p.playerNum === 2 ? '#00e5ff' : '#76ff03');
    }
  }

  async startStage(stageNum) {
    // 非同步載入 JSON 地圖（滿八枸地圖群即回覆程序化生成）
    await this.levelManager.preloadJSON(stageNum);
    this.map = this.levelManager.loadStage(stageNum, false); // 26x26 核心地圖

    // 載入三層地圖資料
    this.mapFloor    = this.levelManager.currentFloor    || [];
    this.mapObstacle = this.levelManager.currentObstacle || this.map;
    this.mapRoof     = this.levelManager.currentRoof     || [];
    this.currentTheme = this.levelManager.currentTheme || 'VILLAGE';

    // subMap 用 obstacle 層生成（碰撞用）
    this.subMap = MapDataGenerator.convertToSubMap(this.mapObstacle);

    this.score = this.score || 0;
    if (this.lives1 <= 0) this.lives1 = 1;
    if (this.gameMode === '2P' && this.lives2 <= 0) this.lives2 = 1;

    this.enemiesRemaining = 20;
    this.totalEnemiesToSpawn = 20;
    this.enemiesOnField = [];
    this.bullets = [];
    this.powerUps = [];
    this.props = [];
    this.mines = [];

    this.stageKillsP1 = { basic: 0, fast: 0, power: 0, armor: 0, chaser: 0, patrol: 0, kamikaze: 0 };
    this.stageKillsP2 = { basic: 0, fast: 0, power: 0, armor: 0, chaser: 0, patrol: 0, kamikaze: 0 };

    // 自動從 obstacle 層讀取可破壞物件與地雷
    const MAP = this.mapObstacle;
    if (MAP && MAP.length > 0) {
      for (let r = 0; r < MAP.length; r++) {
        if (!MAP[r]) continue;
        for (let c = 0; c < MAP[r].length; c++) {
          const t = MAP[r][c];
          const px = c * this.tileSize;
          const py = r * this.tileSize;
          if (t === TILE_EXT.BARREL) {
            this.props.push(new DestructibleProp(px, py, 'barrel'));
            MAP[r][c] = 0;
          } else if (t === TILE_EXT.STUMP) {
            this.props.push(new DestructibleProp(px, py, 'stump'));
            MAP[r][c] = 0;
          } else if (t === TILE_EXT.SHACK) {
            this.props.push(new DestructibleProp(px, py, 'shack'));
            MAP[r][c] = 0;
          } else if (t === TILE_EXT.MINE) {
            this.mines.push(new LandMine(px, py));
            MAP[r][c] = 0;
          }
        }
      }
      // 重新生成 subMap
      this.subMap = MapDataGenerator.convertToSubMap(MAP);
    }

    // 給地圖 26x26，玩家與基地在中間區
    const gridCols = this.map.length || 26; // 26
    const offsetC = 0;
    const offsetR = 0;

    this.player1 = new Tank((8 + offsetC) * this.tileSize, (22 + offsetR) * this.tileSize, true, 1);
    this.player2 = this.gameMode === '2P' ? new Tank((16 + offsetC) * this.tileSize, (22 + offsetR) * this.tileSize, true, 2) : null;
    this.eagleBase = new EagleBase((12 + offsetC) * this.tileSize, (23 + offsetR) * this.tileSize);

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
        bossMaxHp: this.boss ? this.boss.maxHp : 0,
        theme: this.currentTheme,
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

  // 特殊武器（E 鍵）：時間靜止與炸彈清屏輪流觸發，並各自附帶冷卻避免連續濫用
  useSpecialWeapon(playerNum = 1) {
    if (this.specialWeaponCooldown[playerNum] > 0) return;
    const useBomb = this.specialWeaponToggle[playerNum];

    if (!useBomb && this.weaponsManager.isActive(18)) {
      this.enemiesOnField.forEach(e => { e.isFrozen = true; e.freezeTimer = 300; });
      if (this.boss) { this.boss.isFrozen = true; this.boss.freezeTimer = 180; }
      this.audioEngine.playSfx("time_freeze");
      this.specialWeaponCooldown[playerNum] = 600; // 10 秒冷卻
      this.specialWeaponToggle[playerNum] = true;
    } else if (useBomb && this.weaponsManager.isActive(21)) {
      this.enemiesOnField.forEach(e => {
        e.alive = false;
        this.particles.createExplosion(e.x + 12, e.y + 12, '#ff3d00', 25);
      });
      this.enemiesOnField = [];
      this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 5);
      this.triggerScreenShake();
      this.audioEngine.playSfx("explosion_big");
      this.specialWeaponCooldown[playerNum] = 900; // 15 秒冷卻
      this.specialWeaponToggle[playerNum] = false;
    }
  }

  // 玩家受傷共用邏輯：扣血、重生或陣亡，並於雙方皆陣亡時觸發遊戲結束
  damagePlayer(tank, respawnX, respawnY) {
    if (tank.playerNum === 1) {
      this.lives1--;
      if (this.lives1 > 0) tank.respawn(respawnX, respawnY);
      else tank.alive = false;
    } else {
      this.lives2--;
      if (this.lives2 > 0) tank.respawn(respawnX, respawnY);
      else tank.alive = false;
    }
    this.triggerScreenShake();
    if (this.lives1 <= 0 && (this.gameMode === '1P' || this.lives2 <= 0)) {
      this.gameOver();
    }
  }

  update() {
    if (this.state !== 'PLAYING' || this.isPaused) return;

    if (this.specialWeaponCooldown[1] > 0) this.specialWeaponCooldown[1]--;
    if (this.specialWeaponCooldown[2] > 0) this.specialWeaponCooldown[2]--;

    // 世界大小以 mapObstacle（26x26）× 64px 計算
    const obstMap = this.mapObstacle && this.mapObstacle.length > 0 ? this.mapObstacle : this.map;
    const gridCols = obstMap ? obstMap.length : 26;
    const worldWidth  = gridCols * this.tileSize;
    const worldHeight = gridCols * this.tileSize;

    // 1. 平滑跟隨攝影機（64px 坦克中心 = x+32）
    const HALF = this.tileSize / 2; // 32
    if (this.player1 && this.player1.alive) {
      this.camera.targetX = (this.player1.x + HALF) - this.canvas.width  / 2;
      this.camera.targetY = (this.player1.y + HALF) - this.canvas.height / 2;
    }
    this.camera.targetX = Math.max(0, Math.min(Math.max(0, worldWidth  - this.canvas.width),  this.camera.targetX));
    this.camera.targetY = Math.max(0, Math.min(Math.max(0, worldHeight - this.canvas.height), this.camera.targetY));

    this.camera.x += (this.camera.targetX - this.camera.x) * 0.12;
    this.camera.y += (this.camera.targetY - this.camera.y) * 0.12;

    // 2. 玩家 1 & 2 物理移動
    [this.player1, this.player2].forEach((p, idx) => {
      if (!p || !p.alive || p.isParalyzed) return;
      p.update();

      let moveSpeed = p.speed;
      // 多元地形交互：泥沼減速 & 加速軌道（64px 坦克中心 = x+32）
      const pTileCol = Math.floor((p.x + HALF) / this.tileSize);
      const pTileRow = Math.floor((p.y + HALF) / this.tileSize);
      const curMap = this.mapObstacle && this.mapObstacle.length > 0 ? this.mapObstacle : this.map;
      if (curMap && curMap[pTileRow] && curMap[pTileRow][pTileCol] !== undefined) {
        const curTile = curMap[pTileRow][pTileCol];
        if (curTile === TILE.SAND) moveSpeed *= 0.5;
        else if (curTile === TILE.BOOST) moveSpeed *= 1.7;
        else if (curTile === TILE.LAVA) {
          this.particles.createSparks(p.x + HALF, p.y + HALF, '#ff4800', 2);
        } else if (curTile === TILE.PORTAL) {
          p.x = worldWidth - p.x - this.tileSize;
          p.y = worldHeight - p.y - this.tileSize;
          this.particles.createShockwave(p.x + HALF, p.y + HALF, '#f72585');
          this.audioEngine.playSfx("time_freeze");
        }
      }

      let dx = 0;
      let dy = 0;

      if (idx === 0) { // P1 Key input
        const kb = this.keyBindings;
        if (this.controlMode === 'mouse_keyboard' || this.controlMode === 'mouse_only') {
          if (this.keys[kb.moveUp])    { dy -= moveSpeed; p.dir = DIR.UP; }
          if (this.keys[kb.moveDown])  { dy += moveSpeed; p.dir = DIR.DOWN; }
          if (this.keys[kb.moveLeft])  { dx -= moveSpeed; p.dir = DIR.LEFT; }
          if (this.keys[kb.moveRight]) { dx += moveSpeed; p.dir = DIR.RIGHT; }
        } else {
          if (this.keys[kb.arrowUp]   || this.keys[kb.moveUp])    { dy -= moveSpeed; p.dir = DIR.UP;    p.turretAngle = null; }
          else if (this.keys[kb.arrowDown]  || this.keys[kb.moveDown])  { dy += moveSpeed; p.dir = DIR.DOWN;  p.turretAngle = null; }
          else if (this.keys[kb.arrowLeft]  || this.keys[kb.moveLeft])  { dx -= moveSpeed; p.dir = DIR.LEFT;  p.turretAngle = null; }
          else if (this.keys[kb.arrowRight] || this.keys[kb.moveRight]) { dx += moveSpeed; p.dir = DIR.RIGHT; p.turretAngle = null; }
        }
      } else if (idx === 1) { // P2 Key input
        if (this.keys['ArrowUp']) { dy -= moveSpeed; p.dir = DIR.UP; }
        else if (this.keys['ArrowDown']) { dy += moveSpeed; p.dir = DIR.DOWN; }
        else if (this.keys['ArrowLeft']) { dx -= moveSpeed; p.dir = DIR.LEFT; }
        else if (this.keys['ArrowRight']) { dx += moveSpeed; p.dir = DIR.RIGHT; }
      }

      if (dx !== 0 || dy !== 0) {
        const pW = p.width || this.tileSize;
        const pH = p.height || this.tileSize;
        let nx = Math.max(0, Math.min(worldWidth  - pW, p.x + dx));
        let ny = Math.max(0, Math.min(worldHeight - pH, p.y + dy));
        if (this.canMoveTo(nx, ny, p)) {
          p.x = nx;
          p.y = ny;
        }
      }
    });

    // 連發按鍵（僅在 PLAYING 且非暫停時處理）
    if (this.isMouseDown && !this.isPaused &&
        (this.controlMode === 'mouse_keyboard' || this.controlMode === 'mouse_only')) {
      this.playerShoot(1);
    }

    // 3. 生成敵軍
    this.spawnTimer++;
    if (this.spawnTimer > 120 && this.enemiesOnField.length < 6 && this.totalEnemiesToSpawn > 0) {
      this.spawnTimer = 0;
      const spawnCols = [0, Math.floor(gridCols / 2), gridCols - 1];
      const col = spawnCols[Math.floor(Math.random() * spawnCols.length)];

      const currentStg = this.levelManager.currentStage;
      // 五期主題的敵人池（包含新類型）
      let enemyPool;
      if (currentStg > 160) {
        // 熊岩古寺：重装 + 自爆 + 追蹤
        enemyPool = ['armor', 'armor', 'fast', 'power', 'kamikaze', 'chaser'];
      } else if (currentStg > 120) {
        // 燙岫工廠：巡邏 + 重装 + 追蹤
        enemyPool = ['armor', 'fast', 'power', 'patrol', 'patrol', 'chaser'];
      } else if (currentStg > 80) {
        // 雪原冰地：巡邏 + 雑兵 + 追蹤
        enemyPool = ['basic', 'fast', 'power', 'armor', 'patrol', 'chaser'];
      } else if (currentStg > 40) {
        // 廢墓裂基：巡邏 + 自爆 + 雑兵
        enemyPool = ['basic', 'fast', 'power', 'armor', 'patrol', 'kamikaze'];
      } else {
        // 戰祸村莊：基本 + 流彎
        enemyPool = ['basic', 'basic', 'fast'];
      }

      const type = enemyPool[Math.floor(Math.random() * enemyPool.length)];
      let newEnemy;
      if (type === 'chaser') {
        newEnemy = new ChaserTank(col * this.tileSize, 0);
      } else if (type === 'patrol') {
        newEnemy = new PatrolTank(col * this.tileSize, 0);
      } else if (type === 'kamikaze') {
        newEnemy = new KamikazeTank(col * this.tileSize, 0);
      } else {
        newEnemy = new EnemyTank(col * this.tileSize, 0, type);
      }
      this.enemiesOnField.push(newEnemy);
      this.totalEnemiesToSpawn--;
    }

    // 4. 更新敵軍
    this.enemiesOnField.forEach(enemy => {
      if (!enemy.alive || enemy.isFrozen) return;
      // 特化 AI：追蹤型
      if (enemy.isChaser && this.player1 && this.player1.alive) {
        enemy.updateChaser(this.player1, this);
      } else if (enemy.isPatrol) {
        enemy.updatePatrol(this);
      } else if (enemy.isKamikaze && this.player1 && this.player1.alive) {
        enemy.updateKamikaze(this.player1, this);
      } else {
        // 一般敵人
        enemy.update();
        if (Math.random() < 0.02) enemy.dir = Math.floor(Math.random() * 4);
        const { x: nx, y: ny } = stepInDirection(enemy.x, enemy.y, enemy.dir, enemy.speed);

        if (this.canMoveTo(nx, ny, enemy)) {
          enemy.x = nx;
          enemy.y = ny;
        } else {
          enemy.dir = Math.floor(Math.random() * 4);
        }
      }

      // 敵人射擊
      const halfSize = (enemy.width || 64) / 2;
      if (enemy.cooldown <= 0 && Math.random() < 0.03) {
        enemy.cooldown = 45;
        this.bullets.push(new Bullet(enemy.x + halfSize, enemy.y + halfSize, enemy.dir, false, 'normal'));
      }
    });

    // 4b. 可破壞物件更新
    this.props.forEach(prop => prop.update && prop.update());

    // 4c. 地雷觸發判斷
    const allTanks = [this.player1, this.player2, ...this.enemiesOnField].filter(t => t && t.alive);
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const mine = this.mines[i];
      if (!mine.alive) { this.mines.splice(i, 1); continue; }
      for (const tank of allTanks) {
        if (this.checkOverlap(tank.x, tank.y, tank.width || 64, tank.height || 64,
                              mine.x, mine.y, 32, 32)) {
          mine.alive = false;
          this.particles.createExplosion(mine.x + 16, mine.y + 16, '#ff4800', 20);
          this.audioEngine.playSfx('explosion_big');
          if (tank.isPlayer && !tank.hasShield && !tank.isInvulnerable) {
            // 地雷傷害玩家
            this.damagePlayer(tank, tank.playerNum === 1 ? 8 * this.tileSize : 16 * this.tileSize, 22 * this.tileSize);
          } else if (!tank.isPlayer) {
            tank.alive = false;
            this.score += 100;
            this.enemiesOnField = this.enemiesOnField.filter(e => e.alive);
            this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);
          }
          this.mines.splice(i, 1);
          break;
        }
      }
    }

    // 4d. 道具拾取判斷 (PowerUps)
    [this.player1, this.player2].forEach(p => {
      if (!p || !p.alive) return;
      for (let i = this.powerUps.length - 1; i >= 0; i--) {
        const item = this.powerUps[i];
        if (this.checkOverlap(p.x, p.y, p.width || 64, p.height || 64, item.x, item.y, item.width || 64, item.height || 64)) {
          this.applyPowerUp(p, item.type);
          this.powerUps.splice(i, 1);
          this.audioEngine.playSfx('menu_start'); // 或者如果有 powerup 音效
        }
      }
    });

    // 5. Boss AI (Boss Battle)
    if (this.boss && this.boss.alive && !this.boss.isFrozen) {
      const bulletCountBefore = this.bullets.length;
      this.boss.update(this.player1, this.player2, this.bullets, this.particles);
      if (this.bullets.length > bulletCountBefore) {
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
          if (enemy.alive && this.checkOverlap(b.x - 3, b.y - 3, 6, 6, enemy.x, enemy.y, enemy.width || 64, enemy.height || 64)) {
            b.alive = false;
            enemy.hp--;
            this.particles.createExplosion(b.x, b.y, '#ff3d00', 8);

            if (enemy.hp <= 0) {
              enemy.alive = false;
              this.score += 200;

              const killer = b.shooterPlayerNum === 2 ? this.stageKillsP2 : this.stageKillsP1;
              if (killer && killer[enemy.enemyType] !== undefined) killer[enemy.enemyType]++;

              // 15% 機率掉落道具
              if (Math.random() < 0.15) {
                const types = ['star', 'shield', 'freeze', 'bomb', 'clock', 'base_wall', 'life', 'laser', 'coin'];
                const type = types[Math.floor(Math.random() * types.length)];
                this.powerUps.push(new PowerUpItem(enemy.x, enemy.y, type));
              }

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
          if (p && p.alive && this.checkOverlap(b.x - 3, b.y - 3, 6, 6, p.x, p.y, p.width || 64, p.height || 64)) {
            b.alive = false;
            if (p.isInvulnerable || p.hasShield) {
              this.audioEngine.playSfx("hit_steel");
            } else {
              this.particles.createExplosion(p.x + 12, p.y + 12, '#ff1744', 20);
              this.audioEngine.playSfx("explosion_tank");
              this.damagePlayer(p, p.playerNum === 1 ? 21 * this.tileSize : 29 * this.tileSize, 37 * this.tileSize);
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
    const w = (entity && entity.width) || this.tileSize;
    const h = (entity && entity.height) || this.tileSize;

    if (x < 0 || x + w > gridCols * this.tileSize || y < 0 || y + h > gridCols * this.tileSize) {
      return false;
    }

    const subC1 = Math.floor(x / this.subTileSize);
    const subC2 = Math.floor((x + w - 1) / this.subTileSize);
    const subR1 = Math.floor(y / this.subTileSize);
    const subR2 = Math.floor((y + h - 1) / this.subTileSize);

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

  applyPowerUp(player, type) {
    this.score += 500;
    if (type === 'star') {
      player.starLevel = Math.min(4, player.starLevel + 1);
    } else if (type === 'shield') {
      player.hasShield = true;
      player.shieldTimer = 600; // 10 秒
    } else if (type === 'freeze' || type === 'clock') {
      this.enemiesOnField.forEach(e => { e.isFrozen = true; e.freezeTimer = 600; });
    } else if (type === 'bomb') {
      this.enemiesOnField.forEach(e => {
        this.particles.createExplosion(e.x + 32, e.y + 32, '#ff3d00', 20);
        e.alive = false;
        this.score += 200;
        this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);
      });
      this.enemiesOnField = [];
      this.audioEngine.playSfx("explosion_big");
    } else if (type === 'base_wall') {
      // 將基地外圍變為鋼鐵
      const coords = [[23,11],[23,12],[23,13],[23,14],[24,11],[24,14],[25,11],[25,14]];
      coords.forEach(([r, c]) => {
        if (this.subMap[r] && this.subMap[r][c] !== undefined) {
          this.subMap[r][c] = 2; // TILE.STEEL
        }
      });
    } else if (type === 'life') {
      if (player.playerNum === 1) this.lives1++; else this.lives2++;
    } else if (type === 'laser') {
      this.weaponsManager.selectWeaponIndex(4); // wheelWeapons[4] = 貫穿雷射
      if (this.uiCallbacks.onWeaponChange) this.uiCallbacks.onWeaponChange(4);
    } else if (type === 'coin') {
      this.score += 1000;
    }
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
      this.uiCallbacks.onGameOver({
        stage: this.levelManager.currentStage,
        score: this.score,
        killsP1: this.stageKillsP1,
        killsP2: this.stageKillsP2
      });
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

    // 只繪製攝影機視野內（含 1 格緩衝）的地形範圍，避免每幀掃描整張大地圖
    const viewCol1 = Math.max(0, Math.floor(this.camera.x / this.subTileSize) - 1);
    const viewCol2 = Math.min(subMapRows, Math.ceil((this.camera.x + this.canvas.width) / this.subTileSize) + 1);
    const viewRow1 = Math.max(0, Math.floor(this.camera.y / this.subTileSize) - 1);
    const viewRow2 = Math.min(subMapRows, Math.ceil((this.camera.y + this.canvas.height) / this.subTileSize) + 1);

    // 1. 繪製 52x52 地形與多元元素 (SAND, BOOST, LAVA, PORTAL)
    for (let r = viewRow1; r < viewRow2; r++) {
      if (!this.subMap[r]) continue;
      for (let c = viewCol1; c < viewCol2; c++) {
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

    // 4.5 繪製 道具與場景物件
    this.powerUps.forEach(item => { if (item.alive) item.render(this.ctx); });
    this.mines.forEach(mine => { if (mine.alive) mine.render(this.ctx); });
    this.props.forEach(prop => { if (prop.alive) prop.render(this.ctx); });

    // 5. 繪製 敵軍
    this.enemiesOnField.forEach(e => { if (e.alive) e.render(this.ctx); });

    // 6. 繪製 子彈
    this.bullets.forEach(b => { if (b.alive) b.render(this.ctx); });

    // 7. 繪製 粒子系統與天氣
    this.particles.render(this.ctx);

    // 8. 繪製 叢林遮蔽層 (TREES)
    for (let r = viewRow1; r < viewRow2; r++) {
      if (!this.subMap[r]) continue;
      for (let c = viewCol1; c < viewCol2; c++) {
        if (this.subMap[r][c] === TILE.TREES) {
          this.ctx.fillStyle = 'rgba(46, 125, 50, 0.85)';
          this.ctx.fillRect(c * this.subTileSize, r * this.subTileSize, this.subTileSize, this.subTileSize);
        }
      }
    }

    this.ctx.restore();
  }
}
