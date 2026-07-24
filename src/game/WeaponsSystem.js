/* =========================================================
   WeaponsSystem.js - 40 種武器/強化系統數據與管理器
   ========================================================= */

export const WEAPONS_DATABASE = [
  { id: 1, name: "快速射擊", icon: "🚀", desc: "提升發射頻率 50%，子彈飛行速度大幅加倍。", category: "SHOOT" },
  { id: 2, name: "散彈", icon: "🔱", desc: "一次發射三方向散射彈頭，覆蓋廣闊防禦角。", category: "SHOOT" },
  { id: 3, name: "護盾", icon: "🛡️", desc: "獲得無敵能量護盾，抵擋任何敵方子彈與爆炸。", category: "DEFENSE" },
  { id: 4, name: "地雷", icon: "💣", desc: "在地圖上放置隱形地雷，敵坦克經過時引爆巨額傷害。", category: "DEPLOY" },
  { id: 5, name: "雷射", icon: "⚡", desc: "發射穿透性高能光束，能瞬間貫穿多層牆面與敵人。", category: "SHOOT" },
  { id: 6, name: "冰彈", icon: "❄️", desc: "發射冰凍彈頭，命中敵坦克時將其凍結 5 秒。", category: "CONTROL" },
  { id: 7, name: "裝甲強化", icon: "🔰", desc: "增加額外 1 次生命防護裝甲，抵抗致死打擊。", category: "DEFENSE" },
  { id: 8, name: "速度提升", icon: "⏩", desc: "履帶動力大提升，坦克移動速度增加 40%。", category: "BUFF" },
  { id: 9, name: "反彈彈", icon: "🔄", desc: "子彈撞擊牆壁時可反彈 2 次，防不勝防。", category: "SHOOT" },
  { id: 10, name: "追蹤飛彈", icon: "🎯", desc: "自動發射具備自動追蹤敵方坦克的精密導彈。", category: "SHOOT" },
  { id: 11, name: "無人機支援", icon: "🛸", desc: "召喚微型空中無人機，自動巡邏並攻擊附近敵人。", category: "SPECIAL" },
  { id: 12, name: "穿透彈", icon: "💥", desc: "可以直接擊碎普通子彈無法毀壞的鋼鐵牆。", category: "SHOOT" },
  { id: 13, name: "火焰彈", icon: "🔥", desc: "噴射持續燃燒的熾熱火焰，對沿途敵人造成持續打擊。", category: "SHOOT" },
  { id: 14, name: "電磁衝擊", icon: "🌀", desc: "釋放圓形電磁脈衝波，癱瘓全場敵方坦克 4 秒。", category: "CONTROL" },
  { id: 15, name: "修理包", icon: "💊", desc: "修復受損坦克生命並補滿當前狀態。", category: "RECOVER" },
  { id: 16, name: "雙重射擊", icon: "🔫", desc: "雙管主砲同時平行開火，彈幕密度加倍。", category: "SHOOT" },
  { id: 17, name: "貫穿巨砲", icon: "☄️", desc: "發射巨大高爆巨砲，造成大範圍震撼爆風。", category: "SHOOT" },
  { id: 18, name: "時間靜止", icon: "⏱️", desc: "暫停時間 8 秒，敵方坦克完全無法移動與開火。", category: "SPECIAL" },
  { id: 19, name: "全屏空襲", icon: "✈️", desc: "呼叫空軍轟炸全地圖，隨機對多個敵區投放高爆彈。", category: "SPECIAL" },
  { id: 20, name: "鋼鐵基地", icon: "🏰", desc: "將鷹徽基地四周的磚牆瞬間強化為堅不可摧的鋼鐵牆。", category: "DEFENSE" },
  { id: 21, name: "炸彈清屏", icon: "💣", desc: "引爆戰場高爆核彈，直接摧毀畫面中所有現存敵坦克。", category: "SPECIAL" },
  { id: 22, name: "隱形迷彩", icon: "👻", desc: "進入 6 秒半透明隱形狀態，敵方 AI 無法鎖定目標。", category: "BUFF" },
  { id: 23, name: "分裂子彈", icon: "🎇", desc: "子彈在命中目標後會向四周二次爆裂出小彈丸。", category: "SHOOT" },
  { id: 24, name: "電漿巨流", icon: "🔮", desc: "發射電漿球，持續吸收周遭微型顆粒並發射擴散電流。", category: "SHOOT" },
  { id: 25, name: "彈藥庫充能", icon: "🔋", desc: "移除主砲冷卻時間限制，允許連續高速無限射擊。", category: "BUFF" },
  { id: 26, name: "磁力吸寶", icon: "🧲", desc: "自動將戰場上所有掉落的掉落寶箱吸引至自身身旁。", category: "SPECIAL" },
  { id: 27, name: "鑽石破甲", icon: "💎", desc: "極致硬化砲彈，可連同草叢與多重障礙一併粉碎。", category: "SHOOT" },
  { id: 28, name: "護盾衝撞", icon: "🐂", desc: "前端加裝撞擊撞角，直接撞擊敵方坦克造成毀滅傷害。", category: "BUFF" },
  { id: 29, name: "閃光防禦波", icon: "✨", desc: "受到攻擊時自動觸發反彈閃光波，抵消周遭所有子彈。", category: "DEFENSE" },
  { id: 30, name: "重力吸引彈", icon: "🌌", desc: "發射小型黑洞，將周遭敵方坦克吸引拉扯至中心。", category: "CONTROL" },
  { id: 31, name: "酸蝕砲彈", icon: "🧪", desc: "酸性砲彈使敵方護甲永久降低 50%。", category: "SHOOT" },
  { id: 32, name: "鏈式電擊", icon: "⚡", desc: "閃電連鎖打擊，在敵坦克群之間互相跳躍傳導傷害。", category: "SHOOT" },
  { id: 33, name: "分身幻影", icon: "👥", desc: "製造出一隻幻影分身吸引敵方火力。", category: "SPECIAL" },
  { id: 34, name: "彈幕地獄", icon: "🌟", desc: "向 360 度八個方向同時射出密集彈幕。", category: "SHOOT" },
  { id: 35, name: "自動砲塔", icon: "⚙️", desc: "在指定地點建置一座自動警戒固定防禦砲塔。", category: "DEPLOY" },
  { id: 36, name: "狂暴怒火", icon: "💢", desc: "進入狂暴狀態 10 秒，移動速度、射速與威力大幅提升。", category: "BUFF" },
  { id: 37, name: "超級星級", icon: "⭐", desc: "永久提升主砲等級至最高階（火力與外觀雙升級）。", category: "BUFF" },
  { id: 38, name: "復甦護符", icon: "🕊️", desc: "當生命歸零時自動原地滿血復活 1 次。", category: "RECOVER" },
  { id: 39, name: "鷹徽防禦罩", icon: "🛡️", desc: "為鷹徽基地建立一層保護光罩，抵擋 3 次致命打擊。", category: "DEFENSE" },
  { id: 40, name: "終極毀滅光束", icon: "💥", desc: "召喚太空雷射巨砲，貫穿戰場直線區域摧毀一切對手。", category: "SPECIAL" }
];

