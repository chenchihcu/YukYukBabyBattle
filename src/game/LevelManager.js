import { MapDataGenerator, TILE, MAP_SIZE, EXTENDED_MAP_SIZE } from './MapData.js';
import { TILE_EXT, getThemeForStage } from './MapDataJSON.js';

export class LevelManager {
  constructor() {
    this.currentStage = 1;
    this.maxStages = 200;
    this.currentMap = [];
    this.customMap = null;
    this.isExtendedMode = true;

    // JSON 地圖快取（四期各一份）
    this._jsonCache = {
      '1-50':    null,
      '51-100':  null,
      '101-150': null,
      '151-200': null,
    };

    // 當前關卡三層地圖資料
    this.currentFloor    = [];  // 地面層（主題底材）
    this.currentObstacle = [];  // 障礙層（碰撞）
    this.currentRoof     = [];  // 屋頂裝飾層

    // 當前主題
    this.currentTheme = 'VILLAGE';
  }

  // ===== 決定關卡號碼對應哪份 JSON 檔案 =====
  _getFileKey(stageNum) {
    if (stageNum <= 50)  return '1-50';
    if (stageNum <= 100) return '51-100';
    if (stageNum <= 150) return '101-150';
    return '151-200';
  }

  // ===== 非同步預載 JSON 地圖（回傳 Promise）=====
  async preloadJSON(stageNum) {
    const key = this._getFileKey(stageNum);
    if (this._jsonCache[key]) return this._jsonCache[key];

    const fileMap = {
      '1-50':    'Stage1-50.json',
      '51-100':  'Stage51-100.json',
      '101-150': 'Stage101-150.json',
      '151-200': 'Stage151-200.json',
    };
    const fileName = fileMap[key];

    try {
      const response = await fetch(`/maps/${fileName}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this._jsonCache[key] = data;
      return data;
    } catch (e) {
      console.warn(`[LevelManager] JSON 地圖載入失敗 (${fileName})，回退到程序化生成:`, e);
      return null;
    }
  }

  // ===== 從 JSON 快取中取得指定關卡資料 =====
  _getStageFromCache(stageNum) {
    const key = this._getFileKey(stageNum);
    const cache = this._jsonCache[key];
    if (!cache || !cache.stages) return null;
    return cache.stages.find(s => s.stage === stageNum) || null;
  }

  // ===== 將 JSON 地圖的 obstacle 層轉換為舊版相容 2D 陣列（給 Engine 用）=====
  _convertObstacleToLegacy(stageData) {
    if (!stageData) return null;
    return stageData.obstacle;
  }

  // ===== 非同步載入關卡（優先使用 JSON，失敗則回退程序化）=====
  async loadStageAsync(stageNum, extended = true) {
    this.currentStage = Math.max(1, Math.min(this.maxStages, stageNum));
    this.isExtendedMode = extended;
    this.currentTheme = getThemeForStage(stageNum).name;

    if (this.customMap) {
      this.currentMap = JSON.parse(JSON.stringify(this.customMap));
      return this.currentMap;
    }

    // 嘗試載入 JSON
    await this.preloadJSON(stageNum);
    const stageData = this._getStageFromCache(stageNum);

    if (stageData) {
      // 存入三層資料
      this.currentFloor    = stageData.floor    || [];
      this.currentObstacle = stageData.obstacle || [];
      this.currentRoof     = stageData.roof     || [];
      // currentMap = obstacle 層（向下相容碰撞偵測）
      this.currentMap = this.currentObstacle;
    } else {
      // 回退：程序化生成
      this.currentMap = extended
        ? MapDataGenerator.generateExtendedStage(stageNum)
        : MapDataGenerator.generateStage(stageNum);
      this.currentFloor    = [];
      this.currentObstacle = this.currentMap;
      this.currentRoof     = [];
    }

    return this.currentMap;
  }

  // ===== 同步載入（向下相容舊呼叫方式）=====
  loadStage(stageNum, extended = true) {
    this.currentStage = Math.max(1, Math.min(this.maxStages, stageNum));
    this.isExtendedMode = extended;
    this.currentTheme = getThemeForStage(stageNum).name;

    if (this.customMap && stageNum === this.currentStage) {
      this.currentMap = JSON.parse(JSON.stringify(this.customMap));
    } else {
      // 同步嘗試從快取取得 JSON
      const stageData = this._getStageFromCache(stageNum);
      if (stageData) {
        this.currentFloor    = stageData.floor    || [];
        this.currentObstacle = stageData.obstacle || [];
        this.currentRoof     = stageData.roof     || [];
        this.currentMap = this.currentObstacle;
      } else {
        // 回退程序化生成
        this.currentMap = extended
          ? MapDataGenerator.generateExtendedStage(this.currentStage)
          : MapDataGenerator.generateStage(this.currentStage);
        this.currentFloor    = [];
        this.currentObstacle = this.currentMap;
        this.currentRoof     = [];
      }
    }
    return this.currentMap;
  }

  setCustomMap(mapGrid) {
    this.customMap = JSON.parse(JSON.stringify(mapGrid));
    this.currentMap = JSON.parse(JSON.stringify(mapGrid));
    return this.currentMap;
  }

  nextStage() {
    this.customMap = null;
    if (this.currentStage < this.maxStages) {
      this.currentStage++;
    } else {
      this.currentStage = 1;
    }
    return this.loadStage(this.currentStage, this.isExtendedMode);
  }

  prevStage() {
    this.customMap = null;
    if (this.currentStage > 1) {
      this.currentStage--;
    } else {
      this.currentStage = this.maxStages;
    }
    return this.loadStage(this.currentStage, this.isExtendedMode);
  }

  // ===== 繪製全息雷達迷你地圖 (支援 52x52 與 26x26) =====
  renderMinimap(canvas, player, enemies) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const mapData = this.currentObstacle.length > 0 ? this.currentObstacle : this.currentMap;
    const gridCols = (mapData && mapData.length) ? mapData.length : MAP_SIZE;
    const tileSize = w / gridCols;

    ctx.fillStyle = 'rgba(5, 8, 13, 0.95)';
    ctx.fillRect(0, 0, w, h);

    for (let r = 0; r < gridCols; r++) {
      if (!mapData[r]) continue;
      for (let c = 0; c < gridCols; c++) {
        const tile = mapData[r][c];
        let color = null;
        if (tile === TILE.BRICK)         color = '#d84315';
        else if (tile === TILE.STEEL)    color = '#90a4ae';
        else if (tile === TILE.WATER)    color = '#0288d1';
        else if (tile === TILE.SAND)     color = '#d4a373';
        else if (tile === TILE.BOOST)    color = '#00f5d4';
        else if (tile === TILE.LAVA)     color = '#ff4800';
        else if (tile === TILE.PORTAL)   color = '#f72585';
        else if (tile === TILE.BASE)     color = '#ffca28';
        else if (tile === TILE_EXT.FENCE)   color = '#8b5e2e';
        else if (tile === TILE_EXT.SANDBAG) color = '#c4a35a';
        else if (tile === TILE_EXT.RUBBLE)  color = '#6d6050';
        else if (tile === TILE_EXT.BARREL)  color = '#ff6820';
        else if (tile === TILE_EXT.MINE)    color = '#cc0000';

        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
        }
      }
    }

    const worldWidth = gridCols * 64;  // 64px tileSize
    const worldHeight = gridCols * 64;

    if (player && player.alive) {
      const px = (player.x / worldWidth) * w;
      const py = (player.y / worldHeight) * h;
      ctx.fillStyle = '#00e676';
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (enemies) {
      ctx.fillStyle = '#ff1744';
      enemies.forEach(e => {
        if (e.alive) {
          const ex = (e.x / worldWidth) * w;
          const ey = (e.y / worldHeight) * h;
          ctx.fillRect(ex - 2, ey - 2, 4, 4);
        }
      });
    }
  }

  // ===== 繪製左側「下一關預覽」Canvas (160x120) =====
  renderPreview(canvas, targetStage) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const previewGrid = MapDataGenerator.generateStage(targetStage);
    const tileSize = w / MAP_SIZE;

    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, w, h);

    for (let r = 0; r < MAP_SIZE; r++) {
      for (let c = 0; c < MAP_SIZE; c++) {
        const tile = previewGrid[r][c];
        if (tile === TILE.BRICK) {
          ctx.fillStyle = '#bf360c';
          ctx.fillRect(c * tileSize, (r / MAP_SIZE) * h, tileSize, tileSize * (h / w));
        } else if (tile === TILE.STEEL) {
          ctx.fillStyle = '#78909c';
          ctx.fillRect(c * tileSize, (r / MAP_SIZE) * h, tileSize, tileSize * (h / w));
        } else if (tile === TILE.WATER) {
          ctx.fillStyle = '#0277bd';
          ctx.fillRect(c * tileSize, (r / MAP_SIZE) * h, tileSize, tileSize * (h / w));
        } else if (tile === TILE.TREES) {
          ctx.fillStyle = '#2e7d32';
          ctx.fillRect(c * tileSize, (r / MAP_SIZE) * h, tileSize, tileSize * (h / w));
        } else if (tile === TILE.BASE) {
          ctx.fillStyle = '#ffb300';
          ctx.fillRect(c * tileSize, (r / MAP_SIZE) * h, tileSize, tileSize * (h / w));
        }
      }
    }
  }
}
