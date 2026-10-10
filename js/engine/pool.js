// Een paar workers die om de beurt chunks maken en tekenen. Lukt het starten niet
// (oude browser), dan doet de lader het zelf, in kleine stukjes per beeldje.

export class WorkerPool {
  constructor(faceTiles, size = 2) {
    this.workers = [];
    this.jobs = new Map();
    this.nextId = 1;
    this.failed = false;
    try {
      for (let i = 0; i < size; i++) {
        const w = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
        w.pending = 0;
        w.onmessage = (e) => this.done(w, e.data);
        w.onerror = (e) => { e.preventDefault?.(); this.fail(String(e.message || 'worker-fout')); };
        w.postMessage({ type: 'init', faceTiles });
        this.workers.push(w);
      }
    } catch (e) {
      this.fail(String(e));
    }
  }

  get ok() { return !this.failed && this.workers.length > 0; }
  get busy() { return this.jobs.size; }

  run(msg, transfer = []) {
    if (!this.ok) return Promise.reject(new Error('geen workers'));
    const w = this.workers.reduce((a, b) => (b.pending < a.pending ? b : a));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.jobs.set(id, { resolve, reject, w });
      w.pending++;
      w.postMessage({ ...msg, id }, transfer);
    });
  }

  done(w, data) {
    const job = this.jobs.get(data.id);
    if (!job) return;
    this.jobs.delete(data.id);
    w.pending--;
    if (data.error) job.reject(new Error(data.error));
    else job.resolve(data);
  }

  // Een worker die niet wil: alles wat nog liep opnieuw laten doen door de lader
  fail(reason) {
    if (this.failed) return;
    this.failed = true;
    console.warn('Workers werken niet, de wereld wordt op de hoofdthread gemaakt:', reason);
    for (const job of this.jobs.values()) job.reject(new Error(reason));
    this.jobs.clear();
    for (const w of this.workers) w.terminate();
    this.workers = [];
  }
}
