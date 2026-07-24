/* =========================================================
   test_200_stages.js - 200 關關卡地圖自動化檢測腳本
   ========================================================= */

import { MapDataGenerator, MAP_SIZE, TILE } from './src/game/MapData.js';

console.log("開始進行 1 到 200 關關卡自動化驗證測試...");

let errorCount = 0;

for (let stage = 1; stage <= 200; stage++) {
  try {
    const map = MapDataGenerator.generateStage(stage);
    
    // 1. 檢查陣列維度 (26x26)
    if (!map || map.length !== MAP_SIZE) {
      console.error(`關卡 ${stage} 失敗: 陣列列數不為 26 (實際: ${map ? map.length : 'null'})`);
      errorCount++;
      continue;
    }

    for (let r = 0; r < MAP_SIZE; r++) {
      if (!map[r] || map[r].length !== MAP_SIZE) {
        console.error(`關卡 ${stage} 失敗: 第 ${r} 行欄數不為 26`);
        errorCount++;
        break;
      }
    }

    // 2. 檢查鷹徽基地 (25, 13) 是否存在
    if (map[25][13] !== TILE.BASE) {
      console.error(`關卡 ${stage} 失敗: 鷹徽基地核心不在 (25, 13)`);
      errorCount++;
    }

    // 3. 檢查玩家出生點是否為空地 (24, 8)
    if (map[24][8] !== TILE.EMPTY) {
      console.error(`關卡 ${stage} 失敗: 玩家出生點受受堵 (24, 8)`);
      errorCount++;
    }

  } catch (err) {
    console.error(`關卡 ${stage} 拋出異常:`, err);
    errorCount++;
  }
}

if (errorCount === 0) {
  console.log("✅ 200 關全部通過驗證！地形陣列 100% 完整無瑕疵，出生點完全安全！");
} else {
  console.error(`❌ 測試完成，共有 ${errorCount} 個錯誤！`);
  process.exit(1);
}
