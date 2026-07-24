/* =========================================================
   MapDataJSON.js - 三層 JSON 地圖格式定義 + 五期主題調色盤
   =========================================================
   格式說明：
     每一關地圖為 JSON 物件，包含三個 2D 陣列層：
       floor[][]    - 地面層（草/泥/石/雪/岩）不影響碰撞
       obstacle[][] - 障礙層（磚/鋼/水/樹/冰/等）影響碰撞
       roof[][]     - 屋頂裝飾層（樹冠/屋瓦/管道）渲染在實體上方，不影響碰撞

   Tile 值說明（與 MapData.js TILE 相容）：
     0 = 空白
     1 = 磚牆 (BRICK)      可被子彈摧毀
     2 = 鋼片 (STEEL)      需雷射/穿甲彈
     3 = 水域 (WATER)      不可通行
     4 = 叢林 (TREES)      可通行（遮蔽）
     5 = 冰地 (ICE)        可通行（滑行）
     6 = 基地 (BASE)       鷹徽核心
     7 = 鋼化基地 (BASE_STEEL)
     8 = 沙地 (SAND)       可通行（減速50%）
     9 = 加速軌道 (BOOST)  可通行（加速80%）
    10 = 熔岩 (LAVA)       可通行（持續傷害）
    11 = 傳送門 (PORTAL)   可通行（傳送）
    12 = 護盾欄 (SHIELD_FIELD)
    13 = 崩堆 (RUBBLE)     可通行（障礙物件，可被破壞）
    14 = 木樁欄 (FENCE)    不可通行（可被火箭炮摧毀）
    15 = 沙袋 (SANDBAG)    不可通行（可被高火力摧毀）

   地面層（FLOOR）專用 Tile 值（僅用於 floor 層）：
    20 = 草地 (GRASS)
    21 = 泥土 (MUD)
    22 = 石板 (STONE_FLOOR)
    23 = 雪地 (SNOW_FLOOR)
    24 = 岩漿石 (LAVA_ROCK)
    25 = 金屬地板 (METAL_FLOOR)
    26 = 木板地 (WOOD_FLOOR)

   屋頂層（ROOF）專用 Tile 值（僅用於 roof 層）：
    30 = 樹冠 (TREE_CANOPY)  遮蔽坦克
    31 = 屋瓦 (ROOF_TILE)    裝飾
    32 = 工廠管道 (PIPE)     裝飾
    33 = 古廟飛簷 (EAVE)     裝飾
    34 = 廢墟屋頂 (RUIN_ROOF) 裝飾

   可破壞物件（PROP）- 存放在 obstacle 層：
    40 = 油桶 (BARREL)   被擊中大爆炸
    41 = 樹樁 (STUMP)    被擊中小爆炸
    42 = 小屋 (SHACK)    被擊中大爆炸 + 磚牆碎片
    43 = 地雷 (MINE)     坦克行過觸發爆炸
   ========================================================= */

// ===== 新增 Tile 常數（擴充 MapData.js 的 TILE）=====
export const TILE_EXT = {
  // 障礙層新增
  RUBBLE: 13,        // 崩堆（可通行，低障礙物件）
  FENCE: 14,         // 木樁欄（不可通行，可被火箭炮摧毀）
  SANDBAG: 15,       // 沙袋（不可通行，高HP）

  // 地面層專用
  GRASS: 20,         // 草地（戰禍村莊期）
  MUD: 21,           // 泥土（戰禍村莊期）
  STONE_FLOOR: 22,   // 石板（廢墻裂基期）
  SNOW_FLOOR: 23,    // 雪地（雪原冰地期）
  LAVA_ROCK: 24,     // 岩漿石（熔岩古寺期）
  METAL_FLOOR: 25,   // 金屬地板（燕岫工廠期）
  WOOD_FLOOR: 26,    // 木板地（廢墻/村莊期）

  // 屋頂裝飾層專用
  TREE_CANOPY: 30,   // 樹冠（遮蔽）
  ROOF_TILE: 31,     // 屋瓦
  PIPE: 32,          // 工廠管道
  EAVE: 33,          // 古廟飛簷
  RUIN_ROOF: 34,     // 廢墟屋頂

  // 可破壞物件（放在 obstacle 層）
  BARREL: 40,        // 油桶（大爆炸）
  STUMP: 41,         // 樹樁（小爆炸）
  SHACK: 42,         // 小屋（大爆炸 + 碎片）
  MINE: 43,          // 地雷（觸發爆炸）
};

