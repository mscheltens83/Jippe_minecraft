// Kleine dingen bewaren in de browser (localStorage): instellingen, welke wereld je speelt,
// en de oude werelden van vóór de eindeloze wereld (die blijven als reserve staan).
// De werelden zelf staan sinds versie 4 in IndexedDB (js/engine/save.js).

// 'world' en 'backup' zijn van de eerste versie (één wereld + vorige wereld)
const LOCAL = {
  world: 'jippecraft.world.v1', backup: 'jippecraft.backup.v1', settings: 'jippecraft.settings.v1',
  meta: 'jippecraft.meta.v1', slot1: 'jippecraft.slot1.v1', slot2: 'jippecraft.slot2.v1', slot3: 'jippecraft.slot3.v1',
  slot4: 'jippecraft.slot4.v1', slot5: 'jippecraft.slot5.v1', slot6: 'jippecraft.slot6.v1',
};

export class Storage {
  loadLocal(name) {
    try {
      const s = localStorage.getItem(LOCAL[name]);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }

  saveLocal(name, obj) {
    try {
      if (obj === null) localStorage.removeItem(LOCAL[name]);
      else localStorage.setItem(LOCAL[name], JSON.stringify(obj));
      return true;
    } catch { return false; }
  }
}
