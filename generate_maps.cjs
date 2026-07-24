/**
 * generate_maps.js
 * 程序化生成《禹旭寶貝大作戰》200 關 JSON 地圖模板
 * 
 * 使用方式：
 *   node generate_maps.js
 * 
 * 輸出：
 *   public/maps/Stage1-50.json
 *   public/maps/Stage51-100.json
 *   public/maps/Stage101-150.json
 *   public/maps/Stage151-200.json
 * 
 * JSON 格式（每一關）：
 * {
 *   stage: number,
 *   theme: string,
 *   rows: 26,
 *   cols: 26,
 *   floor: number[][],       // 地面層（主題地面材質）
 *   obstacle: number[][],    // 障礙層（磚/鋼/水/特殊障礙）
 *   roof: number[][],        // 屋頂裝飾層（樹冠/屋瓦/管道）
 * }
 */

const fs = require('fs');
const path = require('path');

// ===== Tile 常數（與 MapData.js 相容）=====
const TILE = {
  EMPTY: 0, BRICK: 1, STEEL: 2, WATER: 3, TREES: 4,
  ICE: 5, BASE: 6, BASE_STEEL: 7, SAND: 8, BOOST: 9,
  LAVA: 10, PORTAL: 11, SHIELD_FIELD: 12,
  RUBBLE: 13, FENCE: 14, SANDBAG: 15,
};

const TILE_FLOOR = {
  GRASS: 20, MUD: 21, STONE_FLOOR: 22, SNOW_FLOOR: 23,
  LAVA_ROCK: 24, METAL_FLOOR: 25, WOOD_FLOOR: 26,
};

const TILE_ROOF = {
  TREE_CANOPY: 30, ROOF_TILE: 31, PIPE: 32, EAVE: 33, RUIN_ROOF: 34,
};

const TILE_PROP = {
  BARREL: 40, STUMP: 41, SHACK: 42, MINE: 43,
};

// ===== 偽隨機生成器 =====
function createRng(seed) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ===== 依關卡號碼取得主題名稱 =====
function getTheme(stageNum) {
  if (stageNum <= 50)  return 'VILLAGE';
  if (stageNum <= 100) return 'RUIN';
  if (stageNum <= 120) return 'SNOW';
  if (stageNum <= 160) return 'FACTORY';
  return 'TEMPLE';
}

// ===== 依主題取得地面 Tile =====
function getFloorTile(theme, rng) {
  switch (theme) {
    case 'VILLAGE': return rng() < 0.7 ? TILE_FLOOR.GRASS : TILE_FLOOR.MUD;
    case 'RUIN':    return rng() < 0.6 ? TILE_FLOOR.STONE_FLOOR : TILE_FLOOR.WOOD_FLOOR;
    case 'SNOW':    return TILE_FLOOR.SNOW_FLOOR;
    case 'FACTORY': return rng() < 0.8 ? TILE_FLOOR.METAL_FLOOR : TILE_FLOOR.STONE_FLOOR;
    case 'TEMPLE':  return TILE_FLOOR.LAVA_ROCK;
    default:        return TILE_FLOOR.GRASS;
  }
}

