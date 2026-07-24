import fs from 'fs';
import path from 'path';

// 建立全局 Mock
global.window = global;
global.window.addEventListener = () => {};
global.document = {
  createElement: () => ({
    getContext: () => ({
      fillRect: () => {},
      clearRect: () => {},
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      arc: () => {},
      fillText: () => {},
      strokeRect: () => {},
      ellipse: () => {},
      measureText: () => ({ width: 0 }),
      putImageData: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      shadowColor: '',
      shadowBlur: 0,
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      setLineDash: () => {},
      globalAlpha: 1,
      globalCompositeOperation: ''
    }),
    width: 832,
    height: 832,
    style: {},
    addEventListener: () => {},
    classList: { add: () => {}, remove: () => {} }
  }),
  getElementById: (id) => {
    if (id === 'gameCanvas' || id === 'hitboxCanvas' || id === 'shadowCanvas' || id === 'fogCanvas') {
      return global.document.createElement('canvas');
    }
    return { style: {}, innerHTML: '', appendChild: () => {}, addEventListener: () => {}, classList: { add: () => {}, remove: () => {} } };
  }
};
global.localStorage = { getItem: () => null, setItem: () => {} };
global.AudioContext = class {
  createOscillator() { return { type: '', frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }; }
  createGain() { return { gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} }; }
  createBiquadFilter() { return { type: '', frequency: { value: 0 }, connect: () => {} }; }
  createBuffer() { return {}; }
  createBufferSource() { return { buffer: null, connect: () => {}, start: () => {} }; }
  get currentTime() { return 0; }
  get destination() { return {}; }
};
if (!global.navigator) {
  Object.defineProperty(global, 'navigator', { value: { getGamepads: () => [] }, writable: true });
} else {
  global.navigator.getGamepads = () => [];
}
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);

// 載入遊戲引擎
import { GameEngine } from './src/game/Engine.js';
import { KamikazeTank, EnemyTank } from './src/game/Entities.js';

// Mocks for dependencies
class MockLevelManager {
  async loadStage(n) { return { stage: n, enemies: [] }; }
  async preloadJSON(n) {}
  getMapGrid() { return Array.from({length: 13}, () => Array(13).fill(0)); }
  getSubMapGrid() { return Array.from({length: 26}, () => Array(26).fill(0)); }
  getLevelConfig() { return { weather: 'none', enemyCount: 1, enemyTypes: ['basic'] }; }
}
class MockAudioEngine {
  playSfx() {}
  playBgm() {}
  startBgm() {}
  stopBgm() {}
}
class MockWeaponsManager {
  isActive() { return false; }
  activateWeapon() {}
  getCurrentWeapon() { return 'normal'; }
  canShoot() { return true; }
  upgradeWeapon() {}
}

async function runSim() {
  console.log('開始自動化壓力測試 (10,000 幀)...');
  const canvas = global.document.createElement('canvas');
  const uiCallbacks = {
    onStateChange: () => {},
    onPlayerHpChange: () => {},
    onBaseDestroyed: () => {},
    onStageClear: () => {},
    onGameOver: () => {},
    onStageStart: () => {},
    onDebugLog: () => {}
  };

  const engine = new GameEngine(
    canvas,
    new MockLevelManager(),
    new MockAudioEngine(),
    new MockWeaponsManager(),
    uiCallbacks
  );
  
  // 初始化，忽略繪圖
  engine.ctx = canvas.getContext('2d');
  
  // 啟動關卡 (1)
  await engine.startStage(1);

  const keyList = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'KeyE'];

  try {
    for (let frame = 0; frame < 10000; frame++) {
      // 隨機發送按鍵
      if (Math.random() < 0.2) {
        const rKey = keyList[Math.floor(Math.random() * keyList.length)];
        engine.keys[rKey] = Math.random() > 0.5;
        // 如果是射擊或 dash，直接觸發
        if (engine.keys['Space']) engine.playerShoot(1);
        if (engine.keys['ShiftLeft']) engine.playerDash(1);
        if (engine.keys['KeyE']) engine.useSpecialWeapon(1);
      }
      
      // 強制頻繁生成各種敵人 (無限制)
      if (Math.random() < 0.1) {
        engine.enemiesOnField.push(new EnemyTank(128, 64, 'basic'));
      }
      if (Math.random() < 0.1) {
        engine.enemiesOnField.push(new EnemyTank(256, 64, 'fast'));
      }
      if (Math.random() < 0.1) {
        engine.enemiesOnField.push(new EnemyTank(384, 64, 'armor'));
      }
      if (Math.random() < 0.1) {
        engine.enemiesOnField.push(new EnemyTank(512, 64, 'power'));
      }
      
      // 模擬自爆兵 (直接塞入陣列)
      if (Math.random() < 0.05) {
        engine.enemiesOnField.push(new KamikazeTank(64, 64));
      }
      
      // 模擬玩家踩到地雷或其他死因後重生
      if (!engine.player1.alive && engine.playerLives > 0) {
          engine.playerLives = 100; // 無限命
      }

      // 執行更新與渲染
      engine.update();
      // 模擬 render 也不報錯
      engine.render();
      
      if (frame > 0 && frame % 1000 === 0) {
        console.log(`模擬進度: ${frame} / 10000 幀`);
      }
    }
    console.log('✅ 壓力測試通過！10,000 幀無崩潰。');
  } catch (err) {
    console.error('❌ 壓力測試捕捉到崩潰錯誤！');
    console.error(err);
    process.exit(1);
  }
}

runSim();
