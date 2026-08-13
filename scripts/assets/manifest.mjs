import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));

export const repositoryRoot = resolve(scriptDirectory, '../..');
export const publicDirectory = resolve(repositoryRoot, 'public');
export const distDirectory = resolve(repositoryRoot, 'dist');
export const candidateDirectory = resolve(
  repositoryRoot,
  'private/checkpoint-reports/milestone-6-candidates',
);

export const palette = Object.freeze({
  navy: '#08111F',
  navyRaised: '#0E1B2D',
  text: '#F5F7FA',
  muted: '#B7C3D4',
  teal: '#5EEAD4',
  sky: '#7DD3FC',
  line: '#2B3B52',
});

export const socialCardCopy = Object.freeze({
  home: Object.freeze([
    'Ahmed Aziz Ben Aissa',
    'AI Systems Engineer',
    'Agentic AI · MCP · RAG · Evaluation & Reliability',
  ]),
  projects: Object.freeze([
    'AI Systems Projects',
    'Ahmed Aziz Ben Aissa',
    'Evidence-led agents · Applied AI research · Responsible AI',
  ]),
});

const defineAsset = (definition) => Object.freeze(definition);

export const candidateAssets = Object.freeze([
  defineAsset({
    filename: 'favicon.svg',
    format: 'svg',
    width: 64,
    height: 64,
    maxBytes: 2 * 1024,
    approvedSha256: '58bde4cedd07f7f9907cf535b54d11f173fb85707852a3f8b9825ff442c5a253',
    publicPath: 'favicon.svg',
    distPath: 'favicon.svg',
    role: 'public-candidate',
  }),
  defineAsset({
    filename: 'apple-touch-icon.png',
    format: 'png',
    width: 180,
    height: 180,
    maxBytes: 40 * 1024,
    requireOpaque: true,
    approvedSha256: 'c1b4047249960ee2f3a373dbe81d95c560264cfddd3d2f677b7910057e8522c8',
    publicPath: 'apple-touch-icon.png',
    distPath: 'apple-touch-icon.png',
    role: 'public-candidate',
  }),
  defineAsset({
    filename: 'home-og.jpg',
    format: 'jpeg',
    width: 1200,
    height: 630,
    maxBytes: 300 * 1024,
    preferredMaxBytes: 180 * 1024,
    requireOpaque: true,
    copyKey: 'home',
    approvedSha256: '70cdf2095893bfb2b6cde45b59bae294949bdfdfcf6b4b8e1bd0174cad12e166',
    publicPath: 'social/home-og.jpg',
    distPath: 'social/home-og.jpg',
    role: 'public-candidate',
  }),
  defineAsset({
    filename: 'projects-og.jpg',
    format: 'jpeg',
    width: 1200,
    height: 630,
    maxBytes: 300 * 1024,
    preferredMaxBytes: 180 * 1024,
    requireOpaque: true,
    copyKey: 'projects',
    approvedSha256: '1ca527eea868fa7f00959740973244ded36931948f36d220c39a283a66e9cdf4',
    publicPath: 'social/projects-og.jpg',
    distPath: 'social/projects-og.jpg',
    role: 'public-candidate',
  }),
  defineAsset({
    filename: 'favicon-16-preview.png',
    format: 'png',
    width: 16,
    height: 16,
    maxBytes: 8 * 1024,
    requireOpaque: false,
    role: 'review-aid',
  }),
  defineAsset({
    filename: 'favicon-32-preview.png',
    format: 'png',
    width: 32,
    height: 32,
    maxBytes: 12 * 1024,
    requireOpaque: false,
    role: 'review-aid',
  }),
  defineAsset({
    filename: 'favicon-64-preview.png',
    format: 'png',
    width: 64,
    height: 64,
    maxBytes: 20 * 1024,
    requireOpaque: false,
    role: 'review-aid',
  }),
  defineAsset({
    filename: 'milestone-6-preview-board.png',
    format: 'png',
    width: 1600,
    height: 1180,
    maxBytes: 1536 * 1024,
    requireOpaque: true,
    role: 'review-aid',
  }),
]);

export const publicCandidateAssets = Object.freeze(
  candidateAssets.filter(({ role }) => role === 'public-candidate'),
);
export const approvedPublicPaths = Object.freeze(
  publicCandidateAssets.map(({ publicPath }) => publicPath),
);
export const approvedDistPaths = Object.freeze(
  publicCandidateAssets.map(({ distPath }) => distPath),
);
export const reviewAidAssets = Object.freeze(
  candidateAssets.filter(({ role }) => role === 'review-aid'),
);
export const candidateFilenames = Object.freeze(candidateAssets.map(({ filename }) => filename));

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

function createSystemMark({ includeNamespace = true } = {}) {
  const namespace = includeNamespace ? ' xmlns="http://www.w3.org/2000/svg"' : '';
  return `<svg${namespace} viewBox="0 0 64 64" aria-hidden="true"><rect x="1" y="1" width="62" height="62" rx="15" fill="${palette.navy}" stroke="${palette.line}" stroke-width="2"/><path d="M16 50L32 14" fill="none" stroke="${palette.teal}" stroke-width="5" stroke-linecap="round"/><path d="M32 14L48 50" fill="none" stroke="${palette.teal}" stroke-width="5" stroke-linecap="round"/><path d="M23 37H41" fill="none" stroke="${palette.sky}" stroke-width="4" stroke-linecap="round"/><circle cx="16" cy="50" r="3.5" fill="${palette.sky}"/><circle cx="32" cy="14" r="3.5" fill="${palette.sky}"/><circle cx="48" cy="50" r="3.5" fill="${palette.sky}"/></svg>`;
}

