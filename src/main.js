/* =========================================================
   main.js - 鋼鐵前線 1988 主入口與 UI 控制器 (Production Ready 完整版)
   ========================================================= */

import './style.css';
import { SymphonicAudioEngine } from './audio/SymphonicAudioEngine.js';
import { LevelManager } from './game/LevelManager.js';
import { WeaponsManager } from './game/WeaponsSystem.js';
import { GameEngine } from './game/Engine.js';
import { MapDataGenerator, MAP_SIZE } from './game/MapData.js';
import { StorageManager } from './game/StorageManager.js';

document.addEventListener('DOMContentLoaded', () => {
  // 註冊 Service Worker PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('SW register failed:', err);
    });
  }

  // DOM 元素引用
  const gameCanvas = document.getElementById('game-canvas');
  const minimapCanvas = document.getElementById('minimap-canvas');
  const previewCanvas = document.getElementById('preview-canvas');
  const editorCanvas = document.getElementById('editor-canvas');

  const uiStageText = document.getElementById('ui-current-stage');
  const battleStageNum = document.getElementById('battle-stage-num');
  const uiScoreText = document.getElementById('ui-score');
  const uiEnemiesLeftText = document.getElementById('ui-enemies-left');
  const uiLivesContainer = document.getElementById('ui-lives');
  const footerLivesContainer = document.getElementById('footer-lives');
  const previewStageLabel = document.getElementById('preview-stage-label');

  const overlay = document.getElementById('game-overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlaySubtitle = document.getElementById('overlay-subtitle');
  const btnStartGame = document.getElementById('btn-start-game');
  const btnSelectStage = document.getElementById('btn-select-stage');
  const btnStageEditor = document.getElementById('btn-stage-editor');

  const btnPrevStage = document.getElementById('btn-prev-stage');
  const btnNextStage = document.getElementById('btn-next-stage');

  const weaponsGrid = document.getElementById('weapons-grid');
  const weaponPageText = document.getElementById('weapon-page-text');
  const btnWeaponPrev = document.getElementById('btn-weapon-prev');
  const btnWeaponNext = document.getElementById('btn-weapon-next');
  const toolTitle = document.getElementById('tool-title');
  const toolDesc = document.getElementById('tool-desc');

  const bgmSlider = document.getElementById('bgm-slider');
  const sfxSlider = document.getElementById('sfx-slider');

  // Modals
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsModal = document.getElementById('close-settings-modal');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const settingDifficulty = document.getElementById('setting-difficulty');
  const settingControlMode = document.getElementById('setting-control-mode');
  const btnToggleFullscreen = document.getElementById('btn-toggle-fullscreen');
  const btnToggleMute = document.getElementById('btn-toggle-mute');

  const hudDashBar = document.getElementById('hud-dash-bar');
  const hudModeBadge = document.getElementById('hud-mode-badge');

  const stageSelectModal = document.getElementById('stage-select-modal');
  const closeStageModal = document.getElementById('close-stage-modal');
  const stageButtonsContainer = document.getElementById('stage-buttons-container');
  const stagePagePrev = document.getElementById('stage-page-prev');
  const stagePageNext = document.getElementById('stage-page-next');
  const stagePageLabel = document.getElementById('stage-page-label');

  const editorModal = document.getElementById('editor-modal');
  const closeEditorModal = document.getElementById('close-editor-modal');
  const btnEditorClear = document.getElementById('btn-editor-clear');
  const btnEditorPlay = document.getElementById('btn-editor-play');

  // 初始化各模組
  const audioEngine = new SymphonicAudioEngine();
  const levelManager = new LevelManager();
  const weaponsManager = new WeaponsManager();

  const crtOverlay = document.getElementById('crt-overlay');
  const appContainer = document.getElementById('app');
  const btnToggleCrt = document.getElementById('btn-toggle-crt');
  const btnToggleArcade = document.getElementById('btn-toggle-arcade');
  const modalBtnToggleCrt = document.getElementById('modal-btn-toggle-crt');
  const modalBtnToggleArcade = document.getElementById('modal-btn-toggle-arcade');

  const btnToggle25d = document.getElementById('btn-toggle-25d');
  const btnToggleWeather = document.getElementById('btn-toggle-weather');
  const bossHudBar = document.getElementById('boss-hud-bar');
  const bossHpFill = document.getElementById('boss-hp-fill');

  // 讀取 LocalStorage 存檔紀錄
  const saveData = StorageManager.getSaveData();
  saveData.unlockedWeapons.forEach(id => weaponsManager.unlockWeapon(id));
  bgmSlider.value = saveData.bgmVolume;
  sfxSlider.value = saveData.sfxVolume;
  settingDifficulty.value = saveData.difficulty;
  if (settingControlMode) settingControlMode.value = saveData.controlMode || 'mouse_keyboard';
  audioEngine.setBgmVolume(saveData.bgmVolume / 100);
  audioEngine.setSfxVolume(saveData.sfxVolume / 100);

  let crtEnabled = saveData.crtEnabled !== undefined ? saveData.crtEnabled : true;
  let arcadeModeEnabled = saveData.arcadeModeEnabled !== undefined ? saveData.arcadeModeEnabled : true;
  let cameraMode = saveData.cameraMode || '2.5D';
  let currentWeather = saveData.weatherMode || 'none';

  function applyCrtState(enabled) {
    crtEnabled = enabled;
    if (crtOverlay) {
      if (crtEnabled) crtOverlay.classList.remove('hidden');
      else crtOverlay.classList.add('hidden');
    }
    StorageManager.save({ crtEnabled });
  }

  function applyArcadeState(enabled) {
    arcadeModeEnabled = enabled;
    if (appContainer) {
      if (arcadeModeEnabled) appContainer.classList.add('arcade-frame-mode');
      else appContainer.classList.remove('arcade-frame-mode');
    }
    StorageManager.save({ arcadeModeEnabled });
  }

  function applyCameraMode(mode) {
    cameraMode = mode;
    gameEngine.setCameraPerspectiveMode(mode);
    if (btnToggle25d) {
      btnToggle25d.innerText = mode === '2.5D' ? '📐 2.5D視角' : '🗺️ 2D視角';
    }
    StorageManager.save({ cameraMode: mode });
  }

  const weatherList = ['none', 'rain', 'snow', 'night'];
  function cycleWeather() {
    const idx = (weatherList.indexOf(currentWeather) + 1) % weatherList.length;
    currentWeather = weatherList[idx];
    gameEngine.setWeatherMode(currentWeather);
    StorageManager.save({ weatherMode: currentWeather });
  }

  applyCrtState(crtEnabled);
  applyArcadeState(arcadeModeEnabled);

  if (btnToggleCrt) btnToggleCrt.addEventListener('click', () => { audioEngine.playSfx("menu_click"); applyCrtState(!crtEnabled); });
  if (modalBtnToggleCrt) modalBtnToggleCrt.addEventListener('click', () => { audioEngine.playSfx("menu_click"); applyCrtState(!crtEnabled); });

  if (btnToggleArcade) btnToggleArcade.addEventListener('click', () => { audioEngine.playSfx("menu_click"); applyArcadeState(!arcadeModeEnabled); });
  if (modalBtnToggleArcade) modalBtnToggleArcade.addEventListener('click', () => { audioEngine.playSfx("menu_click"); applyArcadeState(!arcadeModeEnabled); });

  if (btnToggle25d) btnToggle25d.addEventListener('click', () => { audioEngine.playSfx("menu_click"); applyCameraMode(cameraMode === '2.5D' ? '2D' : '2.5D'); });
  if (btnToggleWeather) btnToggleWeather.addEventListener('click', () => { audioEngine.playSfx("menu_click"); cycleWeather(); });

  let previewStageNum = 2;
  let stageSelectPage = 1;
  let currentBrushTile = 1;
  let editorGrid = MapDataGenerator.generateStage(1);
  let isMouseDownOnEditor = false;

  function renderWeaponsGrid() {
    weaponsGrid.innerHTML = '';
    const items = weaponsManager.getPageItems(weaponsManager.currentPage);
    weaponPageText.innerText = `頁次 ${weaponsManager.currentPage} / ${weaponsManager.getTotalPages()}`;

    items.forEach(w => {
      const isUnlocked = weaponsManager.isUnlocked(w.id);
      const isActive = weaponsManager.isActive(w.id);

      const card = document.createElement('div');
      card.className = `weapon-card ${isUnlocked ? 'unlocked' : ''} ${isActive ? 'active' : ''}`;
      card.innerHTML = `
        <div class="weapon-icon-box">${w.icon}</div>
        <div class="weapon-name-text">${w.name}</div>
      `;

      card.addEventListener('mouseenter', () => {
        toolTitle.innerText = `[${w.name}] (${w.category})`;
        toolDesc.innerText = w.desc;
      });

      card.addEventListener('click', () => {
        audioEngine.playSfx("menu_click");
        if (isUnlocked) {
          if (isActive) weaponsManager.deactivateWeapon(w.id);
          else weaponsManager.activateWeapon(w.id);
          renderWeaponsGrid();
        } else {
          weaponsManager.unlockWeapon(w.id);
          weaponsManager.activateWeapon(w.id);
          StorageManager.save({ unlockedWeapons: Array.from(weaponsManager.unlockedIds) });
          renderWeaponsGrid();
        }
      });

      weaponsGrid.appendChild(card);
    });
  }

  const btnMode1p = document.getElementById('btn-mode-1p');
  const btnMode2p = document.getElementById('btn-mode-2p');
  const rowP2Lives = document.getElementById('row-p2-lives');
  const uiLivesP2Container = document.getElementById('ui-lives-p2');

  function renderLives(lives1 = 3, lives2 = 3) {
    uiLivesContainer.innerHTML = '';
    footerLivesContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const span1 = document.createElement('span');
      span1.className = `tank-life-icon ${i < lives1 ? 'active' : ''}`;
      uiLivesContainer.appendChild(span1);

      const span2 = document.createElement('span');
      span2.className = `mini-tank-icon ${i < lives1 ? 'active' : ''}`;
      footerLivesContainer.appendChild(span2);
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

  const scoreTallyOverlay = document.getElementById('score-tally-overlay');
  const tallyTitle = document.getElementById('tally-title');
  const tallyBodyGrid = document.getElementById('tally-body-grid');
  const tallyTotalScore = document.getElementById('tally-total-score');
  const tallyRankBadge = document.getElementById('tally-rank-badge');
  const btnTallyContinue = document.getElementById('btn-tally-continue');

  let isTallying = false;
  let nextActionIsVictory = true;

  function runScoreTallyAnimation(data, isVictory) {
    isTallying = true;
    nextActionIsVictory = isVictory;

    overlay.classList.add('hidden');
    scoreTallyOverlay.classList.remove('hidden');

    const stageFormatted = String(data.stage).padStart(3, '0');
    tallyTitle.innerText = isVictory ? `STAGE ${stageFormatted} CLEAR!` : `STAGE ${stageFormatted} FAILED`;
    tallyBodyGrid.innerHTML = '';
    tallyTotalScore.innerText = String(data.score).padStart(7, '0');

    const rowsToRender = [];
    const enemyMeta = [
      { type: 'basic', label: '普通坦克', pts: 100, icon: '🤖' },
      { type: 'fast', label: '高速坦克', pts: 200, icon: '⚡' },
      { type: 'power', label: '火力坦克', pts: 300, icon: '💣' },
      { type: 'armor', label: '重裝坦克', pts: 400, icon: '🛡️' }
    ];

    enemyMeta.forEach(meta => {
      const cnt1 = (data.killsP1 && data.killsP1[meta.type]) || 0;
      if (cnt1 > 0 || !data.is2P) {
        rowsToRender.push({ player: data.is2P ? 'P1' : '', enemy: meta, count: cnt1 });
      }
      if (data.is2P) {
        const cnt2 = (data.killsP2 && data.killsP2[meta.type]) || 0;
        rowsToRender.push({ player: 'P2', enemy: meta, count: cnt2 });
      }
    });

    let currentStep = 0;
    let totalKillsCount = 0;

    function renderNextRow() {
      if (currentStep < rowsToRender.length) {
        const item = rowsToRender[currentStep];
        totalKillsCount += item.count;
        const subtotal = item.count * item.enemy.pts;

        const rowDiv = document.createElement('div');
        rowDiv.className = 'tally-row';
        rowDiv.innerHTML = `
          ${item.player ? `<span class="player-badge">${item.player}</span>` : ''}
          <div class="enemy-badge">
            <span class="enemy-icon">${item.enemy.icon}</span>
            <span>${item.enemy.label}</span>
          </div>
          <div class="score-calc">${item.enemy.pts} PTS × ${item.count}</div>
          <div class="subtotal-val">+${subtotal}</div>
        `;
        tallyBodyGrid.appendChild(rowDiv);
        audioEngine.playSfx("menu_click");

        currentStep++;
        setTimeout(renderNextRow, 220);
      } else {
        let rankClass = 'rank-c';
        let rankText = 'SOLDIER (C級)';
        if (data.score >= 3500 || totalKillsCount >= 18) {
          rankClass = 'rank-s'; rankText = 'ACE ★★★ (S級)';
        } else if (data.score >= 2000 || totalKillsCount >= 12) {
          rankClass = 'rank-a'; rankText = 'COMMANDER ★★ (A級)';
        } else if (data.score >= 1000 || totalKillsCount >= 6) {
          rankClass = 'rank-b'; rankText = 'VETERAN ★ (B級)';
        }

        tallyRankBadge.className = `rank-badge ${rankClass}`;
        tallyRankBadge.innerText = rankText;

        btnTallyContinue.innerText = isVictory ? "⚔️ 進入下一關 (SPACE)" : "⚔️ 重新發動攻擊 (SPACE)";
        isTallying = false;
      }
    }

    renderNextRow();
  }

  const gameEngine = new GameEngine(
    gameCanvas,
    levelManager,
    audioEngine,
    weaponsManager,
    {
      onStatusUpdate: (status) => {
        const stageFormatted = String(status.stage).padStart(3, '0');
        uiStageText.innerText = `${stageFormatted} / 200`;
        battleStageNum.innerText = stageFormatted;
        uiScoreText.innerText = String(status.score).padStart(7, '0');
        uiEnemiesLeftText.innerText = String(status.enemiesLeft).padStart(2, '0');
        renderLives(status.lives, status.lives2);
        StorageManager.updateHighScore(status.score);

        // 即時更新 Boss 血條 HUD
        if (bossHudBar && bossHpFill) {
          if (status.bossMaxHp > 0 && status.bossHp > 0) {
            bossHudBar.classList.remove('hidden');
            const ratio = Math.max(0, (status.bossHp / status.bossMaxHp) * 100);
            bossHpFill.style.width = `${ratio}%`;
            bossHpFill.innerText = `${status.bossHp} / ${status.bossMaxHp}`;
          } else {
            bossHudBar.classList.add('hidden');
          }
        }
      },
      onWeaponUnlock: () => {
        StorageManager.save({ unlockedWeapons: Array.from(weaponsManager.unlockedIds) });
        renderWeaponsGrid();
      },
      onGameOver: (tallyData) => {
        runScoreTallyAnimation(tallyData, false);
      },
      onVictory: (tallyData) => {
        StorageManager.unlockStage(levelManager.currentStage + 1);
        runScoreTallyAnimation(tallyData, true);
      }
    }
  );

  btnTallyContinue.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    scoreTallyOverlay.classList.add('hidden');
    if (nextActionIsVictory) {
      levelManager.nextStage();
      gameEngine.startStage(levelManager.currentStage);
    } else {
      gameEngine.startStage(levelManager.currentStage);
    }
  });

  let currentGameMode = saveData.gameMode || '1P';

  function applyGameMode(mode) {
    currentGameMode = mode;
    gameEngine.setGameMode(mode);

    if (btnMode1p && btnMode2p) {
      if (mode === '2P') {
        btnMode1p.classList.remove('active');
        btnMode2p.classList.add('active');
        if (rowP2Lives) rowP2Lives.style.display = 'flex';
      } else {
        btnMode1p.classList.add('active');
        btnMode2p.classList.remove('active');
        if (rowP2Lives) rowP2Lives.style.display = 'none';
      }
    }
    StorageManager.save({ gameMode: mode });
  }

  applyGameMode(currentGameMode);

  if (btnMode1p) btnMode1p.addEventListener('click', () => { audioEngine.playSfx("menu_click"); applyGameMode('1P'); });
  if (btnMode2p) btnMode2p.addEventListener('click', () => { audioEngine.playSfx("menu_click"); applyGameMode('2P'); });

  gameEngine.setDifficulty(saveData.difficulty);
  gameEngine.setControlMode(saveData.controlMode || 'mouse_keyboard');

  function updateHudUI() {
    if (!gameEngine.player) return;
    if (hudDashBar) {
      const cdRatio = gameEngine.player.dashCooldown / gameEngine.player.maxDashCooldown;
      const readyPercent = Math.max(0, Math.min(100, (1 - cdRatio) * 100));
      hudDashBar.style.width = `${readyPercent}%`;
      if (readyPercent >= 100) {
        hudDashBar.innerText = 'READY';
        hudDashBar.className = 'hud-bar-fill ready';
      } else {
        hudDashBar.innerText = `${Math.ceil(gameEngine.player.dashCooldown / 60)}S`;
        hudDashBar.className = 'hud-bar-fill cooldown';
      }
    }
    if (hudModeBadge) {
      if (gameEngine.controlMode === 'mouse_keyboard') hudModeBadge.innerText = '鍵鼠 360° 模式';
      else if (gameEngine.controlMode === 'keyboard_only') hudModeBadge.innerText = '經典純鍵盤';
      else if (gameEngine.controlMode === 'mouse_only') hudModeBadge.innerText = '純滑鼠模式';
    }
  }

  function startGame() {
    audioEngine.resume();
    overlay.classList.add('hidden');
    if (gameEngine.state === 'VICTORY') {
      levelManager.nextStage();
    }
    gameEngine.startStage(levelManager.currentStage);
  }

  btnStartGame.addEventListener('click', startGame);

  window.addEventListener('keydown', (e) => {
    if ((e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space')) {
      if (!scoreTallyOverlay.classList.contains('hidden') && !isTallying) {
        e.preventDefault();
        btnTallyContinue.click();
      } else if (!overlay.classList.contains('hidden')) {
        e.preventDefault();
        startGame();
      }
    }
  });

  // Page Visibility API 節能優化
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      audioEngine.stopBgm();
    } else {
      if (gameEngine.state === 'PLAYING') audioEngine.startBgm();
    }
  });

  // Settings
  btnOpenSettings.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    settingsModal.classList.remove('hidden');
  });

  closeSettingsModal.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  saveSettingsBtn.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    gameEngine.setDifficulty(settingDifficulty.value);
    const mode = settingControlMode ? settingControlMode.value : 'mouse_keyboard';
    gameEngine.setControlMode(mode);
    StorageManager.save({ difficulty: settingDifficulty.value, controlMode: mode });
    settingsModal.classList.add('hidden');
  });

  btnToggleFullscreen.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  });

  let isMuted = false;
  btnToggleMute.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    isMuted = !isMuted;
    audioEngine.setBgmVolume(isMuted ? 0 : 0.6);
    audioEngine.setSfxVolume(isMuted ? 0 : 0.8);
    bgmSlider.value = isMuted ? 0 : 60;
    sfxSlider.value = isMuted ? 0 : 80;
    StorageManager.save({ bgmVolume: bgmSlider.value, sfxVolume: sfxSlider.value });
  });

  // Stage Selector
  btnSelectStage.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    renderStageButtons();
    stageSelectModal.classList.remove('hidden');
  });

  closeStageModal.addEventListener('click', () => {
    stageSelectModal.classList.add('hidden');
  });

  function renderStageButtons() {
    stageButtonsContainer.innerHTML = '';
    const startStage = (stageSelectPage - 1) * 50 + 1;
    const endStage = Math.min(200, stageSelectPage * 50);
    const maxUnlocked = StorageManager.getSaveData().maxUnlockedStage;
    stagePageLabel.innerText = `關卡 ${startStage} - ${endStage}`;

    for (let i = startStage; i <= endStage; i++) {
      const btn = document.createElement('button');
      btn.className = `stage-grid-btn ${i <= maxUnlocked ? 'unlocked' : ''}`;
      btn.innerText = String(i).padStart(3, '0');
      btn.addEventListener('click', () => {
        audioEngine.playSfx("menu_click");
        levelManager.loadStage(i);
        stageSelectModal.classList.add('hidden');
        startGame();
      });
      stageButtonsContainer.appendChild(btn);
    }
  }

  stagePagePrev.addEventListener('click', () => {
    if (stageSelectPage > 1) {
      stageSelectPage--;
      renderStageButtons();
    }
  });

  stagePageNext.addEventListener('click', () => {
    if (stageSelectPage < 4) {
      stageSelectPage++;
      renderStageButtons();
    }
  });

  // Stage Editor
  btnStageEditor.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    editorGrid = MapDataGenerator.generateStage(levelManager.currentStage);
    renderEditorCanvas();
    editorModal.classList.remove('hidden');
  });

  closeEditorModal.addEventListener('click', () => {
    editorModal.classList.add('hidden');
  });

  const paletteButtons = document.querySelectorAll('.palette-btn');
  paletteButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      paletteButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentBrushTile = parseInt(btn.dataset.tile);
    });
  });

  function renderEditorCanvas() {
    if (!editorCanvas) return;
    const ctx = editorCanvas.getContext('2d');
    const w = editorCanvas.width;
    const h = editorCanvas.height;
    const tileSize = w / MAP_SIZE;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    for (let r = 0; r < MAP_SIZE; r++) {
      for (let c = 0; c < MAP_SIZE; c++) {
        const tile = editorGrid[r][c];
        const x = c * tileSize;
        const y = r * tileSize;

        if (tile === 1) { ctx.fillStyle = '#d84315'; ctx.fillRect(x, y, tileSize, tileSize); }
        else if (tile === 2) { ctx.fillStyle = '#90a4ae'; ctx.fillRect(x, y, tileSize, tileSize); }
        else if (tile === 3) { ctx.fillStyle = '#0288d1'; ctx.fillRect(x, y, tileSize, tileSize); }
        else if (tile === 4) { ctx.fillStyle = '#2e7d32'; ctx.fillRect(x, y, tileSize, tileSize); }
        else if (tile === 5) { ctx.fillStyle = '#80deea'; ctx.fillRect(x, y, tileSize, tileSize); }
        else if (tile === 6) { ctx.fillStyle = '#ffca28'; ctx.fillRect(x, y, tileSize, tileSize); }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.strokeRect(x, y, tileSize, tileSize);
      }
    }
  }

  function applyBrushToEditor(e) {
    const rect = editorCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const tileSize = editorCanvas.width / MAP_SIZE;
    const c = Math.floor(x / tileSize);
    const r = Math.floor(y / tileSize);

    if (r >= 0 && r < MAP_SIZE && c >= 0 && c < MAP_SIZE) {
      if (editorGrid[r][c] !== 6) {
        editorGrid[r][c] = currentBrushTile;
        renderEditorCanvas();
      }
    }
  }

  editorCanvas.addEventListener('mousedown', (e) => {
    isMouseDownOnEditor = true;
    applyBrushToEditor(e);
  });

  editorCanvas.addEventListener('mousemove', (e) => {
    if (isMouseDownOnEditor) applyBrushToEditor(e);
  });

  window.addEventListener('mouseup', () => {
    isMouseDownOnEditor = false;
  });

  btnEditorClear.addEventListener('click', () => {
    for (let r = 0; r < MAP_SIZE; r++) {
      for (let c = 0; c < MAP_SIZE; c++) {
        if (editorGrid[r][c] !== 6) editorGrid[r][c] = 0;
      }
    }
    renderEditorCanvas();
  });

  btnEditorPlay.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    levelManager.setCustomMap(editorGrid);
    editorModal.classList.add('hidden');
    startGame();
  });

  function updatePreviewLabel() {
    previewStageLabel.innerText = `預覽第 ${String(previewStageNum).padStart(3, '0')} 關`;
  }

  btnPrevStage.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    previewStageNum = previewStageNum > 1 ? previewStageNum - 1 : 200;
    updatePreviewLabel();
    levelManager.renderPreview(previewCanvas, previewStageNum);
  });

  btnNextStage.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    previewStageNum = previewStageNum < 200 ? previewStageNum + 1 : 1;
    updatePreviewLabel();
    levelManager.renderPreview(previewCanvas, previewStageNum);
  });

  btnWeaponPrev.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    if (weaponsManager.currentPage > 1) {
      weaponsManager.currentPage--;
      renderWeaponsGrid();
    }
  });

  btnWeaponNext.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    if (weaponsManager.currentPage < weaponsManager.getTotalPages()) {
      weaponsManager.currentPage++;
      renderWeaponsGrid();
    }
  });

  bgmSlider.addEventListener('input', (e) => {
    audioEngine.setBgmVolume(e.target.value / 100);
    StorageManager.save({ bgmVolume: e.target.value });
  });

  sfxSlider.addEventListener('input', (e) => {
    audioEngine.setSfxVolume(e.target.value / 100);
    StorageManager.save({ sfxVolume: e.target.value });
  });

  // 初始 UI 渲染、關卡加載與 Canvas 預渲染
  renderWeaponsGrid();
  levelManager.loadStage(1);
  gameEngine.startStage(1);
  gameEngine.state = 'START';
  levelManager.renderPreview(previewCanvas, previewStageNum);
  updatePreviewLabel();

  // ===== 主渲染與邏輯循環 (60 FPS) =====
  function loop() {
    if (gameEngine.state === 'PLAYING') {
      gameEngine.update();
      updateHudUI();
    }
    gameEngine.render();
    levelManager.renderMinimap(minimapCanvas, gameEngine.player, gameEngine.enemiesOnField);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
});
