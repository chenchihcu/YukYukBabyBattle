# 部署與營運指南 (Deployment & Operation Guide)

本指南提供《禹旭寶貝大作戰》於各種靜態託管平台、雲端 VPS 及 Nginx 伺服器的發佈、打包、快取更新與營運維護說明。

---

## 💻 1. 環境需求與軟體準備

- **Node.js**：`>= 18.0.0` (推薦 LTS 版本)
- **npm**：`>= 9.0.0`
- **瀏覽器支援**：Chrome 90+, Firefox 88+, Safari 14+, Edge 90+（須支援 Web Audio API 與 Canvas 2D Transform）

---

## 🛠️ 2. 建置與打包流程 (Build Workflow)

### 本地開發伺服器
```bash
npm run dev
```
預設將在 `http://localhost:5173` 啟動帶有熱重載 (HMR) 的開發伺服器。

### 測試環境預覽
```bash
npm run build
npm run preview
```
`npm run preview` 可在本地模擬生產環境 dist 目錄的靜態伺服器行為。

---

## 🌐 3. 靜態平台部署設定 (Hosting Deployment)

本專案配置 `vite.config.js` 的 `base: './'`，產出的 `dist/` 目錄具備高度相容性，可直接上傳至任何靜態託管平台。

### A. Netlify 部署
1. 登入 Netlify Dashboard，選擇 **Add new site** -> **Import an existing project**。
2. 連結 GitHub / GitLab 儲存庫。
3. 設定 Build 指令與目錄：
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. 點擊 **Deploy site** 即完成發佈。

### B. GitHub Pages 部署
1. 確保 `.github/workflows/deploy.yml` 自動化流程或使用 `gh-pages` npm 套件：
```bash
npx gh-pages -d dist
```
2. 在 GitHub Repository 的 **Settings** -> **Pages** 中，將 Source 指向 `gh-pages` 分支。

### C. Nginx 伺服器部署範例
將打包產出的 `dist/` 內容複製至伺服器 `/var/www/tank-game`，並在 `/etc/nginx/sites-available/default` 配置：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/tank-game;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 靜態資源長效快取
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

---

## 📱 4. PWA Service Worker 快取與版本控制 (PWA SW Versioning)

專案包含 [sw.js](file:///c:/Users/user/Documents/坦克大戰/sw.js) 提供離線遊玩 (Offline Support)。

### 快取升級步驟
當更新遊戲版本並發佈新生產包時，若需要強制清除舊版用戶端快取：
1. 開啟 [sw.js](file:///c:/Users/user/Documents/坦克大戰/sw.js)。
2. 將第 5 行的 `CACHE_NAME` 版本號遞增：
```javascript
// 修改版本號以觸發舊快取自動清除
const CACHE_NAME = 'tank-front-1988-v3';
```
3. `sw.js` 的 `activate` 事件監聽器會自動刪除舊有的 `tank-front-1988-v2` 快取。

---

## ❓ 5. 營運障礙排除 FAQ (Troubleshooting)

### Q1：Safari / iOS 裝置開啟遊戲沒有聲音？
- **原因**：iOS Safari 限制 Web Audio 在未發生觸控手勢前自動播放音訊。
- **排查與維護**：專案已於 [main.js](file:///c:/Users/user/Documents/坦克大戰/src/main.js) 的「開始作戰」及畫面按鈕加入 `audioEngine.resume()` 觸發器。請確保所有新增之互動 UI 皆有調用音效引擎解鎖。

### Q2：修改代碼後部署，瀏覽器仍顯示舊版本？
- **原因**：Service Worker 緩存了前一版本的 index.html 或資產。
- **解法**：請更新 `sw.js` 中的 `CACHE_NAME` 並重新執行打包部署。

### Q3：關卡選擇器按鈕點擊無反應？
- **原因**：LocalStorage 中保存的 `maxUnlockedStage` 數據異常。
- **解法**：開啟瀏覽器 Console 執行 `localStorage.clear()` 即可重置本地存檔狀態。
