/* =========================================================
   MapData.js - 200 關關卡地圖數據與程序化生成器
   ========================================================= */

export const TILE = {
  EMPTY: 0,
  BRICK: 1,
  STEEL: 2,
  WATER: 3,
  TREES: 4,
  ICE: 5,
  BASE: 6,
  BASE_STEEL: 7
};

// 超級任天堂 (SNES) 經典 16-bit 專屬調色盤與地形渲染輔助器
export const SNES_PALETTE = {
  BRICK_MAIN: '#c63d12',
  BRICK_DARK: '#8a2100',
  BRICK_LIGHT: '#ff6f43',
  MORTAR: '#381e18',

  STEEL_MAIN: '#78909c',
  STEEL_DARK: '#37474f',
  STEEL_LIGHT: '#cfd8dc',
  STEEL_HIGHLIGHT: '#ffffff',

  WATER_DEEP: '#0277bd',
  WATER_SURFACE: '#00b0ff',
  WATER_CREST: '#80d8ff',

  TREES_DARK: '#1b5e20',
  TREES_MAIN: '#2e7d32',
  TREES_LIGHT: '#66bb6a',

  ICE_MAIN: '#80deea',
  ICE_HIGHLIGHT: '#e0f7fa',
  ICE_SHADOW: '#4dd0e1',

  GOLD_BASE: '#ffb300',
  GOLD_HIGHLIGHT: '#ffe57f',
  GOLD_SHADOW: '#ff6f00'
};

export const MAP_SIZE = 26; // 26x26 經典大格
export const SUB_MAP_SIZE = 52; // 52x52 1/4 微觀小格
export const SUB_TILE_SIZE = 12; // 每小格 12px

export class MapDataGenerator {
  // 生成指定的第 N 關 (1 ~ 200 關) 地形陣列 (26x26)
  static generateStage(stageNum) {
    const grid = Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill(TILE.EMPTY));

    // 1. 放置底層 鷹徽基地 Eagle Base
    grid[24][12] = TILE.BRICK;
    grid[24][13] = TILE.BRICK;
    grid[25][12] = TILE.BRICK;
    grid[25][13] = TILE.BASE; // 鷹徽核心

    grid[23][11] = TILE.BRICK;
    grid[23][12] = TILE.BRICK;
    grid[23][13] = TILE.BRICK;
    grid[23][14] = TILE.BRICK;
    grid[24][11] = TILE.BRICK;
    grid[24][14] = TILE.BRICK;
    grid[25][11] = TILE.BRICK;
    grid[25][14] = TILE.BRICK;

    // 2. 定義玩家與敵人出生防禦保護區
    const clearSpots = [
      // 玩家出生點 (row 23~25, col 7~10)
      [23, 7], [23, 8], [23, 9], [23, 10],
      [24, 7], [24, 8], [24, 9], [24, 10],
      [25, 7], [25, 8], [25, 9], [25, 10],

      // 玩家 2 出生點 (row 23~25, col 15~18)
      [23, 15], [23, 16], [23, 17], [23, 18],
      [24, 15], [24, 16], [24, 17], [24, 18],
      [25, 15], [25, 16], [25, 17], [25, 18],

      // 敵方出生點 左 (0~2, 0~3)
      [0, 0], [0, 1], [0, 2], [0, 3],
      [1, 0], [1, 1], [1, 2], [1, 3],
      [2, 0], [2, 1], [2, 2], [2, 3],

      // 敵方出生點 中 (0~2, 11~14)
      [0, 11], [0, 12], [0, 13], [0, 14],
      [1, 11], [1, 12], [1, 13], [1, 14],
      [2, 11], [2, 12], [2, 13], [2, 14],

      // 敵方出生點 右 (0~2, 22~25)
      [0, 22], [0, 23], [0, 24], [0, 25],
      [1, 22], [1, 23], [1, 24], [1, 25],
      [2, 22], [2, 23], [2, 24], [2, 25]
    ];
    
    // 偽隨機種子生成器，確保 200 關每一關地圖 100% 固化且富於變化
    let seed = stageNum * 9301 + 49297;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    // 3. 階段性漸進地形分佈 (1~200 關平滑難易度曲線)
    // 障礙密度由第 1 關 0.22 逐步提升至第 200 關 0.44
    const baseDensity = 0.22 + (stageNum / 200) * 0.20;
    const microVariation = (stageNum % 5) * 0.015;
    const density = Math.min(0.44, baseDensity + microVariation);

    // 材質比例：前期 (1~40) 80% 磚牆方便破路；後期 (160~200) 鋼牆與冰地比率高達 70%
    const steelRatio = 0.15 + (stageNum / 200) * 0.45; // 15% ~ 60% 鋼牆
    const brickRatio = Math.max(0.15, 0.70 - (stageNum / 200) * 0.50); // 70% ~ 15% 磚牆

    for (let r = 2; r < 22; r++) {
      for (let c = 2; c < 24; c += 2) {
        const val = rnd();
        if (val < density) {
          const tileType = rnd();
          let t = TILE.BRICK;

          if (tileType < brickRatio) {
            t = TILE.BRICK;
          } else if (tileType < brickRatio + steelRatio) {
            t = TILE.STEEL;
          } else if (tileType < brickRatio + steelRatio + 0.10) {
            t = TILE.WATER;
          } else if (tileType < brickRatio + steelRatio + 0.20) {
            t = TILE.TREES;
          } else {
            t = TILE.ICE;
          }

          grid[r][c] = t;
          grid[r][c + 1] = t;
          grid[r + 1][c] = t;
          grid[r + 1][c + 1] = t;
        }
      }
    }

    // 清理保護區，確保 200 關都不會受困
    clearSpots.forEach(([r, c]) => {
      if (r < MAP_SIZE && c < MAP_SIZE) {
        grid[r][c] = TILE.EMPTY;
      }
    });

    return grid;
  }

  // 將 26x26 大網格轉換為 52x52 (1/4 碎裂微觀網格)
  static convertToSubMap(grid26) {
    const subGrid = Array.from({ length: SUB_MAP_SIZE }, () => Array(SUB_MAP_SIZE).fill(TILE.EMPTY));
    if (!grid26 || !Array.isArray(grid26)) return subGrid;

    for (let r = 0; r < MAP_SIZE; r++) {
      if (!grid26[r]) continue;
      for (let c = 0; c < MAP_SIZE; c++) {
        const t = grid26[r][c];
        subGrid[r * 2][c * 2] = t;
        subGrid[r * 2][c * 2 + 1] = t;
        subGrid[r * 2 + 1][c * 2] = t;
        subGrid[r * 2 + 1][c * 2 + 1] = t;
      }
    }
    return subGrid;
  }
}
