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
  BASE_STEEL: 7,
  SAND: 8,         // 黃沙/泥沼 (減速 50%)
  BOOST: 9,        // 高科技加速地轨 (加速 80%)
  LAVA: 10,        // 熔岩湖 (熾熱粒子 & 灼燒損害)
  PORTAL: 11,      // 時空躍遷傳送門 (角位點對點傳送)
  SHIELD_FIELD: 12 // 脈衝電磁防護欄
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

  SAND_MAIN: '#d4a373',
  SAND_DARK: '#bc8a5f',
  SAND_LIGHT: '#faedcd',

  BOOST_MAIN: '#00f5d4',
  BOOST_GLOW: '#7bf1a8',

  LAVA_MAIN: '#ff4800',
  LAVA_GLOW: '#ff7b00',

  PORTAL_MAIN: '#7209b7',
  PORTAL_GLOW: '#f72585',

  SHIELD_MAIN: '#4cc9f0',

  GOLD_BASE: '#ffb300',
  GOLD_HIGHLIGHT: '#ffe57f',
  GOLD_SHADOW: '#ff6f00'
};

// 64-bit 次世代主機 (N64 Ultra 64 時代) 擬真多邊形調色盤與 3D 質感光影參數
export const N64_PALETTE = {
  BRICK_BASE: '#d84315',
  BRICK_TOP: '#ff7043',
  BRICK_SIDE: '#bf360c',
  BRICK_BEVEL: '#ffab91',
  BRICK_MORTAR: '#27120a',

  STEEL_BASE: '#546e7a',
  STEEL_TOP: '#90a4ae',
  STEEL_SIDE: '#37474f',
  STEEL_BEVEL: '#eceff1',
  STEEL_GLINT: '#ffffff',

  WATER_DEEP: '#01579b',
  WATER_MID: '#0288d1',
  WATER_CREST: '#4fc3f7',
  WATER_FOAM: '#e0f7fa',

  TREES_DEEP: '#0b3c11',
  TREES_TOP: '#2e7d32',
  TREES_HIGH: '#81c784',

  ICE_DEEP: '#00838f',
  ICE_TOP: '#4dd0e1',
  ICE_GLINT: '#ffffff',

  GOLD_BASE: '#ff8f00',
  GOLD_TOP: '#ffc107',
  GOLD_GLOW: '#ffe082',

  TANK_PLAYER1_BASE: '#f57f17',
  TANK_PLAYER1_TOP: '#fbc02d',
  TANK_PLAYER1_DARK: '#e65100',
  TANK_PLAYER2_BASE: '#00838f',
  TANK_PLAYER2_TOP: '#00bcd4',
  TANK_PLAYER2_DARK: '#004d40',

  TANK_ENEMY_NORMAL_BASE: '#c62828',
  TANK_ENEMY_NORMAL_TOP: '#e53935',
  TANK_ENEMY_FAST_BASE: '#ef6c00',
  TANK_ENEMY_FAST_TOP: '#fb8c00',
  TANK_ENEMY_HEAVY_BASE: '#283593',
  TANK_ENEMY_HEAVY_TOP: '#3f51b5'
};

