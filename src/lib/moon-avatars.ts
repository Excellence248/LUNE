/** Generated moon avatars: tiny SVG data URIs, so they work with the existing avatar_url string column. */

const PALETTES: { name: string; light: string; mid: string; dark: string }[] = [
  { name: 'Amethyst', light: '#d8b8ff', mid: '#9a5fd8', dark: '#4a1f86' },
  { name: 'Ocean', light: '#a9d4ff', mid: '#4f8de0', dark: '#1d3f86' },
  { name: 'Rose', light: '#ffc0e0', mid: '#e0629f', dark: '#80214f' },
  { name: 'Mint', light: '#b6f5da', mid: '#3fbf92', dark: '#146047' },
  { name: 'Amber', light: '#ffe2a8', mid: '#e6a23c', dark: '#85521a' },
  { name: 'Slate', light: '#d5dbea', mid: '#7e8aa8', dark: '#363f5c' },
];

const build = (p: (typeof PALETTES)[number]) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
<defs><radialGradient id="b" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="${p.light}"/><stop offset=".5" stop-color="${p.mid}"/><stop offset="1" stop-color="${p.dark}"/></radialGradient></defs>
<rect width="200" height="200" fill="#0b0414"/>
<circle cx="100" cy="100" r="86" fill="url(#b)"/>
<g fill="${p.dark}" fill-opacity=".55" stroke="${p.light}" stroke-opacity=".5" stroke-width="2.5">
<ellipse cx="62" cy="62" rx="17" ry="20"/><ellipse cx="132" cy="56" rx="20" ry="14"/><ellipse cx="54" cy="130" rx="12" ry="15"/><ellipse cx="146" cy="136" rx="15" ry="11"/><ellipse cx="108" cy="162" rx="9" ry="7"/></g>
<ellipse cx="84" cy="102" rx="8" ry="12" fill="#0b0414"/><ellipse cx="116" cy="102" rx="8" ry="12" fill="#0b0414"/>
<ellipse cx="83" cy="97" rx="3.2" ry="4.6" fill="#fff"/><ellipse cx="115" cy="97" rx="3.2" ry="4.6" fill="#fff"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const MOON_AVATARS = PALETTES.map(palette => ({ name: palette.name, url: build(palette) }));
