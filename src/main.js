/* =========================================================
   main.js - 禹旭寶貝大作戰 主入口與 UI 控制器 (52x52 全螢幕戰術滿版)
   ========================================================= */

import './style.css';
import { SymphonicAudioEngine } from './audio/SymphonicAudioEngine.js';
import { LevelManager } from './game/LevelManager.js';
import { WeaponsManager } from './game/WeaponsSystem.js';
import { GameEngine } from './game/Engine.js';
import { MapDataGenerator, MAP_SIZE } from './game/MapData.js';
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

  const btnPrevStage = document.getElementById('btn-prev-stage');
  const btnNextStage = document.getElementById('btn-next-stage');
  const previewStageLabel = document.getElementById('preview-stage-label');

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
      }
    }
  );

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
    const wheelItems = document.querySelectorAll('.wheel-item');
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
  const wheelItems = document.querySelectorAll('.wheel-item');
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

  // 視角切換
  if (btnPerspective2d) btnPerspective2d.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    btnPerspective2d.classList.add('active');
    btnPerspective25d.classList.remove('active');
    gameEngine.setCameraPerspectiveMode('2D');
  });

  if (btnPerspective25d) btnPerspective25d.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    btnPerspective25d.classList.add('active');
    btnPerspective2d.classList.remove('active');
    gameEngine.setCameraPerspectiveMode('2.5D');
  });

  // 天氣模式
  const weatherBtns = [
    { btn: btnWeatherNone, mode: 'none' },
    { btn: btnWeatherRain, mode: 'rain' },
    { btn: btnWeatherSnow, mode: 'snow' },
    { btn: btnWeatherNight, mode: 'night' }
  ];
  weatherBtns.forEach(w => {
    if (w.btn) w.btn.addEventListener('click', () => {
      audioEngine.playSfx("menu_click");
      weatherBtns.forEach(wb => wb.btn && wb.btn.classList.remove('active'));
      w.btn.classList.add('active');
      gameEngine.setWeatherMode(w.mode);
    });
  });

  // 控制模式
  if (btnControlMouse) btnControlMouse.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    btnControlMouse.classList.add('active');
    btnControlKeys.classList.remove('active');
    gameEngine.setControlMode('mouse_keyboard');
  });

  if (btnControlKeys) btnControlKeys.addEventListener('click', () => {
    audioEngine.playSfx("menu_click");
    btnControlKeys.classList.add('active');
    btnControlMouse.classList.remove('active');
    gameEngine.setControlMode('keyboard');
  });

  // 難易度
  const diffBtns = [
    { btn: btnDiffEasy, diff: 'easy' },
    { btn: btnDiffNormal, diff: 'normal' },
    { btn: btnDiffHard, diff: 'hard' },
    { btn: btnDiffHell, diff: 'hell' }
  ];
  diffBtns.forEach(d => {
    if (d.btn) d.btn.addEventListener('click', () => {
      audioEngine.playSfx("menu_click");
      diffBtns.forEach(db => db.btn && db.btn.classList.remove('active'));
      d.btn.classList.add('active');
      gameEngine.setDifficulty(d.diff);
    });
  });

  // 聲音開關
  let isSoundOn = true;
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

  // 關卡預覽
  let previewStageNum = 1;
  function updatePreview() {
    if (previewStageLabel) previewStageLabel.innerText = `第 ${String(previewStageNum).padStart(3, '0')} 關`;
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

  // 全局 鍵盤熱鍵 (Tab: 武器輪盤, ESC: 戰術抽屜, 1-6: 武器)
  window.addEventListener('keydown', e => {
    if (e.code === 'Tab') {
      e.preventDefault();
      toggleWeaponWheel();
    } else if (e.code === 'Escape') {
      e.preventDefault();
      toggleSettingsDrawer();
    } else if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].includes(e.code)) {
      const num = parseInt(e.code.replace('Digit', ''), 10) - 1;
      updateWeaponSelectionUI(num);
    } else if (e.code === 'Enter' || e.code === 'Space') {
      if (!overlay.classList.contains('hidden') && gameEngine.state !== 'PLAYING') {
        startGame();
      }
    }
  });

  // 開始遊戲
  function startGame() {
    audioEngine.playSfx("menu_start");
    overlay.classList.add('hidden');
    gameEngine.startStage(previewStageNum);
  }

  if (btnStartGame) btnStartGame.addEventListener('click', () => startGame());

  // 戰報結算
  const scoreTallyOverlay = document.getElementById('score-tally-overlay');
  const tallyTitle = document.getElementById('tally-title');
  const tallyBodyGrid = document.getElementById('tally-body-grid');
  const tallyTotalScore = document.getElementById('tally-total-score');
  const tallyRankBadge = document.getElementById('tally-rank-badge');
  const btnTallyContinue = document.getElementById('btn-tally-continue');

  function runScoreTallyAnimation(data, isVictory) {
    scoreTallyOverlay.classList.remove('hidden');
    const stageFormatted = String(data.stage || levelManager.currentStage).padStart(3, '0');
    if (tallyTitle) tallyTitle.innerText = isVictory ? `STAGE ${stageFormatted} CLEAR!` : `STAGE ${stageFormatted} FAILED`;
    if (tallyTotalScore) tallyTotalScore.innerText = String(data.score).padStart(7, '0');
    if (tallyRankBadge) tallyRankBadge.innerText = isVictory ? 'ACE ★★★ (S級)' : 'SOLDIER (C級)';
  }

  if (btnTallyContinue) {
    btnTallyContinue.addEventListener('click', () => {
      audioEngine.playSfx("menu_click");
      scoreTallyOverlay.classList.add('hidden');
      if (gameEngine.state === 'VICTORY') {
        gameEngine.startStage(levelManager.currentStage + 1);
      } else {
        gameEngine.startStage(levelManager.currentStage);
      }
    });
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
