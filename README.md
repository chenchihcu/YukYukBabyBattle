# 禹旭寶貝大作戰 (Yuk-Yuk Baby Battle / Tank Front 1988)

![版本](https://img.shields.io/badge/version-1.0.0-brightgreen.svg)
![授權](https://img.shields.io/badge/license-MIT-blue.svg)
![技術棧](https://img.shields.io/badge/stack-HTML5%20%7C%20Canvas%20%7C%20Vite-orange.svg)

《禹旭寶貝大作戰》是一款復刻經典 FC 坦克大戰並全面升級的現代網頁遊戲。融合超任 (SNES) 視覺風格、2.5D Mode 7 視角矩陣、巨型 Boss 戰彈幕系統與 200 關階梯式動態生成關卡，為玩家提供極致流暢的街機對戰體驗。

---

## 🌟 遊戲核心特色

### 1. 200 關階梯式難易度曲線 (Dynamic Level Curve)
- **五大階段演進**：
  - `001 - 010` 階段一【初試身手】：基礎兵種與地形，輕鬆熟悉操作。
  - `011 - 050` 階段二【熾熱戰場】：引入穿牆彈與高機動敵軍。
  - `051 - 100` 階段三【重裝突圍】：鋼鐵牆與水路迷宮相結合。
  - `101 - 150` 階段四【鋼鐵要塞】：高頻率裝甲坦克與雷射敵軍出沒。
  - `151 - 200` 階段五【終極決戰】：滿配敵軍彈幕與複合防禦地形。
- **動態兵種配比**：普通、速射、重裝、裝甲與 Boss 坦克隨關卡漸進比例生成。

### 2. 2.5D Mode 7 視覺與動態天氣
- **透視角度切換**：支援經典 2D 俯瞰視角與 SNES Mode 7 擬似 2.5D 立體傾斜視角。
- **探照燈雨夜天氣系統**：動態雨絲粒子結合玩家與 enemy 坦克的車燈探照效果。

### 3. 巨型 Boss 戰與多階段彈幕
- 關卡特定節點觸發 Boss 戰，包含多重階段彈幕射擊、護盾防禦與狂暴狀態。

### 4. SNES 風格結算與 Web Audio 聲效
- **懷舊結算畫面**：每關通關後統計擊破數、得分與階級評等。
- **純 Web Audio 合成聲效**：無須外部音效檔，低延遲且支援離線使用。

### 5. 多人對戰與完整操作支援
- 支援單人 (P1) 與雙人 (P2) 合作模式。
- 支援鍵盤、觸控虛擬搖桿與 Gamepad 遊戲手把。
- 內建自訂關卡地圖編輯器與 PWA 離線遊玩支援。

---

## 🛠️ 技術架構

```
坦克大戰/
├── index.html          # 主頁面結構與 UI 容器
├── package.json        # 專案依賴與腳本
├── vite.config.js      # Vite 建置配置
├── test_200_stages.js  # 200 關卡驗證腳本
├── public/             # 靜態資源與圖示
└── src/
    ├── style.css       # 全局金屬風格與玻璃擬態樣式
    ├── main.js         # 遊戲入口與 UI 事件綁定
    ├── audio/          # 音效合成與 Sound Manager
    └── game/           # 遊戲核心引擎
        ├── Engine.js        # 主遊戲迴圈與繪製渲染
        ├── Entities.js      # 玩家、敵軍與子彈實體
        ├── Boss.js          # Boss 實體與彈幕行為
        ├── LevelManager.js  # 200 關卡地圖生成與配比算法
        ├── MapData.js       # 地形資料與經典關卡模板
        ├── Particles.js     # 爆炸與雨夜粒子系統
        ├── WeaponsSystem.js # 武器與道具獎勵系統
        └── StorageManager.js# 最高分與存檔管理
```

---

## 🚀 快速開始

### 環境需求
- Node.js >= 18.0.0
- npm >= 9.0.0

### 安裝與啟動開發伺服器
```bash
npm install
npm run dev
```
瀏覽器開啟 `http://localhost:5173` 即可開始體驗遊戲。

### 驗證 200 關卡生成算法
```bash
node test_200_stages.js
```

### 生產環境打包與預覽
```bash
npm run build
npm run preview
```

---

## 📚 專案交接與維護文檔導覽 (Handover Documentation)

本專案已建立完整的全套標準交接包與維護技能包，點擊以下連結查閱詳細指南：

- 📘 [開發者交接手冊 (docs/handover.md)](file:///c:/Users/user/Documents/坦克大戰/docs/handover.md)：包含架構圖解、2.5D Mode 7 矩陣、SubMap 微觀碰撞及新增敵軍/音效擴充教程。
- 🚀 [部署與營運指南 (docs/deployment.md)](file:///c:/Users/user/Documents/坦克大戰/docs/deployment.md)：涵蓋 Static Hosting (Netlify, GitHub Pages, Vercel, Nginx) 部署、PWA SW 版本升級與故障排查 FAQ。
- 🧪 [自動化測試與 QA 規範 (docs/testing.md)](file:///c:/Users/user/Documents/坦克大戰/docs/testing.md)：含 `test_200_stages.js` 算法說明、手動 QA 驗證點檢表與 60FPS 效能基準。
- 🛡️ [專案風險帳冊 (docs/risk-ledger.md)](file:///c:/Users/user/Documents/坦克大戰/docs/risk-ledger.md)：紀錄關卡連通性、Mode 7 效能與 Web Audio 解鎖之安全護欄。
- 🤖 [AI 與開發者協作規範 (AGENTS.md)](file:///c:/Users/user/Documents/坦克大戰/AGENTS.md)：定義零外部多媒體檔原則、200關卡不破壞邊界與程式風格。

---

## 📜 授權協議

本專案採用 [MIT License](LICENSE) 授權。