// ===== 核心關卡生成邏輯 =====
function generateStage(stageNum) {
  const MAP_SIZE = 26;
  const theme = getTheme(stageNum);
  const rng = createRng(stageNum * 9301 + 49297);

  // 建立三層陣列
  const floor    = Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill(TILE_FLOOR.GRASS));
  const obstacle = Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill(TILE.EMPTY));
  const roof     = Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill(TILE.EMPTY));

  // --- 填充地面層 ---
  for (let r = 0; r < MAP_SIZE; r++) {
    for (let c = 0; c < MAP_SIZE; c++) {
      floor[r][c] = getFloorTile(theme, rng);
    }
  }

  // --- 保護區（玩家/敵人出生點不放障礙）---
  const clearSpots = new Set();
  // 玩家出生點
  for (let r = 23; r <= 25; r++) for (let c = 7; c <= 18; c++) clearSpots.add(`${r},${c}`);
  // 敵人出生點（左中右三處）
  for (let r = 0; r <= 2; r++) {
    for (let c = 0; c <= 3; c++) clearSpots.add(`${r},${c}`);
    for (let c = 11; c <= 14; c++) clearSpots.add(`${r},${c}`);
    for (let c = 22; c <= 25; c++) clearSpots.add(`${r},${c}`);
  }
  // 鷹徽基地保護區
  for (let r = 23; r <= 25; r++) for (let c = 11; c <= 14; c++) clearSpots.add(`${r},${c}`);

  // --- 難易度階梯參數 ---
  // 障礙密度：第1關 0.22 → 第200關 0.44
  const baseDensity   = 0.22 + (stageNum / 200) * 0.22;
  const microVariance = (stageNum % 5) * 0.012;
  const density       = Math.min(0.44, baseDensity + microVariance);

  // 材質比例
  const steelRatio  = 0.10 + (stageNum / 200) * 0.45; // 10%→55% 鋼片
  const waterRatio  = 0.08 + (stageNum / 200) * 0.04; // 8%→12% 水域
  const treesRatio  = 0.08 - (stageNum / 200) * 0.03; // 8%→5% 叢林
  const iceRatio    = Math.max(0, -0.05 + (stageNum / 200) * 0.12); // 後期出現冰地

  // 新障礙出現頻率（依主題）
  const fenceChance  = theme === 'VILLAGE' ? 0.12 : (theme === 'RUIN' ? 0.08 : 0);
  const sandbagChance = theme === 'RUIN' || theme === 'FACTORY' ? 0.08 : 0;
  const rubbleChance = theme === 'RUIN' || theme === 'TEMPLE' ? 0.10 : 0;

  // 可破壞物件出現頻率（依主題）
  const barrelChance = theme === 'FACTORY' || theme === 'RUIN' ? 0.04 : 0.02;
  const stumpChance  = theme === 'VILLAGE' || theme === 'RUIN' ? 0.04 : 0;
  const shackChance  = theme === 'VILLAGE' ? 0.03 : 0;
  const mineChance   = (stageNum > 60) ? (0.02 + (stageNum / 200) * 0.04) : 0;

  // 主題專屬地形 Tile（obstacle 層）
  const specialTile = {
    'VILLAGE': TILE.SAND,
    'RUIN':    TILE.RUBBLE,
    'SNOW':    TILE.ICE,
    'FACTORY': TILE.BOOST,
    'TEMPLE':  TILE.LAVA,
  }[theme] || TILE.EMPTY;

  const specialChance = 0.06 + (stageNum / 200) * 0.08;

  // --- 填充障礙層（2格×2格的 2x2 磚塊佈局，類似原版大戰）---
  for (let r = 2; r < 22; r += 2) {
    for (let c = 2; c < 24; c += 2) {
      if (clearSpots.has(`${r},${c}`) || clearSpots.has(`${r+1},${c}`) ||
          clearSpots.has(`${r},${c+1}`) || clearSpots.has(`${r+1},${c+1}`)) continue;

      if (rng() >= density) continue;

      const tileType = rng();
      let t = TILE.BRICK;

      // 決定磚塊類型
      if (tileType < steelRatio) {
        t = TILE.STEEL;
      } else if (tileType < steelRatio + waterRatio) {
        t = TILE.WATER;
      } else if (tileType < steelRatio + waterRatio + treesRatio) {
        t = TILE.TREES;
      } else if (tileType < steelRatio + waterRatio + treesRatio + iceRatio) {
        t = TILE.ICE;
      } else if (tileType < steelRatio + waterRatio + treesRatio + iceRatio + fenceChance) {
        t = TILE.FENCE;
      } else if (tileType < steelRatio + waterRatio + treesRatio + iceRatio + fenceChance + sandbagChance) {
        t = TILE.SANDBAG;
      } else if (tileType < steelRatio + waterRatio + treesRatio + iceRatio + fenceChance + sandbagChance + rubbleChance) {
        t = TILE.RUBBLE;
      } else {
        t = TILE.BRICK;
      }

      // 填入 2x2 磚塊
      for (let dr = 0; dr <= 1; dr++) {
        for (let dc = 0; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr < MAP_SIZE && nc < MAP_SIZE && !clearSpots.has(`${nr},${nc}`)) {
            obstacle[nr][nc] = t;
          }
        }
      }
    }
  }

  // --- 散佈可破壞物件（單格）---
  for (let r = 3; r < 22; r++) {
    for (let c = 3; c < 23; c++) {
      if (clearSpots.has(`${r},${c}`)) continue;
      if (obstacle[r][c] !== TILE.EMPTY) continue;
      const rv = rng();
      if (rv < barrelChance)            obstacle[r][c] = TILE_PROP.BARREL;
      else if (rv < barrelChance + stumpChance) obstacle[r][c] = TILE_PROP.STUMP;
      else if (rv < barrelChance + stumpChance + shackChance) obstacle[r][c] = TILE_PROP.SHACK;
      else if (rv < barrelChance + stumpChance + shackChance + mineChance) obstacle[r][c] = TILE_PROP.MINE;
    }
  }

  // --- 主題專屬地形塊（零散分佈）---
  if (specialTile !== TILE.EMPTY) {
    for (let r = 2; r < 22; r++) {
      for (let c = 2; c < 24; c++) {
        if (clearSpots.has(`${r},${c}`)) continue;
        if (obstacle[r][c] !== TILE.EMPTY) continue;
        if (rng() < specialChance) obstacle[r][c] = specialTile;
      }
    }
  }

  // --- 傳送門（後期 101+ 才出現）---
  if (stageNum > 100 && stageNum % 10 === 0) {
    // 四角傳送門
    [[2, 2], [2, 23], [22, 2], [22, 23]].forEach(([pr, pc]) => {
      if (!clearSpots.has(`${pr},${pc}`)) obstacle[pr][pc] = TILE.PORTAL;
    });
  }

  // --- 基地防禦牆（磚牆圍繞）---
  obstacle[24][12] = TILE.BRICK;
  obstacle[24][13] = TILE.BRICK;
  obstacle[25][12] = TILE.BRICK;
  obstacle[25][13] = TILE.BASE;   // 鷹徽核心
  obstacle[23][11] = TILE.BRICK;
  obstacle[23][12] = TILE.BRICK;
  obstacle[23][13] = TILE.BRICK;
  obstacle[23][14] = TILE.BRICK;
  obstacle[24][11] = TILE.BRICK;
  obstacle[24][14] = TILE.BRICK;
  obstacle[25][11] = TILE.BRICK;
  obstacle[25][14] = TILE.BRICK;

  // --- 屋頂層（依主題放置裝飾）---
  for (let r = 2; r < 22; r++) {
    for (let c = 2; c < 24; c++) {
      if (clearSpots.has(`${r},${c}`)) continue;
      const obs = obstacle[r][c];
      // 叢林 → 樹冠層（視覺遮蔽）
      if (obs === TILE.TREES && rng() < 0.7) roof[r][c] = TILE_ROOF.TREE_CANOPY;
      // 村莊主題 → 零散屋瓦（無障礙的格子偶而出現）
      else if (theme === 'VILLAGE' && obs === TILE.EMPTY && rng() < 0.03) roof[r][c] = TILE_ROOF.ROOF_TILE;
      // 工廠主題 → 管道裝飾
      else if (theme === 'FACTORY' && obs === TILE.STEEL && rng() < 0.4) roof[r][c] = TILE_ROOF.PIPE;
      // 古寺主題 → 飛簷裝飾
      else if (theme === 'TEMPLE' && obs === TILE.STEEL && rng() < 0.35) roof[r][c] = TILE_ROOF.EAVE;
      // 廢墟主題 → 廢墟屋頂
      else if (theme === 'RUIN' && obs === TILE.BRICK && rng() < 0.3) roof[r][c] = TILE_ROOF.RUIN_ROOF;
    }
  }

  // --- 後期 (81+) 鋼化基地升級 ---
  if (stageNum > 80 && stageNum % 8 === 0) {
    obstacle[25][13] = TILE.BASE;
    obstacle[23][11] = TILE.STEEL;
    obstacle[23][14] = TILE.STEEL;
    obstacle[24][11] = TILE.STEEL;
    obstacle[24][14] = TILE.STEEL;
    obstacle[25][11] = TILE.STEEL;
    obstacle[25][14] = TILE.STEEL;
  }

  return {
    stage: stageNum,
    theme,
    rows: MAP_SIZE,
    cols: MAP_SIZE,
    floor,
    obstacle,
    roof,
  };
}

// ===== 生成並寫出四期 JSON 檔案 =====
function main() {
  const outputDir = path.join(__dirname, 'public', 'maps');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const ranges = [
    { file: 'Stage1-50.json',    start: 1,   end: 50  },
    { file: 'Stage51-100.json',  start: 51,  end: 100 },
    { file: 'Stage101-150.json', start: 101, end: 150 },
    { file: 'Stage151-200.json', start: 151, end: 200 },
  ];

  for (const { file, start, end } of ranges) {
    const stages = [];
    for (let n = start; n <= end; n++) {
      stages.push(generateStage(n));
    }
    const outPath = path.join(outputDir, file);
    fs.writeFileSync(outPath, JSON.stringify({ stages }, null, 2), 'utf-8');
    console.log(`[OK] ${file} (Stage ${start}~${end}) => ${outPath}`);
  }

  console.log('\n✅ 200 關 JSON 地圖模板生成完畢！');
  console.log('📁 位置：public/maps/Stage*.json');
  console.log('📝 你可以直接編輯 JSON 檔案手動調整每一關細節。');
}

main();