export function createFaviconSvg() {
  return `${createSystemMark()}\n`;
}

export function createIconRasterDocument({ size, opaque }) {
  if (!Number.isInteger(size) || size < 1 || size > 512) {
    throw new Error('Icon raster size must be an integer between 1 and 512.');
  }
  const background = opaque ? palette.navy : 'transparent';
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{width:${size}px;height:${size}px;margin:0;overflow:hidden;background:${background}}svg{display:block;width:${size}px;height:${size}px}</style></head><body>${createSystemMark()}</body></html>`;
}

export function createSocialCardDocument(copyKey) {
  const lines = socialCardCopy[copyKey];
  if (!lines) throw new Error(`Unknown social-card copy key: ${copyKey}`);
  const lineMarkup = lines
    .map((line, index) => `<p data-approved-line="${index + 1}">${escapeHtml(line)}</p>`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{width:1200px;height:630px;margin:0;overflow:hidden;background:${palette.navy};color:${palette.text};font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{position:relative;padding:90px}.frame{position:absolute;inset:28px;border:2px solid ${palette.line};border-radius:32px}.copy{position:relative;z-index:2;width:760px;height:450px;display:flex;flex-direction:column;justify-content:center}.copy p{margin:0}.copy p:nth-child(1){max-width:780px;font-size:64px;font-weight:760;line-height:1.08;letter-spacing:-2px}.copy p:nth-child(2){margin-top:22px;font-size:36px;font-weight:650;line-height:1.2;color:${palette.teal}}.copy p:nth-child(3){margin-top:30px;max-width:760px;font-size:26px;font-weight:520;line-height:1.35;color:${palette.muted}}.mark{position:absolute;z-index:1;right:92px;top:154px;width:300px;height:300px}.rule{position:absolute;left:90px;bottom:72px;width:192px;height:5px;border-radius:5px;background:${palette.sky}}
</style></head><body><div class="frame" aria-hidden="true"></div><div class="copy">${lineMarkup}</div><div class="mark">${createSystemMark()}</div><div class="rule" aria-hidden="true"></div></body></html>`;
}

function reviewCard(record, displayWidth) {
  return `<article class="asset-card"><div class="asset-stage"><img src="${escapeHtml(record.dataUrl)}" width="${displayWidth}" height="${displayWidth}" alt=""></div><p class="asset-name">${escapeHtml(record.filename)}</p><p class="asset-meta">${record.width} × ${record.height} · ${record.bytes} bytes</p></article>`;
}

export function createPreviewBoardDocument(records) {
  const byFilename = new Map(records.map((record) => [record.filename, record]));
  const required = candidateFilenames.filter(
    (filename) => !['favicon.svg', 'milestone-6-preview-board.png'].includes(filename),
  );
  for (const filename of required) {
    if (!byFilename.has(filename)) throw new Error(`Preview-board input is missing ${filename}.`);
  }
  const iconCards = [16, 32, 64]
    .map((size) => reviewCard(byFilename.get(`favicon-${size}-preview.png`), size))
    .join('');
  const apple = byFilename.get('apple-touch-icon.png');
  const home = byFilename.get('home-og.jpg');
  const projects = byFilename.get('projects-og.jpg');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{width:1600px;height:1180px;margin:0;overflow:hidden;background:${palette.navy};color:${palette.text};font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{padding:48px 56px}h1{margin:0 0 10px;font-size:38px;line-height:1.15}header p{margin:0;color:${palette.muted};font-size:20px}.icons{display:grid;grid-template-columns:repeat(3,220px) 300px;gap:24px;margin-top:36px}.asset-card,.social-card{margin:0;border:1px solid ${palette.line};border-radius:20px;background:${palette.navyRaised};padding:18px}.asset-stage{height:190px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:repeating-conic-gradient(#dbe4ef 0 25%,#f7fafc 0 50%) 50%/24px 24px}.asset-name{margin:14px 0 4px;color:${palette.teal};font-size:17px;font-weight:700}.asset-meta{margin:0;color:${palette.muted};font-size:15px}.socials{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:34px}.social-card img{display:block;width:100%;height:auto;border-radius:12px}.social-card figcaption{margin-top:12px}.social-card strong{display:block;color:${palette.teal};font-size:18px}.social-card span{display:block;margin-top:4px;color:${palette.muted};font-size:15px}.note{margin:30px 0 0;color:${palette.muted};font-size:18px}
</style></head><body><header><h1>Milestone 6 candidate review</h1><p>Owner review evidence — not for public promotion</p></header><section class="icons" aria-label="Icon candidates">${iconCards}${reviewCard(apple, 180)}</section><section class="socials" aria-label="Social image candidates"><figure class="social-card"><img src="${escapeHtml(home.dataUrl)}" alt=""><figcaption><strong>${home.filename}</strong><span>${home.width} × ${home.height} · ${home.bytes} bytes</span></figcaption></figure><figure class="social-card"><img src="${escapeHtml(projects.dataUrl)}" alt=""><figcaption><strong>${projects.filename}</strong><span>${projects.width} × ${projects.height} · ${projects.bytes} bytes</span></figcaption></figure></section><p class="note">Favicon previews are shown at actual 16, 32 and 64 CSS-pixel sizes. Filenames, dimensions and byte sizes sit outside the candidate artwork.</p></body></html>`;
}
