import { GameEngine } from './src/game/Engine.js';
import { Bullet, Tank, DIR } from './src/game/Entities.js';

class MockLevelManager { loadStage() { return []; } }
class MockAudioEngine { playSfx() {} stopBgm() {} }
class MockWeaponsManager { 
  constructor() {
    this.wheelWeapons = [{ id: 'normal', name: '標準重砲', maxBullets: 2 }];
    this.selectedWeaponIndex = 0;
  }
  getCurrentWeapon() { return this.wheelWeapons[this.selectedWeaponIndex]; }
  isActive() { return false; }
}

const canvas = { getContext: () => ({ fillRect: () => {}, save: () => {}, restore: () => {}, translate: () => {}, rotate: () => {}, scale: () => {} }), classList: { add: () => {}, remove: () => {} }, width: 800, height: 600 };
const uiCallbacks = { onStageClear: () => {}, onGameOver: () => {} };

const engine = new GameEngine(
  canvas,
  new MockLevelManager(),
  new MockAudioEngine(),
  new MockWeaponsManager(),
  uiCallbacks
);

engine.state = 'PLAYING';
engine.player1 = new Tank(100, 100, DIR.UP, true);
engine.startStage(1);

console.log("Before shoot: ", engine.bullets.length);
engine.playerShoot(1);
console.log("After shoot: ", engine.bullets.length);
console.log("Bullet: ", engine.bullets[0]);

engine.update();
console.log("After 1 update: ", engine.bullets.length);
if (engine.bullets.length > 0) {
  console.log("Bullet pos: ", engine.bullets[0].x, engine.bullets[0].y);
}
