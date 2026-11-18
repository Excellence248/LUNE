// Turns the vector wallpapers in scripts/backgrounds-src/*.svg into the JPEG files the app actually loads
// (public/backgrounds/<name>.jpg, <name>-portrait.jpg for phones, <name>-thumb.jpg for the picker).
//
// Why: the vector scenes use heavy filter effects (noise, blur). A browser redraws those from scratch every
// time the screen changes size, which is exactly what happens when a phone keyboard opens, and made chats
// hang. Plain JPEGs are only scaled, which is nearly free.
//
// Run:  node scripts/generate-backgrounds.mjs   (draws the SVGs)
//       node scripts/render-backgrounds.mjs     (renders them to JPEG; needs Chrome, set CHROME to its path)
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SRC = new URL('./backgrounds-src/', import.meta.url);
const OUT = new URL('../public/backgrounds/', import.meta.url);
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9444;
mkdirSync(OUT, { recursive: true });

// Where the interesting part of each scene sits horizontally (0 = left, 1 = right), so the phone crop keeps it.
const FOCUS = { nebula: 0.45, moonrise: 0.64, aurora: 0.5, galaxy: 0.5, planet: 0.22, comet: 0.62, eclipse: 0.5, constellations: 0.5 };

const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${PORT}`, '--remote-allow-origins=*', `--user-data-dir=${join(tmpdir(), 'lune-render-profile')}`, 'about:blank'], { stdio: 'ignore' });

try {
  let targets;
  for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (targets.some(t => t.type === 'page')) break; } catch { /* starting */ } await sleep(300); }
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const waiting = new Map();
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } });
  const evaluate = expression => new Promise((resolve, reject) => {
    const n = ++id; waiting.set(n, m => (m.result?.exceptionDetails ? reject(new Error(m.result.exceptionDetails.exception?.description || 'evaluate failed')) : resolve(m.result.result.value)));
    ws.send(JSON.stringify({ id: n, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
  });

  const names = readdirSync(SRC).filter(file => file.endsWith('.svg')).map(file => file.replace(/\.svg$/, ''));
  for (const name of names) {
    const base64 = readFileSync(new URL(`${name}.svg`, SRC)).toString('base64');
    const focus = FOCUS[name] ?? 0.5;
    const sizes = [['', 1280, 800, 0.82], ['-portrait', 720, 1280, 0.82], ['-thumb', 320, 200, 0.8]];
    for (const [suffix, w, h, quality] of sizes) {
      const data = await evaluate(`(async () => {
        const img = new Image();
        await new Promise((ok, fail) => { img.onload = ok; img.onerror = () => fail(new Error('svg failed to load')); img.src = 'data:image/svg+xml;base64,${base64}'; });
        const SW = 1600, SH = 1000;
        const sw = Math.min(SW, SH * ${w} / ${h});
        const sx = Math.max(0, Math.min(SW - sw, SW * ${focus} - sw / 2));
        const c = document.createElement('canvas'); c.width = ${w}; c.height = ${h};
        const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
        g.fillStyle = '#05030f'; g.fillRect(0, 0, ${w}, ${h});
        g.drawImage(img, sx, 0, sw, SH, 0, 0, ${w}, ${h});
        return c.toDataURL('image/jpeg', ${quality}).split(',')[1];
      })()`);
      const bytes = Buffer.from(data, 'base64');
      writeFileSync(new URL(`${name}${suffix}.jpg`, OUT), bytes);
      console.log(`${name}${suffix}.jpg`.padEnd(30), `${w}x${h}`.padEnd(10), `${Math.round(bytes.length / 1024)} KB`);
    }
  }
  ws.close();
} finally {
  chrome.kill();
}
