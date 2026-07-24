/* =========================================================
   test_200_stages.js - 200 關關卡地圖自動化檢測腳本
   ========================================================= */

import fs from 'fs';
import path from 'path';

console.log("開始進行 1 到 200 關關卡 JSON 自動化驗證測試...");

let errorCount = 0;
const TILE_BASE = 6;
const TILE_EMPTY = 0;

for (let stage = 1; stage <= 200; stage++) {
  try {
    let fileKey = '1-50';
    if (stage > 50) fileKey = '51-100';
    if (stage > 100) fileKey = '101-150';
    if (stage > 150) fileKey = '151-200';

    const filePath = path.join(process.cwd(), 'public', 'maps', `Stage${fileKey}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    const stageData = data.stages.find(s => s.stage === stage);
    if (!stageData) {
      console.error(`關卡 ${stage} 失敗: 找不到對應的 JSON 資料`);
      errorCount++;
      continue;
    }

    const map = stageData.obstacle;
    const MAP_SIZE = 26;

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

    // 2. 檢查鷹徽基地 (row:25, col:13) 是否存在
    if (map[25] && map[25][13] !== TILE_BASE) {
      console.error(`關卡 ${stage} 失敗: 鷹徽基地核心不在 (row:25, col:13)，找到: ${map[25] ? map[25][13] : '無'}`);
      errorCount++;
    }

    // 3. 檢查玩家出生點是否為空地 (row:22, col:8)
    if (map[22] && map[22][8] !== TILE_EMPTY) {
      console.error(`關卡 ${stage} 失敗: 玩家出生點受堵 (row:22, col:8)`);
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
