/* =========================================================
   main.js - 禹旭寶貝大作戰 主入口與 UI 控制器 (52x52 全螢幕戰術滿版)
   ========================================================= */

import './style.css';
import { SymphonicAudioEngine } from './audio/SymphonicAudioEngine.js';
import { LevelManager } from './game/LevelManager.js';
import { WeaponsManager } from './game/WeaponsSystem.js';
import { GameEngine } from './game/Engine.js';
import { MapDataGenerator, MAP_SIZE, TILE } from './game/MapData.js';
import { StorageManager } from './game/StorageManager.js';

document.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('SW register failed:', err);
    });
  }

  // DOM 元素引用
  const gameCanvas = document.getElementById('game-canvas');
  const minimapCanvas = document.getElementById('minimap-canvas');
  const previewCanvas = document.getElementById('preview-canvas');

  const uiStageText = document.getElementById('ui-current-stage');
  const uiScoreText = document.getElementById('ui-score');
  const uiEnemiesLeftText = document.getElementById('ui-enemies-left');
  const uiLivesContainer = document.getElementById('ui-lives');
  const uiLivesP2Container = document.getElementById('ui-lives-p2');

  const overlay = document.getElementById('game-overlay');
  const btnStartGame = document.getElementById('btn-start-game');
  const btnSelectStage = document.getElementById('btn-select-stage');
  const btnStageEditor = document.getElementById('btn-stage-editor');
  const btnMode1p = document.getElementById('btn-mode-1p');
  const btnMode2p = document.getElementById('btn-mode-2p');

  const btnPrevStage = document.getElementById('btn-prev-stage');
  const btnNextStage = document.getElementById('btn-next-stage');
  const previewStageLabel = document.getElementById('preview-stage-label');

  // 選關畫面 & 地圖編輯器 DOM
  const stageSelectOverlay = document.getElementById('stage-select-overlay');
  const stageSelectGrid = document.getElementById('stage-select-grid');
  const btnStageSelectClose = document.getElementById('btn-stage-select-close');
  const mapEditorOverlay = document.getElementById('map-editor-overlay');
  const editorCanvas = document.getElementById('map-editor-canvas');
  const editorPaletteRow = document.getElementById('map-editor-palette');
  const btnEditorClear = document.getElementById('btn-editor-clear');
  const btnEditorRandom = document.getElementById('btn-editor-random');
  const btnEditorSave = document.getElementById('btn-editor-save');
  const btnEditorTestPlay = document.getElementById('btn-editor-test-play');
  const btnEditorClose = document.getElementById('btn-editor-close');

  // 全新 武器輪盤與戰術抽屜選單 DOM
  const btnToggleWeaponWheel = document.getElementById('btn-toggle-weapon-wheel');
  const weaponWheelOverlay = document.getElementById('weapon-wheel-overlay');
  const radialWheelItems = document.getElementById('radial-wheel-items');
  const wheelSelectedName = document.getElementById('wheel-selected-name');
  const wheelSelectedDesc = document.getElementById('wheel-selected-desc');

  const btnToggleSettings = document.getElementById('btn-toggle-settings');
  const settingsDrawerOverlay = document.getElementById('settings-drawer-overlay');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const drawerBackdrop = document.getElementById('drawer-backdrop');

  const btnPerspective2d = document.getElementById('btn-perspective-2d');
  const btnPerspective25d = document.getElementById('btn-perspective-25d');

  const btnWeatherNone = document.getElementById('btn-weather-none');
  const btnWeatherRain = document.getElementById('btn-weather-rain');
  const btnWeatherSnow = document.getElementById('btn-weather-snow');
  const btnWeatherNight = document.getElementById('btn-weather-night');

  const btnControlMouse = document.getElementById('btn-control-mouse');
  const btnControlKeys = document.getElementById('btn-control-keys');

  const btnDiffEasy = document.getElementById('btn-diff-easy');
  const btnDiffNormal = document.getElementById('btn-diff-normal');
  const btnDiffHard = document.getElementById('btn-diff-hard');
  const btnDiffHell = document.getElementById('btn-diff-hell');

  const btnToggleSound = document.getElementById('btn-toggle-sound');
  const hotbarSlots = document.querySelectorAll('.weapon-slot');

  // 初始化各模組
  const audioEngine = new SymphonicAudioEngine();
  const levelManager = new LevelManager();
  const weaponsManager = new WeaponsManager();

  const gameEngine = new GameEngine(
    gameCanvas,
    levelManager,
    audioEngine,
    weaponsManager,
    {
      onStatusUpdate: (status) => {
        const stageFormatted = String(status.stage).padStart(3, '0');
        if (uiStageText) uiStageText.innerText = `${stageFormatted} / 200`;
        if (uiScoreText) uiScoreText.innerText = String(status.score).padStart(7, '0');
        if (uiEnemiesLeftText) uiEnemiesLeftText.innerText = String(status.enemiesLeft).padStart(2, '0');
        renderLives(status.lives, status.lives2);
        StorageManager.updateHighScore(status.score);
      },
      onStageClear: (data) => {
        runScoreTallyAnimation(data, true);
      },
      onGameOver: (data) => {
        runScoreTallyAnimation(data, false);
      },
      onWeaponChange: (idx) => {
        updateWeaponSelectionUI(idx);
      }
    }
  );

  // 除錯用鉤子：僅在開發模式暴露引擎內部狀態，供 .claude/skills/run-tank-front-1988 的 driver 讀取（生產打包 tree-shake 掉此區塊）
  if (import.meta.env.DEV) {
    window.__TANK_DEBUG__ = { gameEngine, levelManager, audioEngine, weaponsManager };
  }

  // isSoundOn 必須在 onToggleMute 回調前宣告，供閉包捕捉
  let isSoundOn = true;

  // ===== 外部回調鉤子注入 Engine（暫停、靜音、武器輪盤）=====
  gameEngine.onToggleWeaponWheel = () => toggleWeaponWheel();
  gameEngine.onTogglePause = (isPaused) => {
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) {
      if (isPaused) pauseOverlay.classList.remove('hidden');
      else pauseOverlay.classList.add('hidden');
    }
    audioEngine.playSfx('menu_click');
  };
  gameEngine.onToggleMute = () => {
    isSoundOn = !isSoundOn;
    if (isSoundOn) {
      if (btnToggleSound) { btnToggleSound.classList.add('active'); btnToggleSound.innerText = '🔊 音效開啟'; }
      audioEngine.setSfxVolume(1.0);
      audioEngine.setBgmVolume(0.8);
    } else {
      if (btnToggleSound) { btnToggleSound.classList.remove('active'); btnToggleSound.innerText = '🔇 音效靜音'; }
      audioEngine.setSfxVolume(0);
      audioEngine.setBgmVolume(0);
    }
    audioEngine.playSfx('menu_click');
  };

  // ===== KeyBinding Manager =====
  const DEFAULT_BINDINGS = {
    shoot:         { label: '射擊',         code: 'Space',      displayKey: 'SPACE' },
    shootAlt:      { label: '射擊 (備用)',    code: 'KeyZ',       displayKey: 'Z' },
    specialWeapon: { label: '特殊武器',       code: 'KeyE',       displayKey: 'E' },
    specialTech:   { label: '特殊技',         code: 'KeyF',       displayKey: 'F' },
    weaponWheel:   { label: '武器輪盤',       code: 'KeyQ',       displayKey: 'Q' },
    dash:          { label: '疾衝 Dash',     code: 'ShiftLeft',  displayKey: 'SHIFT' },
    pause:         { label: '暫停遊戲',       code: 'KeyP',       displayKey: 'P' },
    mute:          { label: '靜音切換',       code: 'KeyM',       displayKey: 'M' },
    moveUp:        { label: '向上移動',       code: 'KeyW',       displayKey: 'W' },
    moveDown:      { label: '向下移動',       code: 'KeyS',       displayKey: 'S' },
    moveLeft:      { label: '向左移動',       code: 'KeyA',       displayKey: 'A' },
    moveRight:     { label: '向右移動',       code: 'KeyD',       displayKey: 'D' },
  };

  const STORAGE_KEY = 'tankgame_keybindings';
  let currentBindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS));

  function loadBindingsFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.keys(DEFAULT_BINDINGS).forEach(key => {
          if (parsed[key]) {
            currentBindings[key] = { ...DEFAULT_BINDINGS[key], ...parsed[key] };
          }
        });
      }
    } catch (e) { /* 忽略儲存錯誤 */ }
    applyBindingsToEngine();
  }

  function saveBindingsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentBindings));
    } catch (e) { /* 忽略儲存錯誤 */ }
    applyBindingsToEngine();
  }

  function applyBindingsToEngine() {
    // 將自訂綁定同步到 gameEngine.keyBindings
    Object.keys(currentBindings).forEach(key => {
      if (gameEngine.keyBindings.hasOwnProperty(key)) {
        gameEngine.keyBindings[key] = currentBindings[key].code;
      }
    });
  }

  function resetBindingsToDefault() {
    currentBindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS));
    saveBindingsToStorage();
    renderKeyBindingUI();
    audioEngine.playSfx('menu_click');
  }

  // 隨機處理等待按鍵狀態
  let listeningForKey = null; // 目前要重新綁定的 action key
  function startListeningForKey(actionKey, btnEl) {
    listeningForKey = actionKey;
    btnEl.classList.add('key-listening');
    btnEl.textContent = '…請按下新按鍵…';

    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // 忽略 Escape 中斷
      if (e.code === 'Escape') {
        btnEl.classList.remove('key-listening');
        btnEl.textContent = '重新綁定';
        listeningForKey = null;
        window.removeEventListener('keydown', handler, true);
        return;
      }
      // 更新綁定
      const displayMap = {
        'Space': 'SPACE', 'ShiftLeft': 'L-SHIFT', 'ShiftRight': 'R-SHIFT',
        'ControlLeft': 'L-CTRL', 'ControlRight': 'R-CTRL',
        'AltLeft': 'L-ALT', 'AltRight': 'R-ALT',
        'Enter': 'ENTER', 'Backspace': 'BKSP', 'Tab': 'TAB',
        'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→',
      };
      let displayKey = displayMap[e.code] || e.key.toUpperCase();
      if (e.code.startsWith('Digit')) displayKey = e.code.replace('Digit', '');
      if (e.code.startsWith('Key')) displayKey = e.code.replace('Key', '');

      currentBindings[actionKey] = {
        ...currentBindings[actionKey],
        code: e.code,
        displayKey
      };

      btnEl.classList.remove('key-listening');
      btnEl.textContent = '重新綁定';
      listeningForKey = null;
      window.removeEventListener('keydown', handler, true);

      saveBindingsToStorage();
      renderKeyBindingUI();
    };
    // 使用 capture phase 优先擇取按鍵，避免造成其他操作
    window.addEventListener('keydown', handler, true);
  }

  function renderKeyBindingUI() {
    const container = document.getElementById('keybind-list');
    if (!container) return;
    container.innerHTML = '';
    Object.keys(DEFAULT_BINDINGS).forEach(key => {
      const binding = currentBindings[key];
      const row = document.createElement('div');
      row.className = 'keybind-row';

      const actionSpan = document.createElement('span');
      actionSpan.className = 'keybind-action';
      actionSpan.textContent = binding.label;

      const keyBadge = document.createElement('span');
      keyBadge.className = 'keybind-key-badge';
      keyBadge.id = `keybind-badge-${key}`;
      keyBadge.textContent = binding.displayKey;

      const rebindBtn = document.createElement('button');
      rebindBtn.className = 'keybind-btn';
      rebindBtn.textContent = '重新綁定';
      rebindBtn.addEventListener('click', () => startListeningForKey(key, rebindBtn));

      row.appendChild(actionSpan);
      row.appendChild(keyBadge);
      row.appendChild(rebindBtn);
      container.appendChild(row);
    });
  }

  // 預設綁定載入與 UI 渲染
  loadBindingsFromStorage();
  // DOM 完全建立後再渲染 UI
  requestAnimationFrame(() => renderKeyBindingUI());

  // 恢復預設按鈕
  const btnResetBindings = document.getElementById('btn-reset-bindings');
  if (btnResetBindings) btnResetBindings.addEventListener('click', resetBindingsToDefault);

  function renderLives(lives1 = 3, lives2 = 3) {
    if (uiLivesContainer) {
      uiLivesContainer.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const span1 = document.createElement('span');
        span1.className = `tank-life-icon ${i < lives1 ? 'active' : ''}`;
        uiLivesContainer.appendChild(span1);
      }
    }
    if (uiLivesP2Container) {
      uiLivesP2Container.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const spanP2 = document.createElement('span');
        spanP2.className = `tank-life-icon p2-icon ${i < lives2 ? 'active' : ''}`;
        uiLivesP2Container.appendChild(spanP2);
      }
    }
  }

  // 1. 武器熱鍵欄與 Tab 圓形輪盤控制器
  const wheelItems = document.querySelectorAll('.wheel-item'); // 快取一次，避免每次切換武器都重新查詢 DOM
  function updateWeaponSelectionUI(idx) {
    const selected = weaponsManager.selectWeaponIndex(idx);
    audioEngine.playSfx("menu_click");

    // 更新底部快捷列
    hotbarSlots.forEach(slot => {
      const slotIdx = parseInt(slot.getAttribute('data-index'), 10);
      if (slotIdx === idx) slot.classList.add('active');
      else slot.classList.remove('active');
    });

    // 更新 360 度輪盤
    wheelItems.forEach(item => {
      const itemIdx = parseInt(item.getAttribute('data-index'), 10);
      if (itemIdx === idx) item.classList.add('selected');
      else item.classList.remove('selected');
    });

    if (wheelSelectedName) wheelSelectedName.innerText = selected.name;
    if (wheelSelectedDesc) wheelSelectedDesc.innerText = selected.desc;
  }

  // 快捷列按鈕點擊
  hotbarSlots.forEach(slot => {
    slot.addEventListener('click', () => {
      const idx = parseInt(slot.getAttribute('data-index'), 10);
      updateWeaponSelectionUI(idx);
    });
  });

  // 圓形輪盤按鈕點擊
  wheelItems.forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.getAttribute('data-index'), 10);
      updateWeaponSelectionUI(idx);
    });
  });

  function toggleWeaponWheel(forceShow) {
    audioEngine.playSfx("menu_click");
    if (forceShow !== undefined) {
      if (forceShow) weaponWheelOverlay.classList.remove('hidden');
      else weaponWheelOverlay.classList.add('hidden');
    } else {
      weaponWheelOverlay.classList.toggle('hidden');
    }
  }

  if (btnToggleWeaponWheel) btnToggleWeaponWheel.addEventListener('click', () => toggleWeaponWheel());

  // 2. 戰術抽屜選單 ESC 控制器
  function toggleSettingsDrawer(forceShow) {
    audioEngine.playSfx("menu_click");
    if (forceShow !== undefined) {
      if (forceShow) settingsDrawerOverlay.classList.remove('hidden');
      else settingsDrawerOverlay.classList.add('hidden');
    } else {
      settingsDrawerOverlay.classList.toggle('hidden');
    }
  }

  if (btnToggleSettings) btnToggleSettings.addEventListener('click', () => toggleSettingsDrawer());
  if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', () => toggleSettingsDrawer(false));
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', () => toggleSettingsDrawer(false));

  // 通用「切換按鈕群組」綁定器：點擊時互斥切換 .active 並回呼選中值
  function bindToggleGroup(items, onSelect) {
    items.forEach(({ btn, value }) => {
      if (!btn) return;
      btn.addEventListener('click', () => {
        audioEngine.playSfx("menu_click");
        items.forEach(it => it.btn && it.btn.classList.remove('active'));
        btn.classList.add('active');
        onSelect(value);
      });
    });
  }

  // 視角切換
  bindToggleGroup([
    { btn: btnPerspective2d, value: '2D' },
    { btn: btnPerspective25d, value: '2.5D' }
  ], mode => gameEngine.setCameraPerspectiveMode(mode));

  // 天氣模式
  bindToggleGroup([
    { btn: btnWeatherNone, value: 'none' },
    { btn: btnWeatherRain, value: 'rain' },
    { btn: btnWeatherSnow, value: 'snow' },
    { btn: btnWeatherNight, value: 'night' }
  ], mode => gameEngine.setWeatherMode(mode));

  // 控制模式
  bindToggleGroup([
    { btn: btnControlMouse, value: 'mouse_keyboard' },
    { btn: btnControlKeys, value: 'keyboard' }
  ], mode => gameEngine.setControlMode(mode));

  // 難易度
  bindToggleGroup([
    { btn: btnDiffEasy, value: 'easy' },
    { btn: btnDiffNormal, value: 'normal' },
    { btn: btnDiffHard, value: 'hard' },
    { btn: btnDiffHell, value: 'hell' }
  ], diff => gameEngine.setDifficulty(diff));

  // 1P / 2P 遊戲模式
  bindToggleGroup([
    { btn: btnMode1p, value: '1P' },
    { btn: btnMode2p, value: '2P' }
  ], mode => {
    gameEngine.setGameMode(mode);
    if (uiLivesP2Container) uiLivesP2Container.closest('.metric-group').style.display = mode === '2P' ? '' : 'none';
  });
  // 預設為 1P，開場先隱藏 P2 生命 HUD（對齊 btn-mode-1p 的預設 active 狀態）
  if (uiLivesP2Container) uiLivesP2Container.closest('.metric-group').style.display = 'none';

  // 聲音開關（isSoundOn 已在上方宣告）
  if (btnToggleSound) btnToggleSound.addEventListener('click', () => {
    isSoundOn = !isSoundOn;
    audioEngine.playSfx("menu_click");
    if (isSoundOn) {
      btnToggleSound.classList.add('active');
      btnToggleSound.innerText = '🔊 音效開啟';
      audioEngine.setSfxVolume(1.0);
      audioEngine.setBgmVolume(0.8);
    } else {
      btnToggleSound.classList.remove('active');
      btnToggleSound.innerText = '🔇 音效靜音';
      audioEngine.setSfxVolume(0);
      audioEngine.setBgmVolume(0);
    }
  });

  // 暫停 Overlay 按鈕
  const btnPauseResume = document.getElementById('btn-pause-resume');
  if (btnPauseResume) {
    btnPauseResume.addEventListener('click', () => {
      gameEngine.togglePause();
    });
  }

  // 關卡預覽（先確保對應 JSON 區塊已快取，讓預覽與實際進場地圖一致）
  let previewStageNum = 1;
  async function updatePreview() {
    if (previewStageLabel) previewStageLabel.innerText = `第 ${String(previewStageNum).padStart(3, '0')} 關`;
    await levelManager.preloadJSON(previewStageNum);
    levelManager.renderPreview(previewCanvas, previewStageNum);
  }

  if (btnPrevStage) btnPrevStage.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    previewStageNum = previewStageNum > 1 ? previewStageNum - 1 : 200;
    updatePreview();
  });

  if (btnNextStage) btnNextStage.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    previewStageNum = previewStageNum < 200 ? previewStageNum + 1 : 1;
    updatePreview();
  });

  // ===== 選擇關卡畫面 (1~200) =====
  function openStageSelect() {
    audioEngine.playSfx("menu_click");
    if (stageSelectGrid && !stageSelectGrid.children.length) {
      for (let i = 1; i <= 200; i++) {
        const cell = document.createElement('button');
        cell.className = 'stage-select-cell';
        cell.textContent = String(i).padStart(3, '0');
        cell.addEventListener('click', () => {
          previewStageNum = i;
          if (stageSelectOverlay) stageSelectOverlay.classList.add('hidden');
          startGame();
        });
        stageSelectGrid.appendChild(cell);
      }
    }
    if (stageSelectOverlay) stageSelectOverlay.classList.remove('hidden');
  }

  if (btnSelectStage) btnSelectStage.addEventListener('click', openStageSelect);
  if (btnStageSelectClose) btnStageSelectClose.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    if (stageSelectOverlay) stageSelectOverlay.classList.add('hidden');
  });

  // ===== 地圖編輯器 (26x26 手繪地形，可儲存並直接試玩) =====
  const EDITOR_TILES = [
    { value: TILE.EMPTY, label: '空地', color: '#232838' },
    { value: TILE.BRICK, label: '磚牆', color: '#c63d12' },
    { value: TILE.STEEL, label: '鋼板', color: '#78909c' },
    { value: TILE.WATER, label: '水域', color: '#00b0ff' },
    { value: TILE.TREES, label: '叢林', color: '#2e7d32' },
    { value: TILE.ICE,   label: '冰地', color: '#80deea' },
    { value: TILE.SAND,  label: '沙地', color: '#d4a373' },
    { value: TILE.BOOST, label: '加速', color: '#00f5d4' },
    { value: TILE.LAVA,  label: '熔岩', color: '#ff4800' },
    { value: TILE.BASE,  label: '基地', color: '#ffb300' },
  ];

  let editorGrid = null;
  let selectedEditorTile = TILE.BRICK;
  let isPaintingEditor = false;

  function createEmptyEditorGrid() {
    const grid = Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill(TILE.EMPTY));
    // 預先放置鷹徽基地磚牆，對齊 Engine 固定出生座標 (12, 23)，與正式關卡生成邏輯一致
    grid[24][12] = TILE.BRICK; grid[24][13] = TILE.BRICK;
    grid[25][12] = TILE.BRICK; grid[25][13] = TILE.BASE;
    grid[23][11] = TILE.BRICK; grid[23][12] = TILE.BRICK; grid[23][13] = TILE.BRICK; grid[23][14] = TILE.BRICK;
    grid[24][11] = TILE.BRICK; grid[24][14] = TILE.BRICK;
    grid[25][11] = TILE.BRICK; grid[25][14] = TILE.BRICK;
    return grid;
  }

  function renderEditorCanvas() {
    if (!editorCanvas || !editorGrid) return;
    const ctx = editorCanvas.getContext('2d');
    const cell = editorCanvas.width / MAP_SIZE;
    ctx.fillStyle = '#0b0e16';
    ctx.fillRect(0, 0, editorCanvas.width, editorCanvas.height);

    for (let r = 0; r < MAP_SIZE; r++) {
      for (let c = 0; c < MAP_SIZE; c++) {
        const tileVal = editorGrid[r][c];
        if (tileVal === TILE.EMPTY) continue;
        const tileDef = EDITOR_TILES.find(t => t.value === tileVal);
        if (tileDef) {
          ctx.fillStyle = tileDef.color;
          ctx.fillRect(c * cell, r * cell, cell - 1, cell - 1);
        }
      }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.beginPath();
    for (let i = 0; i <= MAP_SIZE; i++) {
      ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, editorCanvas.height);
      ctx.moveTo(0, i * cell); ctx.lineTo(editorCanvas.width, i * cell);
    }
    ctx.stroke();
  }

  function paintEditorCellAt(clientX, clientY) {
    if (!editorGrid) return;
    const rect = editorCanvas.getBoundingClientRect();
    const c = Math.floor((clientX - rect.left) / (rect.width / MAP_SIZE));
    const r = Math.floor((clientY - rect.top) / (rect.height / MAP_SIZE));
    if (r < 0 || r >= MAP_SIZE || c < 0 || c >= MAP_SIZE) return;
    editorGrid[r][c] = selectedEditorTile;
    renderEditorCanvas();
  }

  function buildEditorPalette() {
    if (!editorPaletteRow || editorPaletteRow.children.length) return;
    EDITOR_TILES.forEach((t, idx) => {
      const btn = document.createElement('button');
      btn.className = 'editor-tile-btn' + (idx === 1 ? ' active' : '');
      btn.style.setProperty('--tile-color', t.color);
      btn.textContent = t.label;
      btn.addEventListener('click', () => {
        selectedEditorTile = t.value;
        editorPaletteRow.querySelectorAll('.editor-tile-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
      editorPaletteRow.appendChild(btn);
    });
  }

  function openMapEditor() {
    audioEngine.playSfx("menu_click");
    buildEditorPalette();
    editorGrid = StorageManager.loadCustomMap() || createEmptyEditorGrid();
    renderEditorCanvas();
    if (mapEditorOverlay) mapEditorOverlay.classList.remove('hidden');
  }

  if (btnStageEditor) btnStageEditor.addEventListener('click', openMapEditor);
  if (btnEditorClose) btnEditorClose.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    if (mapEditorOverlay) mapEditorOverlay.classList.add('hidden');
  });

  if (editorCanvas) {
    editorCanvas.addEventListener('mousedown', e => {
      isPaintingEditor = true;
      paintEditorCellAt(e.clientX, e.clientY);
    });
    editorCanvas.addEventListener('mousemove', e => {
      if (isPaintingEditor) paintEditorCellAt(e.clientX, e.clientY);
    });
    editorCanvas.addEventListener('contextmenu', e => e.preventDefault());
  }
  window.addEventListener('mouseup', () => { isPaintingEditor = false; });

  if (btnEditorClear) btnEditorClear.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    editorGrid = createEmptyEditorGrid();
    renderEditorCanvas();
  });

  if (btnEditorRandom) btnEditorRandom.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    editorGrid = MapDataGenerator.generateStage(Math.floor(Math.random() * 200) + 1);
    renderEditorCanvas();
  });

  if (btnEditorSave) btnEditorSave.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    StorageManager.saveCustomMap(editorGrid);
  });

  if (btnEditorTestPlay) btnEditorTestPlay.addEventListener('click', () => {
    if (!editorGrid) return;
    audioEngine.playSfx("menu_start");
    levelManager.setCustomMap(editorGrid);
    if (mapEditorOverlay) mapEditorOverlay.classList.add('hidden');
    startGame();
  });

  // 全局 鍵盤熱鍵 (Q: 武器輪盤, ESC: 戰術抽屜, 1-6: 武器, P: 暫停, M: 靜音)
  // 注意：Q/Tab/P/M 已進中 Engine.bindEvents() 處理（透過回調）
  // 這裡僅處理 ESC 抽屜 + 數字鍵武器切換 + Enter/Space 開始遊戲
  window.addEventListener('keydown', e => {
    if (e.code === 'Escape') {
      e.preventDefault();
      toggleSettingsDrawer();
    } else if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].includes(e.code)) {
      const num = parseInt(e.code.replace('Digit', ''), 10) - 1;
      updateWeaponSelectionUI(num);
    } else if (e.code === 'Enter' || e.code === 'Space') {
      if (!overlay.classList.contains('hidden') && gameEngine.state !== 'PLAYING') {
        e.preventDefault();
        startGame();
      } else if (scoreTallyOverlay && !scoreTallyOverlay.classList.contains('hidden')) {
        e.preventDefault();
        continueFromTally();
      }
    }
  });

  // 開始遊戲
  async function startGame() {
    audioEngine.playSfx("menu_start");
    overlay.classList.add('hidden');
    await gameEngine.startStage(previewStageNum);
  }

  if (btnStartGame) btnStartGame.addEventListener('click', () => startGame());

  // 戰報結算
  const scoreTallyOverlay = document.getElementById('score-tally-overlay');
  const tallyTitle = document.getElementById('tally-title');
  const tallyBodyGrid = document.getElementById('tally-body-grid');
  const tallyTotalScore = document.getElementById('tally-total-score');
  const tallyRankBadge = document.getElementById('tally-rank-badge');
  const btnTallyContinue = document.getElementById('btn-tally-continue');

  const KILL_TYPE_LABELS = { basic: '基本兵', fast: '快速兵', power: '強化兵', armor: '重裝兵', chaser: '追擊兵', patrol: '巡邏兵', kamikaze: '自爆兵' };

  function renderKillTally(container, killsP1, killsP2, gameMode) {
    if (!container) return;
    container.innerHTML = '';
    const addRows = (kills, ownerLabel) => {
      Object.keys(KILL_TYPE_LABELS).forEach(type => {
        const count = (kills && kills[type]) || 0;
        if (count <= 0) return;
        const row = document.createElement('div');
        row.className = 'tally-row';
        row.innerHTML = `<span class="tally-row-label">${ownerLabel}${KILL_TYPE_LABELS[type]}</span><span class="tally-row-value">x${count}</span>`;
        container.appendChild(row);
      });
    };
    addRows(killsP1, gameMode === '2P' ? 'P1 ' : '');
    if (gameMode === '2P') addRows(killsP2, 'P2 ');
    if (!container.children.length) {
      const empty = document.createElement('div');
      empty.className = 'tally-row tally-row-empty';
      empty.textContent = '無擊殺紀錄';
      container.appendChild(empty);
    }
  }

  function runScoreTallyAnimation(data, isVictory) {
    scoreTallyOverlay.classList.remove('hidden');
    const stageFormatted = String(data.stage || levelManager.currentStage).padStart(3, '0');
    if (tallyTitle) tallyTitle.innerText = isVictory ? `STAGE ${stageFormatted} CLEAR!` : `STAGE ${stageFormatted} FAILED`;
    if (tallyTotalScore) tallyTotalScore.innerText = String(data.score).padStart(7, '0');
    if (tallyRankBadge) tallyRankBadge.innerText = isVictory ? 'ACE ★★★ (S級)' : 'SOLDIER (C級)';
    if (btnTallyContinue) btnTallyContinue.innerText = isVictory ? '⚔️ 進入下一關 (SPACE)' : '🔁 重新挑戰 (SPACE)';
    renderKillTally(tallyBodyGrid, data.killsP1, data.killsP2, gameEngine.gameMode);
  }

  async function continueFromTally() {
    if (!scoreTallyOverlay || scoreTallyOverlay.classList.contains('hidden')) return;
    audioEngine.playSfx("menu_click");
    scoreTallyOverlay.classList.add('hidden');
    if (gameEngine.state === 'VICTORY') {
      await gameEngine.startStage(levelManager.currentStage + 1);
    } else {
      await gameEngine.startStage(levelManager.currentStage);
    }
  }

  if (btnTallyContinue) {
    btnTallyContinue.addEventListener('click', () => continueFromTally());
  }

  // 60FPS 動畫主迴圈
  function gameLoop() {
    gameEngine.update();
    gameEngine.render();
    levelManager.renderMinimap(minimapCanvas, gameEngine.player1, gameEngine.enemiesOnField);
    requestAnimationFrame(gameLoop);
  }

  updatePreview();
  requestAnimationFrame(gameLoop);
});