export class WeaponsManager {
  constructor() {
    this.unlockedIds = new Set([1, 2, 3, 7, 8, 37]); // 預設解鎖常用技能
    this.activeWeapons = new Set([1]); // 當前啟動技能
    this.currentPage = 1;
    this.pageSize = 16;

    // 6 大核心實時切換武器
    this.wheelWeapons = [
      { id: 'normal', name: '標準重砲', icon: '💣', key: '1', speed: 6, maxBullets: 2, desc: '平衡型基礎主砲' },
      { id: 'rapid', name: '雙發衝鋒', icon: '🔫', key: '2', speed: 8, maxBullets: 4, desc: '極速雙管連射' },
      { id: 'ap', name: '穿甲巨砲', icon: '💥', key: '3', speed: 7, maxBullets: 2, desc: '可摧毀鋼鐵牆壁' },
      { id: 'shotgun', name: '三向散彈', icon: '🔱', key: '4', speed: 6.5, maxBullets: 6, desc: '360扇形大範圍彈幕' },
      { id: 'laser', name: '貫穿雷射', icon: '⚡', key: '5', speed: 12, maxBullets: 1, desc: '瞬間貫穿多層障礙' },
      { id: 'homing', name: '追蹤飛彈', icon: '🎯', key: '6', speed: 5, maxBullets: 2, desc: '自動導引追獵敵坦克' }
    ];
    this.selectedWeaponIndex = 0; // 預設為標準重砲
  }

  getCurrentWeapon() {
    return this.wheelWeapons[this.selectedWeaponIndex];
  }

  selectWeaponIndex(idx) {
    if (idx >= 0 && idx < this.wheelWeapons.length) {
      this.selectedWeaponIndex = idx;
      return this.wheelWeapons[idx];
    }
    return this.getCurrentWeapon();
  }

  selectNextWeapon() {
    this.selectedWeaponIndex = (this.selectedWeaponIndex + 1) % this.wheelWeapons.length;
    return this.getCurrentWeapon();
  }

  selectPrevWeapon() {
    this.selectedWeaponIndex = (this.selectedWeaponIndex - 1 + this.wheelWeapons.length) % this.wheelWeapons.length;
    return this.getCurrentWeapon();
  }

  unlockWeapon(id) {
    this.unlockedIds.add(id);
  }

  isUnlocked(id) {
    return this.unlockedIds.has(id);
  }

  activateWeapon(id) {
    this.activeWeapons.add(id);
  }

  deactivateWeapon(id) {
    this.activeWeapons.delete(id);
  }

  isActive(id) {
    return this.activeWeapons.has(id);
  }

  getPageItems(page = 1) {
    this.currentPage = page;
    const start = (page - 1) * this.pageSize;
    return WEAPONS_DATABASE.slice(start, start + this.pageSize);
  }

  getTotalPages() {
    return Math.ceil(WEAPONS_DATABASE.length / this.pageSize);
  }
}
