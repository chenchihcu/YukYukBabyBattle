# AGENTS.md - 《禹旭寶貝大作戰》 AI 與開發者協作規範

本文件為《禹旭寶貝大作戰》(Yuk-Yuk Baby Battle / Tank Front 1988) 專案之核心協作規範。任何 AI Agent 或開發者在修改本專案時，必須嚴格遵守以下條款。

---

## 🎯 1. 專案原則與核心防禦邊界

1. **Zero External Media Asset (零外部多媒體檔原則)**：
   - 專案所有音效必須透過 Web Audio API 振盪器與噪聲合成（位於 [SymphonicAudioEngine.js](file:///c:/Users/user/Documents/坦克大戰/src/audio/SymphonicAudioEngine.js)），嚴禁引入外部 `.mp3` 或 `.wav` 音效檔案。
   - 所有視覺與地形一律由 Canvas 2D 及 CSS 繪製渲染，禁止引用外部大型圖檔。

2. **200 關階梯式難易度不破壞原則**：
   - [LevelManager.js](file:///c:/Users/user/Documents/坦克大戰/src/game/LevelManager.js) 與 [MapData.js](file:///c:/Users/user/Documents/坦克大戰/src/game/MapData.js) 定義了 5 階段兵種與地形漸進曲線，任何修改均須執行 `node test_200_stages.js` 確保 200 關卡 100% 可通行且無死鎖。

3. **No-Auto-Push 規則 (git 規範)**：
   - 嚴禁自動執行 `git push` 或無授權之 `git commit`。變更完成後僅可回報 `git status` 摘要，由使用者決定提交時機。

---

## 💻 2. 程式碼風格與技術規範 (Coding Standards)

- **語言與架構**：原生 ES6 JavaScript (ES Modules)，使用 Vite 進行靜態打包。
- **DOM 與事件保護**：
  - 存取 DOM 元素前必須檢查 `if (element)` 以防止 `TypeError: Cannot read properties of null`。
  - 鍵盤事件處理常式必須針對 `ArrowUp`, `ArrowDown`, `Space` 等鍵防範 `preventDefault()`，避免引發瀏覽器頁面滾動。
- **語言與文件**：
  - 所有產出計畫、Walkthrough 與交接文檔必須強制使用**繁體中文**。
  - 檔案引用必須使用點擊式連結：`[filename](file:///path/to/file)`。

---

## 🛠️ 3. 測試與驗證義務 (Mandatory Verification)

任何程式碼編輯後，必須執行以下命令進行驗證：
```bash
node test_200_stages.js
npm run build
```
若命令執行失敗，不可宣稱任務完成。