// ===== 五期主題調色盤 =====
export const THEME_PALETTE = {
  // 期1：1~50 關「戰禍村莊」
  VILLAGE: {
    bg: '#1a1a0a',             // 夜晚草原深綠黑
    floor_grass: '#3d5a1e',    // 草地底色
    floor_grass2: '#2d4415',   // 草地暗色
    floor_mud: '#5c3d1e',      // 泥土棕
    floor_mud2: '#3d2810',     // 泥土暗棕
    fence_wood: '#8b5e2e',     // 木柵欄棕
    fence_dark: '#4a3018',     // 木柵欄暗
    sandbag: '#c4a35a',        // 沙袋土黃
    sandbag_dark: '#8b6e3a',   // 沙袋暗
    roof_canopy: '#2d5a1a',    // 樹冠深綠
    roof_canopy2: '#1a3d0d',   // 樹冠底色
    ambient: '#3d5a1e',        // 環境光顏色
  },

  // 期2：51~100 關「廢墻裂基」
  RUIN: {
    bg: '#0d0d0a',             // 廢墟暗調
    floor_stone: '#4a4a45',    // 石板灰
    floor_stone2: '#2d2d28',   // 石板暗灰
    floor_wood: '#5c4020',     // 木板棕
    floor_wood2: '#3d2810',    // 木板暗棕
    ruin_wall: '#555550',      // 廢牆灰
    ruin_crack: '#333330',     // 裂縫暗
    roof_ruin: '#3d3830',      // 廢墟屋頂
    roof_ruin2: '#252218',     // 廢墟屋頂暗
    ambient: '#4a4540',        // 廢墟環境色
  },

  // 期3：101~120 關「雪原冰地」
  SNOW: {
    bg: '#06090f',             // 雪夜深藍黑
    floor_snow: '#c8dae8',     // 雪地淡藍白
    floor_snow2: '#9ab5cc',    // 雪地中藍
    floor_snow3: '#7090a8',    // 雪地暗藍
    snow_sparkle: '#ffffff',   // 雪地反光
    frost_edge: '#d4eeff',     // 冰霜邊緣
    ambient: '#8090a8',        // 雪景環境色
  },

  // 期4：121~160 關「燕岫工廠」
  FACTORY: {
    bg: '#080a06',             // 工廠暗黑
    floor_metal: '#303838',    // 金屬地板深灰
    floor_metal2: '#1e2828',   // 金屬地板暗
    floor_grid: '#404848',     // 地板格線
    pipe_main: '#556055',      // 管道灰綠
    pipe_rust: '#8b4020',      // 生鏽管道
    pipe_glow: '#00ff88',      // 管道警示燈
    roof_pipe: '#404040',      // 屋頂管道
    ambient: '#305030',        // 工廠環境光（微綠）
  },

  // 期5：161~200 關「熔岩古寺」
  TEMPLE: {
    bg: '#0a0500',             // 熔岩深紅黑
    floor_lava: '#5a1500',     // 熔岩石底色
    floor_lava2: '#3a0d00',    // 熔岩石暗
    floor_lava3: '#ff4400',    // 熔岩亮橙
    stone_temple: '#4a3020',   // 古廟石材
    stone_dark: '#2d1e10',     // 古廟暗石
    eave_gold: '#c8a020',      // 廟簷金色
    eave_dark: '#8b6000',      // 廟簷暗金
    ambient: '#8b2000',        // 熔岩環境光（橙紅）
  },
};

// ===== 依關卡取得主題 =====
export function getThemeForStage(stageNum) {
  if (stageNum <= 50) return { name: 'VILLAGE', palette: THEME_PALETTE.VILLAGE };
  if (stageNum <= 100) return { name: 'RUIN', palette: THEME_PALETTE.RUIN };
  if (stageNum <= 120) return { name: 'SNOW', palette: THEME_PALETTE.SNOW };
  if (stageNum <= 160) return { name: 'FACTORY', palette: THEME_PALETTE.FACTORY };
  return { name: 'TEMPLE', palette: THEME_PALETTE.TEMPLE };
}

