---
name: tank-game-maintenance
description: |
  Use this skill whenever maintaining, debugging, or extending the 'Yuk-Yuk Baby Battle' (Tank Front 1988) codebase.
  Includes step-by-step procedures for level curve balancing, Web Audio API sound synthesis, 2.5D Mode 7 perspective tweaking, giant Boss bullet storm logic, and automated 200-stage verification.
license: Apache-2.0
metadata:
  version: v1.0
  publisher: yuk-yuk-baby
---

# 禹旭寶貝大作戰 (Tank Front 1988) 維護與擴充技能指南

> [!IMPORTANT]
> 本技能包含《禹旭寶貝大作戰》之核心開發標準、關卡設計法則、音效合成規範及驗證 SOP。在對專案進行任何修改時，請遵循本技能規範。

---

## 🛠️ 1. 核心開發與驗證 SOP (Standard Operating Procedure)

1. **零外部多媒體資源 (Zero External Media Asset)**：
   - 嚴禁引入外部 `.wav`, `.mp3` 音效檔。所有聲效必須在 [SymphonicAudioEngine.js](file:///c:/Users/user/Documents/坦克大戰/src/audio/SymphonicAudioEngine.js) 中透過 Web Audio API 合成。
   - 所有視覺細節必須經由 Canvas 2D 畫布繪製或 Vanilla CSS 呈現。

2. **微觀 SubMap 地形破壞法則**：
   - 任何碰撞與地形修改需同步更新 `map` (`13x13`) 與 `subMap` (`26x26`) 陣列。
   - 子彈擊中磚牆 (`TILE.BRICK` / `1`) 時，僅將觸發座標之微觀小格設為 `0` (`TILE.EMPTY`)。

3. **自動化驗證 mandatory 步驟**：
   - 每次代碼修改完成後，**必須**執行：
     ```bash
     node test_200_stages.js
     npm run build
     ```
   - 確保 200 關卡生成陣列 100% 完整，且生產打包零警告。
