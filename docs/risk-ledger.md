# 專案風險與防範帳冊 (Risk Ledger)

本文件紀錄《禹旭寶貝大作戰》之潛在技術風險、邊界條件與對應防範機制。

---

## 風險項目紀錄

### Risk-001: 200 關卡演算法產生不可通行區域 (Unreachable Map Areas)
- **範圍 (Scope)**: `src/game/LevelManager.js`
- **風險等級 (Risk)**: 低 (Low) - 演算法可能隨機填充障礙物阻擋路線
- **護欄防範 (Guardrail)**: `LevelManager.js` 設有連通性安全備援與邊界保護，確保玩家基地與敵軍出生點之間具備基本通道。
- **後續行動 (Next Action)**: 執行 `node test_200_stages.js` 進行 200 關自動化邏輯校驗。
- **重新驗證關卡 (Revalidation Gate)**: 關卡地圖結構變更或演算法重構時觸發。
- **退回機制 (Rollback)**: 還原至標準種子生成模板或靜態地圖資料庫 `MapData.js`。
- **狀態 (Status)**: 已解決/常態監控 (`Resolved / Active Guardrail`)

---

### Risk-002: Mode 7 2.5D 透視矩陣巨量粒子渲染效能瓶頸
- **範圍 (Scope)**: `src/game/Engine.js` & `src/game/Particles.js`
- **風險等級 (Risk)**: 中 (Medium) - 低階設備在雨夜天氣 + 大量爆炸粒子 + Mode 7 傾斜渲染時影格率下跌
- **護欄防範 (Guardrail)**: 粒子池 (Particle Pool) 上限控制 (預設 300 顆)，超出上限自動回收舊粒子；Canvas 僅更新受影響區域或採用 `requestAnimationFrame` 防卡頓。
- **後續行動 (Next Action)**: 監控 Low-end 設備 FPS 表現，若跌破 45 FPS 可提供「關閉天氣與 Mode 7」之效能開關。
- **重新驗證關卡 (Revalidation Gate)**: 修改 Canvas 畫布尺寸或新增複雜光影粒子時。
- **退回機制 (Rollback)**: 切換回經典 2D 俯瞰視角模式。
- **状态 (Status)**: 已解決/受控中 (`Mitigated`)

---

### Risk-003: Web Audio API 於部分 iOS 瀏覽器自動播放阻擋
- **範圍 (Scope)**: `src/audio/SoundManager.js`
- **風險等級 (Risk)**: 低 (Low) - Safari 要求使用者互動後始得初始化 AudioContext
- **護欄防範 (Guardrail)**: 在 `main.js` 的玩家首次點擊/按鍵事件中觸發 AudioContext `.resume()` 解鎖。
- **後續行動 (Next Action)**: 測試各種流動裝置手勢解鎖體驗。
- **重新驗證關卡 (Revalidation Gate)**: AudioManager 改版時。
- **退回機制 (Rollback)**: 靜音狀態啟動直到使用者操作。
- **狀態 (Status)**: 已解決 (`Resolved`)
