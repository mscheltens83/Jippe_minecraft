// Bewaren en laden van de wereld.
// Altijd in de browser (localStorage). Draait het spel als claude.ai-artifact,
// dan wordt het óók in de artifact-database bewaard, zodat het veilig blijft.

const LOCAL = { world: 'jippecraft.world.v1', backup: 'jippecraft.backup.v1', settings: 'jippecraft.settings.v1' };
const MAX_REMOTE = 250000;

export class Storage {
  constructor() {
    this.db = null;
    this.pending = new Map();
    this.writing = false;
  }

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

  // Probeer de artifact-database te bereiken (lukt alleen op claude.ai)
  async connect() {
    try {
      if (!window.claude?.use) return null;
      this.db = await window.claude.use('db');
    } catch { this.db = null; }
    return this.db;
  }

  async loadRemote(name) {
    if (!this.db) return null;
    try {
      const snap = await this.db.doc('saves/' + name).get();
      return snap.exists ? snap.data() : null;
    } catch { return null; }
  }

  save(name, obj) {
    this.saveLocal(name, obj);
    if (this.db && obj && JSON.stringify(obj).length < MAX_REMOTE) {
      this.pending.set(name, obj);
      this.flush();
    }
  }

  // Eén schrijfactie tegelijk; tussentijdse versies worden overgeslagen
  async flush() {
    if (this.writing || !this.db) return;
    this.writing = true;
    try {
      while (this.pending.size && this.db) {
        const [name, obj] = this.pending.entries().next().value;
        this.pending.delete(name);
        try {
          await this.db.doc('saves/' + name).set(obj);
        } catch (e) {
          const fatal = ['invalid_argument', 'not_granted', 'revoked', 'capability_disabled', 'capability_removed', 'quota_exceeded'];
          if (fatal.includes(e?.code)) this.db = null;
        }
      }
    } finally {
      this.writing = false;
    }
  }
}
