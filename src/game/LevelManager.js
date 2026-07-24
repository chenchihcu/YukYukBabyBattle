/* =========================================================
   LevelManager.js - 關卡載入、迷你地圖雷達與下一關預覽
   ========================================================= */

import { MapDataGenerator, TILE, MAP_SIZE } from './MapData.js';

export class LevelManager {
  constructor() {
    this.currentStage = 1;
    this.maxStages = 200;
    this.currentMap = [];
    this.customMap = null;
  }

  loadStage(stageNum) {
    this.currentStage = Math.max(1, Math.min(this.maxStages, stageNum));
    if (this.customMap && stageNum === this.currentStage) {
      this.currentMap = JSON.parse(JSON.stringify(this.customMap));
    } else {
      this.currentMap = MapDataGenerator.generateStage(this.currentStage);
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
    return this.loadStage(this.currentStage);
  }

  prevStage() {
    this.customMap = null;
    if (this.currentStage > 1) {
      this.currentStage--;
    } else {
      this.currentStage = this.maxStages;
    }
    return this.loadStage(this.currentStage);
  }

  // ===== 繪製左側雷達迷你地圖 (160x160) =====
  renderMinimap(canvas, player, enemies) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const tileSize = w / MAP_SIZE;

    ctx.fillStyle = '#05080d';
    ctx.fillRect(0, 0, w, h);

    for (let r = 0; r < MAP_SIZE; r++) {
      for (let c = 0; c < MAP_SIZE; c++) {
        const tile = this.currentMap[r] ? this.currentMap[r][c] : 0;
        if (tile === TILE.BRICK) {
          ctx.fillStyle = '#d84315';
          ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
        } else if (tile === TILE.STEEL) {
          ctx.fillStyle = '#90a4ae';
          ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
        } else if (tile === TILE.WATER) {
          ctx.fillStyle = '#0288d1';
          ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
        } else if (tile === TILE.BASE) {
          ctx.fillStyle = '#ffca28';
          ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
        }
      }
    }

    if (player && player.alive) {
      const px = (player.x / (MAP_SIZE * 24)) * w;
      const py = (player.y / (MAP_SIZE * 24)) * h;
      ctx.fillStyle = '#00e676';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    if (enemies) {
      ctx.fillStyle = '#ff1744';
      enemies.forEach(e => {
        if (e.alive) {
          const ex = (e.x / (MAP_SIZE * 24)) * w;
          const ey = (e.y / (MAP_SIZE * 24)) * h;
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
