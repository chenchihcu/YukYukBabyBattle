/* =========================================================
   StorageManager.js - LocalStorage 進度與戰績持久化管理器
   ========================================================= */

const STORAGE_KEY = 'TANK_FRONT_1988_SAVE_DATA';

export class StorageManager {
  static getSaveData() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn("StorageManager: 無法讀取 LocalStorage", e);
    }
    return {
      highScore: 0,
      maxUnlockedStage: 1,
      unlockedWeapons: [1, 2, 3, 7, 8, 37],
      bgmVolume: 60,
      sfxVolume: 80,
      difficulty: 'normal',
      controlMode: 'mouse_keyboard',
      crtEnabled: true,
      arcadeModeEnabled: true,
      cameraMode: '2.5D',
      weatherMode: 'none'
    };
  }

  static save(data) {
    try {
      const current = this.getSaveData();
      const updated = { ...current, ...data };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("StorageManager: 無法寫入 LocalStorage", e);
    }
  }

  static updateHighScore(score) {
    const data = this.getSaveData();
    if (score > data.highScore) {
      this.save({ highScore: score });
      return true;
    }
    return false;
  }

  static unlockStage(stageNum) {
    const data = this.getSaveData();
    if (stageNum > data.maxUnlockedStage) {
      this.save({ maxUnlockedStage: Math.min(200, stageNum) });
    }
  }
}
