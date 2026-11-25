// Generates Lune's space wallpapers (public/backgrounds/*.svg) and the doodle pattern used on chats.
// Run with: node scripts/generate-backgrounds.mjs
// Everything is procedural (seeded), so the files are original, small, and identical on every run.
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = new URL('../public/backgrounds/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const W = 1600;
const H = 1000;

// Small seeded random generator, so the same seed always draws the same sky.
const rng = seed => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const f = n => Math.round(n * 10) / 10;

/** A scatter of stars: many tiny, some larger with a soft glow, a few with a cross flare. */
const stars = (rand, count, { tint = '#ffffff', area = [0, 0, W, H], glow = true } = {}) => {
  const [x0, y0, x1, y1] = area;
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = f(x0 + rand() * (x1 - x0));
    const y = f(y0 + rand() * (y1 - y0));
    const size = rand();
    const r = size > 0.985 ? 2.6 : size > 0.93 ? 1.7 : size > 0.6 ? 1.1 : 0.7;
    const o = f(0.35 + rand() * 0.6);
    const color = rand() > 0.82 ? '#cdb8ff' : rand() > 0.9 ? '#a9d4ff' : tint;
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" fill-opacity="${o}"/>`;
    if (glow && r >= 1.7) out += `<circle cx="${x}" cy="${y}" r="${r * 5}" fill="url(#sg)" fill-opacity="${f(o * 0.6)}"/>`;
    if (glow && r >= 2.6) out += `<path d="M${x - 11} ${y}H${x + 11}M${x} ${y - 11}V${y + 11}" stroke="#fff" stroke-opacity=".5" stroke-width=".7"/>`;
  }
  return out;
};

const STAR_GLOW = '<radialGradient id="sg"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>';

