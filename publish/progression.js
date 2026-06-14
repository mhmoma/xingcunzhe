window.GameModules = window.GameModules || {};
window.GameModules.progression = (() => {
  const KEY = 'arcane-meta-v1';
  const DEFAULT = {
    soulGold: 0,
    upgrades: { hp: 0, damage: 0, speed: 0, magnet: 0, startXp: 0, gold: 0, paladin: 0, mage: 0, ranger: 0 },
  };
  const ITEMS = [
    ['hp', '生命上限', '所有职业最大生命 +5%', 10, 30],
    ['damage', '全技能伤害', '所有技能伤害 +4%', 10, 50],
    ['speed', '移动速度', '所有职业移动速度 +3%', 8, 45],
    ['magnet', '拾取范围', '经验吸附范围 +6%', 8, 40],
    ['startXp', '初始经验', '开局经验 +4', 5, 55],
    ['gold', '金币收益', '局内金币结算 +5%', 10, 45],
    ['paladin', '圣骑士专精', '圣骑士生命额外 +4%', 5, 70],
    ['mage', '法师专精', '大魔法师伤害额外 +5%', 5, 70],
    ['ranger', '游侠专精', '游侠速度额外 +4%', 5, 70],
  ];
  function cloneDefault() {
    return JSON.parse(JSON.stringify(DEFAULT));
  }

  let meta = cloneDefault();
  let ready = false;

  async function kvGet(key) {
    try {
      const data = await window.dzmm.kv.get(key);
      return data?.value ?? null;
    } catch (_) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (_) {
        return null;
      }
    }
  }

  async function kvPut(key, value) {
    try {
      await window.dzmm.kv.put(key, value);
    } catch (_) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (_) {}
    }
  }

  function normalize(data) {
    const base = cloneDefault();
    if (!data || typeof data !== 'object') return base;
    base.soulGold = Math.max(0, Math.floor(Number(data.soulGold) || 0));
    for (const key of Object.keys(base.upgrades)) {
      base.upgrades[key] = Math.max(0, Math.floor(Number(data.upgrades?.[key]) || 0));
    }
    return base;
  }

  async function init() {
    if (ready) return meta;
    meta = normalize(await kvGet(KEY));
    ready = true;
    return meta;
  }

  async function save() {
    await kvPut(KEY, meta);
  }

  function cost(id) {
    const item = ITEMS.find((v) => v[0] === id);
    const lv = meta.upgrades[id] || 0;
    if (!item || lv >= item[3]) return 0;
    return Math.round(item[4] * Math.pow(1.55, lv));
  }

  function render(container, onChange) {
    if (!container) return;
    const rows = ITEMS.map(([id, name, desc, max]) => {
      const lv = meta.upgrades[id] || 0;
      const c = cost(id);
      const disabled = lv >= max || meta.soulGold < c;
      return `<button class="upgradeCard" data-upgrade="${id}" ${disabled ? 'disabled' : ''}>
        <b>${name} Lv.${lv}/${max}</b><small>${desc}</small>
        <span>${lv >= max ? '已满级' : `消耗 ${c} 灵魂金币`}</span>
      </button>`;
    }).join('');
    container.innerHTML = `<div class="progressHead"><b>灵魂金币：${meta.soulGold}</b><small>死亡结算获得，用于永久强化。</small></div><div class="upgradeGrid">${rows}</div>`;
    container.querySelectorAll('[data-upgrade]').forEach((btn) => {
      btn.onclick = async () => {
        await buy(btn.dataset.upgrade);
        render(container, onChange);
        onChange?.();
      };
    });
  }

  async function buy(id) {
    const item = ITEMS.find((v) => v[0] === id);
    if (!item) return false;
    const lv = meta.upgrades[id] || 0;
    const c = cost(id);
    if (lv >= item[3] || meta.soulGold < c) return false;
    meta.soulGold -= c;
    meta.upgrades[id] = lv + 1;
    await save();
    return true;
  }

  function applyClass(classId, baseClass) {
    const u = meta.upgrades;
    let hpMul = 1 + u.hp * 0.05;
    let dmgMul = 1 + u.damage * 0.04;
    let spdMul = 1 + u.speed * 0.03;
    if (classId === 'paladin') hpMul *= 1 + u.paladin * 0.04;
    if (classId === 'mage') dmgMul *= 1 + u.mage * 0.05;
    if (classId === 'ranger') spdMul *= 1 + u.ranger * 0.04;
    return {
      hp: Math.round(baseClass.hp * hpMul),
      spd: baseClass.spd * spdMul,
      dmg: baseClass.dmg * dmgMul,
      startXp: u.startXp * 4,
      magnetBonus: u.magnet * 0.06,
      goldBonus: u.gold * 0.05,
    };
  }

  function estimateRunReward(run) {
    const goals = Math.max(0, Number(run.goals) || 0);
    const base = Math.floor(Number(run.gold) || 0);
    const time = Math.floor((Number(run.time) || 0) / 30) * 10;
    const boss = Math.max(0, Number(run.bossKills) || 0) * 80;
    const level = (run.level >= 30 ? 100 : run.level >= 20 ? 60 : run.level >= 10 ? 30 : 0);
    const bonus = Math.round((base + time + boss + goals * 40 + level) * (meta.upgrades.gold * 0.05));
    return base + time + boss + goals * 40 + level + bonus;
  }

  async function addRunReward(run) {
    await init();
    const reward = estimateRunReward(run);
    meta.soulGold += reward;
    await save();
    return reward;
  }

  function data() {
    return meta;
  }

  return { init, render, applyClass, estimateRunReward, addRunReward, data };
})();
window.Progression = window.GameModules.progression;