export const MAP_SIZE = 26; // 26x26 經典大格
export const EXTENDED_MAP_SIZE = 52; // 52x52 戰術大地圖大格
export const SUB_MAP_SIZE = 52; // 52x52 1/4 微觀小格
export const EXTENDED_SUB_MAP_SIZE = 104; // 104x104 微觀小格
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

  // 生成 52x52 戰術擴展大地圖（中央包含 26x26 的 200 關核心）
  static generateExtendedStage(stageNum) {
    const extGrid = Array.from({ length: EXTENDED_MAP_SIZE }, () => Array(EXTENDED_MAP_SIZE).fill(TILE.EMPTY));
    const coreGrid = this.generateStage(stageNum);

    const offsetR = 13;
    const offsetC = 13;

    // 1. 將 26x26 核心置於中央 (13..38, 13..38)
    for (let r = 0; r < MAP_SIZE; r++) {
      for (let c = 0; c < MAP_SIZE; c++) {
        extGrid[r + offsetR][c + offsetC] = coreGrid[r][c];
      }
    }

    // 2. 偽隨機外圍周邊野外多元地形生成 (0..12 & 39..51)
    let seed = stageNum * 7777 + 12345;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let r = 0; r < EXTENDED_MAP_SIZE; r++) {
      for (let c = 0; c < EXTENDED_MAP_SIZE; c++) {
        // 跳過中央核心區
        if (r >= offsetR && r < offsetR + MAP_SIZE && c >= offsetC && c < offsetC + MAP_SIZE) {
          continue;
        }

        // 外圍防線鋼牆保護
        if (r === 0 || r === EXTENDED_MAP_SIZE - 1 || c === 0 || c === EXTENDED_MAP_SIZE - 1) {
          if ((r + c) % 4 === 0) extGrid[r][c] = TILE.STEEL;
          continue;
        }

        const val = rnd();
        if (val < 0.32) {
          const typeVal = rnd();
          if (typeVal < 0.25) extGrid[r][c] = TILE.BRICK;
          else if (typeVal < 0.42) extGrid[r][c] = TILE.TREES;
          else if (typeVal < 0.58) extGrid[r][c] = TILE.WATER;
          else if (typeVal < 0.70) extGrid[r][c] = TILE.ICE;
          else if (typeVal < 0.82) extGrid[r][c] = TILE.SAND;    // 泥沼/減速沙地
          else if (typeVal < 0.92) extGrid[r][c] = TILE.LAVA;    // 熔岩湖
          else extGrid[r][c] = TILE.STEEL;
        }
      }
    }

    // 3. 佈置外圍兩側高科技 BOOST 加速軌道 (專屬高速走位區)
    for (let i = 2; i <= 10; i++) {
      extGrid[i][6] = TILE.BOOST;
      extGrid[51 - i][45] = TILE.BOOST;
      extGrid[6][51 - i] = TILE.BOOST;
      extGrid[45][i] = TILE.BOOST;
    }

    // 4. 四角置放時空躍遷傳送門 (PORTAL)
    extGrid[3][3] = TILE.PORTAL;
    extGrid[3][48] = TILE.PORTAL;
    extGrid[48][3] = TILE.PORTAL;
    extGrid[48][48] = TILE.PORTAL;

    // 清理 PORTAL 站點周圍 3x3 區域
    const portalSpots = [[3, 3], [3, 48], [48, 3], [48, 48]];
    portalSpots.forEach(([pr, pc]) => {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = pr + dr;
          const nc = pc + dc;
          if (nr >= 0 && nr < EXTENDED_MAP_SIZE && nc >= 0 && nc < EXTENDED_MAP_SIZE) {
            extGrid[nr][nc] = TILE.EMPTY;
          }
        }
      }
    });

    return extGrid;
  }

  // 將大網格轉換為碎裂微觀網格 (26x26 -> 52x52 或 52x52 -> 104x104)
  static convertToSubMap(grid) {
    if (!grid || !Array.isArray(grid)) return [];
    const rows = grid.length;
    const cols = grid[0] ? grid[0].length : rows;
    const subRows = rows * 2;
    const subCols = cols * 2;

    const subGrid = Array.from({ length: subRows }, () => Array(subCols).fill(TILE.EMPTY));

    for (let r = 0; r < rows; r++) {
      if (!grid[r]) continue;
      for (let c = 0; c < cols; c++) {
        const t = grid[r][c];
        subGrid[r * 2][c * 2] = t;
        subGrid[r * 2][c * 2 + 1] = t;
        subGrid[r * 2 + 1][c * 2] = t;
        subGrid[r * 2 + 1][c * 2 + 1] = t;
      }
    }
    return subGrid;
  }
}