const svg = (defs, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"><defs>${STAR_GLOW}${defs}</defs>${body}</svg>\n`;

// Scenes are sources: scripts/render-backgrounds.mjs turns them into the JPEGs the app loads. The doodle pattern is used as is.
const SRC = new URL('./backgrounds-src/', import.meta.url);
mkdirSync(SRC, { recursive: true });
const save = (name, content) => { writeFileSync(new URL(name, name === 'doodles.svg' ? OUT : SRC), content); console.log('wrote', name, Math.round(content.length / 1024) + ' KB'); };

/** A cloudy nebula layer made from fractal noise, tinted and shaped by the colour matrix. */
const nebulaFilter = (id, seed, freq, [r, g, b], gain = 2.1, bias = -0.62, blur = 5) =>
  `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="5" seed="${seed}"/><feColorMatrix type="matrix" values="0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 ${gain} ${bias}"/><feGaussianBlur stdDeviation="${blur}"/></filter>`;

// ---------------------------------------------------------------------------------------------
// 1. Nebula: violet and magenta gas clouds with a cool blue haze.
{
  const rand = rng(11);
  save('nebula.svg', svg(
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#07041a"/><stop offset=".55" stop-color="#0c0629"/><stop offset="1" stop-color="#04030d"/></linearGradient>
     <radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>
     <radialGradient id="mask1" cx=".38" cy=".42" r=".62"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
     <radialGradient id="mask2" cx=".72" cy=".62" r=".55"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
     <mask id="m1"><rect width="${W}" height="${H}" fill="url(#mask1)"/></mask><mask id="m2"><rect width="${W}" height="${H}" fill="url(#mask2)"/></mask>
     ${nebulaFilter('n1', 7, '0.0045 0.0075', [0.66, 0.27, 0.96], 2.4, -0.7)}
     ${nebulaFilter('n2', 31, '0.006 0.01', [0.95, 0.3, 0.7], 2.2, -0.78, 7)}
     ${nebulaFilter('n3', 52, '0.003 0.005', [0.25, 0.4, 1], 2, -0.6, 10)}`,
    `<rect width="${W}" height="${H}" fill="url(#bg)"/>
     <g mask="url(#m1)"><rect width="${W}" height="${H}" filter="url(#n1)" opacity=".85"/></g>
     <g mask="url(#m2)"><rect width="${W}" height="${H}" filter="url(#n2)" opacity=".7"/></g>
     <rect width="${W}" height="${H}" filter="url(#n3)" opacity=".35"/>
     ${stars(rand, 520)}
     <rect width="${W}" height="${H}" fill="url(#vig)"/>`,
  ));
}

// ---------------------------------------------------------------------------------------------
// 2. Moonrise: a glowing cratered moon over a curved lunar horizon.
{
  const rand = rng(23);
  let craters = '';
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * 215;
    const r = 8 + rand() * 38;
    const cx = f(1010 + Math.cos(a) * d);
    const cy = f(330 + Math.sin(a) * d);
    craters += `<circle cx="${cx}" cy="${cy}" r="${f(r)}" fill="#6f5fb0" fill-opacity="${f(0.1 + rand() * 0.18)}"/><circle cx="${f(cx - r * 0.12)}" cy="${f(cy - r * 0.14)}" r="${f(r * 0.86)}" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1.2"/>`;
  }
  let ground = '';
  for (let i = 0; i < 40; i++) {
    const x = f(rand() * W); const y = f(780 + rand() * 210);
    ground += `<ellipse cx="${x}" cy="${y}" rx="${f(18 + rand() * 90)}" ry="${f(4 + rand() * 16)}" fill="#1b1230" fill-opacity="${f(0.25 + rand() * 0.4)}"/>`;
  }
  save('moonrise.svg', svg(
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050414"/><stop offset=".55" stop-color="#150b35"/><stop offset="1" stop-color="#3a1b66"/></linearGradient>
     <radialGradient id="moon" cx=".38" cy=".34" r=".78"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#e6dcff"/><stop offset=".85" stop-color="#a893e8"/><stop offset="1" stop-color="#7a63c9"/></radialGradient>
     <radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset=".35" stop-color="#b79bff" stop-opacity=".55"/><stop offset="1" stop-color="#7a4dff" stop-opacity="0"/></radialGradient>
     <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9a2ff" stop-opacity=".9"/><stop offset=".08" stop-color="#5a3c9e" stop-opacity=".5"/><stop offset=".3" stop-color="#0a0618" stop-opacity="0"/></linearGradient>
     <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0f35"/><stop offset="1" stop-color="#05030c"/></linearGradient>
     <filter id="soft"><feGaussianBlur stdDeviation="2.5"/></filter><filter id="glow"><feGaussianBlur stdDeviation="40"/></filter>`,
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>
     ${stars(rand, 430, { area: [0, 0, W, 760] })}
     <circle cx="1010" cy="330" r="470" fill="url(#halo)"/>
     <circle cx="1010" cy="330" r="238" fill="#b79bff" opacity=".5" filter="url(#glow)"/>
     <circle cx="1010" cy="330" r="232" fill="url(#moon)"/>
     <g filter="url(#soft)">${craters}</g>
     <ellipse cx="800" cy="1240" rx="1500" ry="520" fill="url(#ground)"/>
     <ellipse cx="800" cy="1240" rx="1500" ry="520" fill="none" stroke="url(#rim)" stroke-width="5"/>
     <clipPath id="gc"><ellipse cx="800" cy="1240" rx="1500" ry="520"/></clipPath><g clip-path="url(#gc)">${ground}</g>`,
  ));
}

// ---------------------------------------------------------------------------------------------
// 3. Aurora: soft violet and teal curtains of light high above a quiet horizon.
{
  const rand = rng(37);
  // A curtain is a column of vertical light whose top edge ripples; many side by side look like drapery.
  const curtain = (x0, x1, top, depth, grad, opacity) => {
    let d = `M${x0} ${top}`;
    for (let x = x0; x <= x1; x += 40) d += ` L${x} ${f(top + Math.sin(x / 120 + top) * 28 + (rand() - 0.5) * 22)}`;
    d += ` L${x1} ${top + depth} L${x0} ${top + depth} Z`;
    return `<path d="${d}" fill="url(#${grad})" opacity="${opacity}"/>`;
  };
  let rays = "";
  for (let i = 0; i < 46; i++) {
    const x = f(-40 + rand() * (W + 80));
    const w = f(6 + rand() * 26);
    const top = f(150 + rand() * 230);
    const h = f(220 + rand() * 330);
    rays += `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="url(#${rand() > 0.45 ? "gA" : rand() > 0.5 ? "gB" : "gC"})" opacity="${f(0.25 + rand() * 0.5)}"/>`;
  }
  save("aurora.svg", svg(
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03061a"/><stop offset=".6" stop-color="#0a1038"/><stop offset="1" stop-color="#140b3a"/></linearGradient>
     <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#32f5c8" stop-opacity="0"/><stop offset=".3" stop-color="#32f5c8" stop-opacity=".85"/><stop offset=".75" stop-color="#7c4dff" stop-opacity=".45"/><stop offset="1" stop-color="#7c4dff" stop-opacity="0"/></linearGradient>
     <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d36bff" stop-opacity="0"/><stop offset=".3" stop-color="#d36bff" stop-opacity=".8"/><stop offset="1" stop-color="#4cc9ff" stop-opacity="0"/></linearGradient>
     <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6bffd8" stop-opacity="0"/><stop offset=".35" stop-color="#6bffd8" stop-opacity=".7"/><stop offset="1" stop-color="#2a6bff" stop-opacity="0"/></linearGradient>
     <filter id="b1" filterUnits="userSpaceOnUse" x="-300" y="-300" width="2200" height="1600"><feGaussianBlur stdDeviation="30"/></filter>
     <filter id="b2" filterUnits="userSpaceOnUse" x="-300" y="-300" width="2200" height="1600"><feGaussianBlur stdDeviation="9"/></filter>
     <radialGradient id="hz" cx=".5" cy="1" r=".7"><stop offset="0" stop-color="#6a3cff" stop-opacity=".55"/><stop offset="1" stop-color="#6a3cff" stop-opacity="0"/></radialGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>
     ${stars(rand, 480, { area: [0, 0, W, 700] })}
     <g filter="url(#b1)">${curtain(-100, 1700, 250, 420, "gA", 0.9)}${curtain(-100, 1700, 330, 380, "gB", 0.7)}</g>
     <g filter="url(#b2)">${rays}</g>
     <rect y="560" width="${W}" height="440" fill="url(#hz)"/>
     <path d="M0 880 Q400 820 800 850 T1600 830 V1000 H0 Z" fill="#05030f"/>
     <path d="M0 880 Q400 820 800 850 T1600 830" fill="none" stroke="#8f6bff" stroke-opacity=".5" stroke-width="2"/>`,
  ));
}

// ---------------------------------------------------------------------------------------------
// 4. Galaxy: a tilted spiral of thousands of stars around a warm core.
{
  const rand = rng(41);
  let arms = '';
  const palette = ['#ffe4f7', '#f3c6ff', '#c9a6ff', '#9bb6ff', '#7fa0ff'];
  let dustSet = "";
  for (let i = 0; i < 1500; i++) {
    const arm = i % 2;
    const t = Math.pow(rand(), 0.62);
    const angle = t * 9.2 + arm * Math.PI;
    const radius = 20 + t * 560;
    const spread = (rand() - 0.5) * (14 + t * 90);
    const x = f(Math.cos(angle) * radius + spread * Math.sin(angle) * 0.6);
    const y = f(Math.sin(angle) * radius + spread * Math.cos(angle) * 0.6);
    const color = palette[Math.min(palette.length - 1, Math.floor(t * palette.length))];
    const dot = `<circle cx="${x}" cy="${y}" r="${f(0.5 + rand() * (1.5 - t * 0.5))}" fill="${color}" fill-opacity="${f(0.25 + rand() * 0.65 * (1 - t * 0.5))}"/>`;
    arms += dot;
    if (i % 3 === 0) dustSet += `<circle cx="${x}" cy="${y}" r="${f(14 + rand() * 26)}" fill="${color}" fill-opacity=".2"/>`;
  }
  save('galaxy.svg', svg(
    `<radialGradient id="bg" cx=".5" cy=".5" r=".8"><stop offset="0" stop-color="#140a33"/><stop offset="1" stop-color="#03020a"/></radialGradient>
     <radialGradient id="core" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff2fb" stop-opacity="1"/><stop offset=".18" stop-color="#ffc9ef" stop-opacity=".85"/><stop offset=".5" stop-color="#9d6bff" stop-opacity=".3"/><stop offset="1" stop-color="#6a3cff" stop-opacity="0"/></radialGradient>
     <filter id="dust"><feGaussianBlur stdDeviation="14"/></filter>`,
    `<rect width="${W}" height="${H}" fill="url(#bg)"/>
     ${stars(rand, 380)}
     <g transform="translate(800 500) rotate(-28) scale(1 .52)">
       <circle r="330" fill="url(#core)" opacity=".8"/>
       <g filter="url(#dust)" opacity=".9">${dustSet}</g>
       ${arms}
       <circle r="110" fill="url(#core)"/>
     </g>`,
  ));
}

// ---------------------------------------------------------------------------------------------
// 5. Ringed planet: a banded gas giant with a bright rim and a sweeping ring.
{
  const rand = rng(53);
  const bands = ['#ffb9a1', '#f08fb7', '#c26be0', '#8d5cf0', '#f5a3c8', '#b17cf3', '#e58ab9', '#9a6df0'];
  let stripes = '';
  let y = 320;
  for (let i = 0; i < 34; i++) {
    const h = 14 + rand() * 38;
    stripes += `<rect x="-200" y="${f(y)}" width="900" height="${f(h)}" fill="${bands[Math.floor(rand() * bands.length)]}" opacity="${f(0.35 + rand() * 0.5)}"/>`;
    y += h * 0.9;
  }
  save('planet.svg', svg(
    `<linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#04030f"/><stop offset="1" stop-color="#150a33"/></linearGradient>
     <radialGradient id="shade" cx=".3" cy=".28" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#05030f" stop-opacity=".92"/></radialGradient>
     <radialGradient id="atmo" cx=".5" cy=".5" r=".5"><stop offset=".84" stop-color="#c9a6ff" stop-opacity="0"/><stop offset=".95" stop-color="#d9bfff" stop-opacity=".55"/><stop offset="1" stop-color="#d9bfff" stop-opacity="0"/></radialGradient>
     <linearGradient id="ring" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a63c9" stop-opacity="0"/><stop offset=".2" stop-color="#d7c4ff" stop-opacity=".85"/><stop offset=".55" stop-color="#9b7bff" stop-opacity=".7"/><stop offset="1" stop-color="#7a63c9" stop-opacity="0"/></linearGradient>
     <clipPath id="pc"><circle cx="330" cy="760" r="430"/></clipPath><clipPath id="front"><rect x="-200" y="760" width="1200" height="600"/></clipPath>
     <filter id="bl"><feGaussianBlur stdDeviation="3"/></filter><filter id="glow"><feGaussianBlur stdDeviation="30"/></filter>`,
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>
     ${stars(rand, 470)}
     <circle cx="330" cy="760" r="430" fill="#9a6df0" opacity=".35" filter="url(#glow)"/>
     <g transform="rotate(-18 330 760)"><ellipse cx="330" cy="760" rx="780" ry="150" fill="none" stroke="url(#ring)" stroke-width="46" opacity=".55"/><ellipse cx="330" cy="760" rx="690" ry="128" fill="none" stroke="url(#ring)" stroke-width="14" opacity=".6"/></g>
     <circle cx="330" cy="760" r="430" fill="#3a1b73"/>
     <g clip-path="url(#pc)"><g filter="url(#bl)" transform="rotate(-12 330 760)">${stripes}</g></g>
     <circle cx="330" cy="760" r="430" fill="url(#shade)"/>
     <circle cx="330" cy="760" r="440" fill="url(#atmo)"/>
     <g transform="rotate(-18 330 760)" clip-path="url(#front)"><ellipse cx="330" cy="760" rx="780" ry="150" fill="none" stroke="url(#ring)" stroke-width="46"/><ellipse cx="330" cy="760" rx="690" ry="128" fill="none" stroke="url(#ring)" stroke-width="14"/></g>
     <circle cx="1280" cy="190" r="26" fill="#9bb6ff"/><circle cx="1280" cy="190" r="26" fill="url(#shade)"/>`,
  ));
}

// ---------------------------------------------------------------------------------------------
// 6. Comet: a bright head and a long, dusty tail sweeping across a violet sky.
{
  const rand = rng(67);
  let dust = '';
  for (let i = 0; i < 260; i++) {
    const t = rand();
    const x = f(1180 - t * 1000 + (rand() - 0.5) * 110 * t);
    const y = f(230 + t * 560 + (rand() - 0.5) * 130 * t);
    dust += `<circle cx="${x}" cy="${y}" r="${f(0.6 + rand() * 2.2)}" fill="${rand() > 0.5 ? '#bfe1ff' : '#e6c6ff'}" fill-opacity="${f((1 - t) * 0.7)}"/>`;
  }
  save('comet.svg', svg(
    `<linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#05041a"/><stop offset=".6" stop-color="#140a38"/><stop offset="1" stop-color="#2a1255"/></linearGradient>
     <linearGradient id="tail" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7f3ff" stop-opacity=".95"/><stop offset=".25" stop-color="#9fc8ff" stop-opacity=".55"/><stop offset=".7" stop-color="#9b6bff" stop-opacity=".2"/><stop offset="1" stop-color="#9b6bff" stop-opacity="0"/></linearGradient>
     <radialGradient id="head" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="#e3f1ff"/><stop offset=".6" stop-color="#8fb8ff" stop-opacity=".5"/><stop offset="1" stop-color="#8fb8ff" stop-opacity="0"/></radialGradient>
     <filter id="b1"><feGaussianBlur stdDeviation="14"/></filter><filter id="b2"><feGaussianBlur stdDeviation="4"/></filter>
     ${nebulaFilter('n1', 19, '0.004 0.008', [0.5, 0.3, 0.95], 2, -0.72, 9)}`,
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>
     <rect width="${W}" height="${H}" filter="url(#n1)" opacity=".45"/>
     ${stars(rand, 480)}
     <g transform="rotate(30 1180 230)"><path d="M1180 230 L-300 40 L-300 520 Z" fill="url(#tail)" filter="url(#b1)" opacity=".75"/><path d="M1180 230 L-120 120 L-120 340 Z" fill="url(#tail)" filter="url(#b2)"/><path d="M1180 230 L200 200 L200 262 Z" fill="#fff" opacity=".55" filter="url(#b2)"/></g>
     ${dust}
     <circle cx="1180" cy="230" r="120" fill="url(#head)"/><circle cx="1180" cy="230" r="22" fill="#fff"/>`,
  ));
}

// ---------------------------------------------------------------------------------------------
// 7. Eclipse: a dark disc with a blazing corona on a deep blue sky.
{
  const rand = rng(79);
  let rays = '';
  for (let i = 0; i < 90; i++) {
    const a = rand() * Math.PI * 2;
    const len = 250 + rand() * 330;
    const x1 = f(800 + Math.cos(a) * 205); const y1 = f(430 + Math.sin(a) * 205);
    const x2 = f(800 + Math.cos(a) * (205 + len)); const y2 = f(430 + Math.sin(a) * (205 + len));
    rays += `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="#d9c5ff" stroke-opacity="${f(0.05 + rand() * 0.18)}" stroke-width="${f(0.8 + rand() * 2.2)}"/>`;
  }
  save('eclipse.svg', svg(
    `<radialGradient id="bg" cx=".5" cy=".43" r=".75"><stop offset="0" stop-color="#241250"/><stop offset=".5" stop-color="#0b0624"/><stop offset="1" stop-color="#03020a"/></radialGradient>
     <radialGradient id="corona" cx=".5" cy=".5" r=".5"><stop offset=".38" stop-color="#fff" stop-opacity=".95"/><stop offset=".42" stop-color="#e2d0ff" stop-opacity=".75"/><stop offset=".6" stop-color="#9b6bff" stop-opacity=".3"/><stop offset="1" stop-color="#6a3cff" stop-opacity="0"/></radialGradient>
     <radialGradient id="disc" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#14092c"/><stop offset="1" stop-color="#020108"/></radialGradient>
     <filter id="b1"><feGaussianBlur stdDeviation="5"/></filter><filter id="b2"><feGaussianBlur stdDeviation="40"/></filter>`,
    `<rect width="${W}" height="${H}" fill="url(#bg)"/>
     ${stars(rand, 470)}
     <circle cx="800" cy="430" r="330" fill="#8b5cff" opacity=".4" filter="url(#b2)"/>
     <g filter="url(#b1)">${rays}</g>
     <circle cx="800" cy="430" r="440" fill="url(#corona)"/>
     <circle cx="800" cy="430" r="206" fill="url(#disc)"/>
     <circle cx="800" cy="430" r="207" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.5"/>
     <circle cx="1002" cy="365" r="9" fill="#fff"/><circle cx="1002" cy="365" r="46" fill="url(#sg)" opacity=".9"/>`,
  ));
}

// ---------------------------------------------------------------------------------------------
// 8. Constellations: bright stars joined by faint lines over a soft haze.
{
  const rand = rng(97);
  let lines = '';
  let marks = '';
  const clusters = [[300, 280], [820, 200], [1280, 420], [520, 690], [1100, 760]];
  for (const [cx, cy] of clusters) {
    const pts = Array.from({ length: 6 }, () => [f(cx + (rand() - 0.5) * 340), f(cy + (rand() - 0.5) * 230)]);
    lines += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="#bda6ff" stroke-opacity=".38" stroke-width="1.2"/>`;
    for (const [x, y] of pts) marks += `<circle cx="${x}" cy="${y}" r="${f(2 + rand() * 2.5)}" fill="#fff"/><circle cx="${x}" cy="${y}" r="22" fill="url(#sg)" opacity=".8"/>`;
  }
  save('constellations.svg', svg(
    `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050a24"/><stop offset=".6" stop-color="#0c0f3a"/><stop offset="1" stop-color="#1a0f42"/></linearGradient>
     ${nebulaFilter('n1', 5, '0.004 0.006', [0.3, 0.4, 1], 2, -0.74, 12)}${nebulaFilter('n2', 88, '0.005 0.008', [0.7, 0.3, 1], 2, -0.8, 12)}`,
    `<rect width="${W}" height="${H}" fill="url(#bg)"/>
     <rect width="${W}" height="${H}" filter="url(#n1)" opacity=".45"/><rect width="${W}" height="${H}" filter="url(#n2)" opacity=".4"/>
     ${stars(rand, 600)}${lines}${marks}`,
  ));
}

// ---------------------------------------------------------------------------------------------
// Doodles: a repeating tile of outlined moons, stars, planets, rockets, comets and sparkles, in the
// spirit of Telegram's chat pattern but made of Lune's own space things. Drawn very faintly in white.
{
  const rand = rng(5);
  const S = 420;
  const icons = {
    moon: '<path d="M26 4a22 22 0 1 0 0 40a17 17 0 0 1 0-40z"/>',
    star: '<path d="M24 3l6.2 13.4 14.6 1.7-10.8 10 2.9 14.4L24 35.4 11.1 42.5 14 28.1 3.2 18.1l14.6-1.7z"/>',
    planet: '<circle cx="24" cy="24" r="12"/><ellipse cx="24" cy="24" rx="22" ry="6.5" transform="rotate(-24 24 24)"/>',
    rocket: '<path d="M24 3c7 6 9 15 8 25l-4 4H20l-4-4C15 18 17 9 24 3z"/><circle cx="24" cy="18" r="3.4"/><path d="M16 28l-7 8 8-1.5M32 28l7 8-8-1.5M21 36l3 8 3-8"/>',
    comet: '<circle cx="36" cy="12" r="6"/><path d="M31 17L4 40M33 20L12 44M28 14L6 28"/>',
    sparkle: '<path d="M24 4v40M4 24h40M10 10l28 28M38 10L10 38" stroke-width="1.6"/>',
    ufo: '<ellipse cx="24" cy="26" rx="21" ry="7"/><path d="M14 24c0-9 4-14 10-14s10 5 10 14"/><path d="M12 33l-4 8M24 34v8M36 33l4 8"/>',
    cloud: '<path d="M12 34a9 9 0 0 1 1.5-17.8A12 12 0 0 1 36.6 18 8 8 0 0 1 36 34z"/>',
    dot: '<circle cx="24" cy="24" r="3"/>',
  };
  const order = ['moon', 'star', 'planet', 'rocket', 'comet', 'sparkle', 'ufo', 'cloud', 'star', 'planet', 'moon', 'comet'];
  let body = '';
  const cols = 4; const rows = 4;
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const name = order[(n++ + (r % 2) * 3) % order.length];
      const x = (c + (r % 2 ? 0.5 : 0.08)) * (S / cols) + (rand() - 0.5) * 14;
      const y = (r + 0.1) * (S / rows) + (rand() - 0.5) * 14;
      const rot = Math.round((rand() - 0.5) * 70);
      const scale = f(0.85 + rand() * 0.45);
      body += `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot} 24 24) scale(${scale})">${icons[name]}</g>`;
      // little dots between icons
      body += `<g transform="translate(${f(x + 60 + rand() * 20)} ${f(y + 52 + rand() * 20)}) scale(.4)">${icons.dot}</g>`;
    }
  }
  save('doodles.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}"><g fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>\n`);
}
