// Meetscherm: hoe vlot loopt het spel? Aan met ?fps achter het adres, of via het ouderscherm.
// Rechtsboven verschijnt een klein kader met beelden per seconde en wat de iPad moet tekenen.

const SIZE = 240; // de laatste 240 beeldjes (ongeveer 4 seconden)

// Rekent beeldtijden (in seconden) om naar gemiddelde en percentielen
export function frameStats(times) {
  const list = Array.from(times).filter((t) => t > 0);
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => a - b);
  const pick = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const avg = list.reduce((a, b) => a + b, 0) / list.length;
  return { n: list.length, fps: 1 / avg, avg, p50: pick(0.5), p95: pick(0.95), p99: pick(0.99), max: sorted[sorted.length - 1] };
}

// Wat voor apparaat is dit? Alleen voor de meetkaart en het ouderscherm.
export function deviceInfo(renderer) {
  const ua = navigator.userAgent;
  const ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const ios = ua.match(/OS (\d+)_(\d+)/) || ua.match(/Version\/(\d+)\.(\d+)/);
  let device = ipad ? 'iPad' : /iPhone/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'Computer';
  if ((ipad || /iPhone/.test(ua)) && ios) device += ` (iPadOS ${ios[1]}.${ios[2]})`;
  let gpu = '?';
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  } catch { /* niet erg */ }
  return {
    device, gpu: String(gpu).slice(0, 80),
    screen: `${screen.width}×${screen.height} @${window.devicePixelRatio || 1}x`,
    cores: navigator.hardwareConcurrency || '?',
  };
}

export class PerfMeter {
  constructor(root) {
    this.root = root;
    this.el = null;
    this.times = new Float32Array(SIZE);
    this.cpu = new Float32Array(SIZE);
    this.i = 0;
    this.n = 0;
    this.nextDraw = 0;
  }

  get visible() { return !!this.el && !this.el.hidden; }

  show(on) {
    if (on && !this.el) {
      this.el = document.createElement('div');
      this.el.className = 'perf';
      this.el.setAttribute('aria-hidden', 'true');
      this.root.appendChild(this.el);
    }
    if (this.el) this.el.hidden = !on;
    this.nextDraw = 0;
  }

  // Eén beeldje: de tijd sinds het vorige (seconden) en hoe lang het rekenen duurde (ms)
  record(dt, cpuMs) {
    if (!(dt > 0) || dt > 1) return; // bijvoorbeeld net terug uit de achtergrond
    this.times[this.i] = dt;
    this.cpu[this.i] = cpuMs;
    this.i = (this.i + 1) % SIZE;
    this.n = Math.min(SIZE, this.n + 1);
  }

  stats() { return frameStats(this.times.subarray(0, this.n)); }

  draw(now, info) {
    if (!this.visible || now < this.nextDraw) return;
    this.nextDraw = now + 0.25;
    const s = this.stats();
    if (!s) return;
    let cpu = 0;
    for (let k = 0; k < this.n; k++) cpu += this.cpu[k];
    const ms = (v) => (v * 1000).toFixed(1);
    const k = (v) => (v >= 10000 ? Math.round(v / 1000) + 'k' : String(v));
    this.el.textContent = [
      `${Math.round(s.fps)} fps · p95 ${ms(s.p95)} ms`,
      `traagst ${ms(s.max)} ms · cpu ${(cpu / this.n).toFixed(1)} ms`,
      `tekenen ${info.calls} · △ ${k(info.triangles)}`,
      `chunks ${info.chunks} · dieren ${info.animals}`,
      `scherpte ${info.pixelRatio} · ${info.width}×${info.height}`,
      `zicht ${info.view}${info.zuinig ? ' · zuinig' : ''}`,
    ].join('\n');
  }
}
