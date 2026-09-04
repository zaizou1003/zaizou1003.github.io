import { execFile } from 'node:child_process';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const defaultRepositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

export const FORBIDDEN_DELETION_PATHS = Object.freeze([
  'build/404.html',
  'build/asset-manifest.json',
  'build/banner.png',
  'build/Icons/MyLogo.png',
  'build/Icons/MyLogo-512x512.png',
  'build/index.html',
  'build/manifest.json',
  'build/models/brain.glb',
  'build/MyLogo.png',
  'build/sitemap.xml',
  'build/static/css/main.bf538fe7.css',
  'build/static/css/main.bf538fe7.css.map',
  'build/static/js/285.6c3989a2.chunk.js',
  'build/static/js/285.6c3989a2.chunk.js.map',
  'build/static/media/ani.71ad656f28468bb7e073.png',
  'build/static/media/certificate-logo.b269033eda68d24c0945.jpg',
  'build/static/media/cv.adf83312dbb69d444dcf.pdf',
  'build/static/media/dash.d05c11a881c9bd9f4374.png',
  'build/static/media/Ecommerce.c3e8f05912f165297fdb.png',
  'build/static/media/knife.ae1d0c76b16b7b535fc1.jpg',
  'build/static/media/lyc.bf8777062b52d5e90354.png',
  'build/static/media/MyLogo.087c2801e05ac1c5e8b0.png',
  'build/static/media/profile_pic-1.a51b8045d6f0ddab2e10.jpg',
  'build/static/media/profile_pic-2.f4034fe5152af4e36973.png',
  'build/static/media/ViewAllCardImg.477c80761bfda54cfdf7.png',
  'CNAME',
  'models/brain.glb',
  'public/banner.png',
  'public/Icons/MyLogo.png',
  'public/Icons/MyLogo-512x512.png',
  'public/index.html',
  'public/manifest.json',
  'public/models/brain.glb',
  'public/MyLogo.png',
  'src/App.css',
  'src/App.js',
  'src/components/About/AboutStyle.js',
  'src/components/About/index.js',
  'src/components/Cards/EducationCard.jsx',
  'src/components/Cards/ExperienceCard.jsx',
  'src/components/Cards/ProjectCards.jsx',
  'src/components/Cards/ViewAllCard.jsx',
  'src/components/Certificates/index.js',
  'src/components/Contact/index.js',
  'src/components/Education/index.js',
  'src/components/Footer/index.js',
  'src/components/Header/Header.jsx',
  'src/components/HeroBgAnimation/HeroBgAnimationStyle.js',
  'src/components/HeroBgAnimation/index.js',
  'src/components/HeroSection/HeroStyle.js',
  'src/components/HeroSection/index.js',
  'src/components/mind/back.js',
  'src/components/mind/index.js',
  'src/components/mind/style.js',
  'src/components/Navbar/index.js',
  'src/components/Navbar/NavbarStyledComponent.js',
  'src/components/ProjectDetails/index.jsx',
  'src/components/Projects/index.js',
  'src/components/Projects/ProjectsStyle.js',
  'src/components/Skills/index.js',
  'src/FirebaseConfig.js',
  'src/index.js',
  'src/pages/AllProjects.jsx',
  'src/pages/FuturisticMind.jsx',
  'src/pages/Home.jsx',
  'src/pages/TermsandConditions.jsx',
  'src/themes/default.js',
]);

export const APPROVED_GITATTRIBUTES_SOURCE = '* text=auto eol=lf\n';

export const APPROVED_DEPENDENCIES = Object.freeze({
  react: '19.2.8',
  'react-dom': '19.2.8',
});

export const APPROVED_DEV_DEPENDENCIES = Object.freeze({
  '@vitejs/plugin-react': '6.0.5',
  'axe-core': '4.13.0',
  oxlint: '1.81.0',
  vite: '8.2.1',
});

export const PROHIBITED_DEPENDENCIES = Object.freeze([
  'react-scripts',
  '@babel/plugin-proposal-private-property-in-object',
  '@testing-library/jest-dom',
  '@testing-library/react',
  '@testing-library/user-event',
  'firebase',
  '@vercel/speed-insights',
  'web-vitals',
  'three',
  '@react-three/fiber',
  '@react-three/drei',
  'styled-components',
  '@emotion/react',
  '@emotion/styled',
  'tailwindcss',
  '@mui/material',
  '@mui/lab',
  '@fortawesome/free-brands-svg-icons',
  '@fortawesome/free-solid-svg-icons',
  '@fortawesome/react-fontawesome',
  '@mui/icons-material',
  'react-icons',
  '@emailjs/browser',
  'emailjs',
  'react-router-dom',
  'react-scroll',
  'react-helmet',
  'typewriter-effect',
  'gh-pages',
  'lodash',
]);

const FORBIDDEN_PATH_SET = new Set(FORBIDDEN_DELETION_PATHS.map((path) => path.toLowerCase()));
const PROHIBITED_DEPENDENCY_SET = new Set(PROHIBITED_DEPENDENCIES);
const APPROVED_RUNTIME_PACKAGE_SET = new Set(Object.keys(APPROVED_DEPENDENCIES));
const SCRIPT_EXTENSIONS = new Set(['.js', '.jsx', '.mjs']);
const IMPORT_TARGET_EXTENSIONS = Object.freeze(['', '.js', '.jsx', '.mjs', '.json', '.css']);
const EXCLUDED_WORKING_DIRECTORIES = new Set([
  '.git',
  '.prerender',
  '.vite',
  'coverage',
  'dist',
  'node_modules',
  'private',
]);
const SENSITIVE_ASSET_EXTENSIONS = new Set([
  '.cer',
  '.crt',
  '.der',
  '.gif',
  '.jpeg',
  '.jpg',
  '.key',
  '.p12',
  '.pdf',
  '.pem',
  '.pfx',
  '.png',
  '.svg',
  '.webp',
]);

function contractError(rule, path) {
  return new Error(path ? `${rule}: ${path}` : rule);
}

export function normalizeRepositoryPath(input) {
  if (typeof input !== 'string' || input.length === 0) {
    throw contractError('invalid-repository-path');
  }
  if (input.includes('\\') || input.includes('\0')) {
    throw contractError('invalid-repository-path');
  }
  if (input.startsWith('/') || /^[A-Za-z]:/.test(input)) {
    throw contractError('invalid-repository-path');
  }

  const segments = input.split('/');
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    throw contractError('invalid-repository-path');
  }
  return segments.join('/');
}

function normalizePathList(paths, label) {
  if (!Array.isArray(paths)) throw contractError(`malformed-${label}`);
  const normalized = paths.map(normalizeRepositoryPath);
  if (new Set(normalized).size !== normalized.length) {
    throw contractError(`duplicate-${label}`);
  }
  return normalized;
}

function isSensitiveRecoveryAsset(path) {
  const lowerPath = path.toLowerCase();
  const extension = extname(lowerPath);
  const basename = lowerPath.split('/').at(-1);
  if (extension === '.glb') return true;
  if (lowerPath === 'src/utils/data.js' || lowerPath === 'src/utils/cv.pdf') return true;
  if (lowerPath === 'cname' || lowerPath === 'public/cname') return true;
  if (lowerPath === 'public/index.html' || lowerPath === 'public/manifest.json') return true;
  if (SENSITIVE_ASSET_EXTENSIONS.has(extension) && /(?:^|[-_.])(cv|resume)(?:[-_.]|$)/i.test(basename)) {
    return true;
  }
  if (SENSITIVE_ASSET_EXTENSIONS.has(extension) && /certificat(?:e|ion)/i.test(basename)) {
    return true;
  }
  return SENSITIVE_ASSET_EXTENSIONS.has(extension) && /(?:^|\/)recovery(?:\/|[-_.])/i.test(lowerPath);
}

function assertPathAllowed(path, source) {
  const lowerPath = path.toLowerCase();
  if (FORBIDDEN_PATH_SET.has(lowerPath)) throw contractError('forbidden-legacy-path', path);
  if (lowerPath.startsWith('build/')) throw contractError('forbidden-build-path', path);
  if (source === 'tracked' && lowerPath.startsWith('dist/')) {
    throw contractError('tracked-dist-path', path);
  }
  if (source === 'tracked' && lowerPath.endsWith('.map')) {
    throw contractError('tracked-source-map', path);
  }
  if (isSensitiveRecoveryAsset(path)) throw contractError('forbidden-recovery-asset', path);
}

export function validateLegacyPathInventory({
  workingPaths,
  trackedPaths,
  deletedTrackedPaths = [],
}) {
  const working = normalizePathList(workingPaths, 'working-paths');
  const tracked = normalizePathList(trackedPaths, 'tracked-paths');
  const deleted = normalizePathList(deletedTrackedPaths, 'deleted-tracked-paths');
  const trackedSet = new Set(tracked);
  for (const path of deleted) {
    if (!trackedSet.has(path)) throw contractError('deleted-path-not-tracked', path);
  }

  const deletedSet = new Set(deleted);
  const effectiveTrackedPaths = tracked.filter((path) => !deletedSet.has(path));
  for (const path of working) assertPathAllowed(path, 'working');
  for (const path of effectiveTrackedPaths) assertPathAllowed(path, 'tracked');

  return Object.freeze({
    workingPathCount: working.length,
    effectiveTrackedPathCount: effectiveTrackedPaths.length,
  });
}

function assertExactDependencyObject(actual, expected, label) {
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) {
    throw contractError(`malformed-${label}`);
  }
  const actualEntries = Object.entries(actual).sort(([left], [right]) => left.localeCompare(right));
  const expectedEntries = Object.entries(expected).sort(([left], [right]) => left.localeCompare(right));
  if (JSON.stringify(actualEntries) !== JSON.stringify(expectedEntries)) {
    throw contractError(`dependency-contract-${label}`);
  }
}

export function validateDependencyManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw contractError('malformed-package-manifest');
  }
  assertExactDependencyObject(manifest.dependencies, APPROVED_DEPENDENCIES, 'runtime');
  assertExactDependencyObject(manifest.devDependencies, APPROVED_DEV_DEPENDENCIES, 'development');
  for (const section of ['optionalDependencies', 'peerDependencies', 'bundledDependencies']) {
    if (manifest[section] && Object.keys(manifest[section]).length > 0) {
      throw contractError(`dependency-contract-${section}`);
    }
  }
  return Object.freeze({ runtime: 2, development: 4 });
}

function packageNameFromSpecifier(specifier) {
  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/');
  return specifier.split('/')[0];
}

export function extractImportSpecifiers(source, sourcePath = 'source.js') {
  if (typeof source !== 'string') throw contractError('malformed-source-text', sourcePath);
  const specifiers = [];
  const patterns = [
    /(?:^|[;\n\r])\s*import\s+(?:[^'"();]+?\s+from\s+)?(['"])([^'"\n\r]+)\1/g,
    /(?:^|[;\n\r])\s*export\s+[^'"();]+?\s+from\s+(['"])([^'"\n\r]+)\1/g,
    /\bimport\s*\(\s*(['"])([^'"\n\r]+)\1\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.push(match[2]);
  }
  return [...new Set(specifiers)];
}

function resolveImportCandidates(importer, specifier) {
  if (specifier.includes('\\') || specifier.includes('\0')) {
    throw contractError('invalid-import-path', importer);
  }
  const baseSegments = dirname(importer).split('/');
  const targetSegments = specifier.split('/');
  const resolvedSegments = [...baseSegments];
  for (const segment of targetSegments) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      if (resolvedSegments.length === 0) throw contractError('import-path-traversal', importer);
      resolvedSegments.pop();
      continue;
    }
    resolvedSegments.push(segment);
  }
  const target = normalizeRepositoryPath(resolvedSegments.join('/'));
  if (!target.startsWith('src/')) throw contractError('import-outside-source', importer);

  const candidates = [];
  for (const extension of IMPORT_TARGET_EXTENSIONS) candidates.push(`${target}${extension}`);
  for (const extension of IMPORT_TARGET_EXTENSIONS.slice(1)) candidates.push(`${target}/index${extension}`);
  return [...new Set(candidates)];
}

export function validateSourceImports({ sourceFiles, existingPaths }) {
  if (!sourceFiles || typeof sourceFiles !== 'object' || Array.isArray(sourceFiles)) {
    throw contractError('malformed-source-map');
  }
  const existing = new Set(normalizePathList(existingPaths, 'source-inventory'));
  let importCount = 0;

  for (const [rawPath, source] of Object.entries(sourceFiles)) {
    const sourcePath = normalizeRepositoryPath(rawPath);
    if (!sourcePath.startsWith('src/') || !SCRIPT_EXTENSIONS.has(extname(sourcePath))) {
      throw contractError('unexpected-source-module', sourcePath);
    }
    for (const specifier of extractImportSpecifiers(source, sourcePath)) {
      importCount += 1;
      if (specifier.startsWith('.')) {
        const candidates = resolveImportCandidates(sourcePath, specifier);
        if (candidates.some((candidate) => FORBIDDEN_PATH_SET.has(candidate.toLowerCase()))) {
          throw contractError('legacy-relative-import', sourcePath);
        }
        if (!candidates.some((candidate) => existing.has(candidate))) {
          throw contractError('missing-relative-import', sourcePath);
        }
        continue;
      }
      if (specifier.startsWith('/') || specifier.includes(':')) {
        throw contractError('invalid-source-import', sourcePath);
      }
      const packageName = packageNameFromSpecifier(specifier);
      if (PROHIBITED_DEPENDENCY_SET.has(packageName)) {
        throw contractError('prohibited-package-import', sourcePath);
      }
      if (!APPROVED_RUNTIME_PACKAGE_SET.has(packageName)) {
        throw contractError('undeclared-source-import', sourcePath);
      }
    }
  }
  return Object.freeze({ sourceModuleCount: Object.keys(sourceFiles).length, importCount });
}

export function validateGitignoreContract(source) {
  if (typeof source !== 'string') throw contractError('malformed-gitignore');
  const rules = new Set(
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#')),
  );
  if (!rules.has('/build/')) throw contractError('missing-build-ignore');
  if (!rules.has('dist/')) throw contractError('missing-dist-ignore');
  if (rules.has('!/build/') || rules.has('!dist/')) throw contractError('negated-output-ignore');
  return Object.freeze({ buildIgnored: true, distIgnored: true });
}

export function validateGitattributesContract(source, workingPaths) {
  if (typeof source !== 'string') throw contractError('malformed-gitattributes');
  const working = normalizePathList(workingPaths, 'gitattributes-working-paths');
  if (!working.includes('.gitattributes')) throw contractError('missing-gitattributes');
  if (source !== APPROVED_GITATTRIBUTES_SOURCE) throw contractError('gitattributes-contract');
  return Object.freeze({ deterministicLf: true });
}

function extractModuleScripts(html, path) {
  if (typeof html !== 'string') throw contractError('malformed-html-entry', path);
  return [...html.matchAll(/<script\b(?=[^>]*\btype=["']module["'])[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi)].map(
    (match) => match[1],
  );
}

export function validateEntryContract({ viteSource, homeHtml, projectsHtml, serverSource }) {
  if (typeof viteSource !== 'string' || typeof serverSource !== 'string') {
    throw contractError('malformed-vite-entry-contract');
  }
  const requiredVitePatterns = [
    /base:\s*['"]\/['"]/,
    /publicDir:\s*false/,
    /home:\s*resolve\(repositoryRoot,\s*['"]index\.html['"]\)/,
    /projects:\s*resolve\(repositoryRoot,\s*['"]projects\/index\.html['"]\)/,
    /input:\s*resolve\(repositoryRoot,\s*['"]src\/entries\/server\.jsx['"]\)/,
    /sourcemap:\s*false/,
  ];
  if (requiredVitePatterns.some((pattern) => !pattern.test(viteSource))) {
    throw contractError('vite-entry-contract');
  }
  if (viteSource.includes('react-router') || viteSource.includes('create-react-app')) {
    throw contractError('secondary-build-system');
  }
  const homeScripts = extractModuleScripts(homeHtml, 'index.html');
  const projectScripts = extractModuleScripts(projectsHtml, 'projects/index.html');
  if (JSON.stringify(homeScripts) !== JSON.stringify(['/src/entries/home.client.jsx'])) {
    throw contractError('home-client-entry-contract');
  }
  if (JSON.stringify(projectScripts) !== JSON.stringify(['/src/entries/projects.client.jsx'])) {
    throw contractError('projects-client-entry-contract');
  }
  for (const [html, path] of [[homeHtml, 'index.html'], [projectsHtml, 'projects/index.html']]) {
    if (!/<div\s+id=["']root["']>\s*<!--app-html-->\s*<\/div>\s*<!--app-root-end-->/.test(html)) {
      throw contractError('prerender-root-contract', path);
    }
  }
  for (const pattern of [
    /renderToString/,
    /\.\.\/pages\/HomePage\.jsx/,
    /\.\.\/pages\/ProjectsPage\.jsx/,
  ]) {
    if (!pattern.test(serverSource)) throw contractError('server-entry-contract');
  }
  return Object.freeze({ clientEntries: 2, serverEntries: 1 });
}

export function validateLegacyRemovalState({
  workingPaths,
  trackedPaths,
  deletedTrackedPaths = [],
  gitattributesSource,
  gitignoreSource,
  packageManifest,
  sourceFiles,
  existingPaths = workingPaths,
  entrySources,
}) {
  if (!entrySources || typeof entrySources !== 'object') {
    throw contractError('malformed-entry-sources');
  }
  const paths = validateLegacyPathInventory({ workingPaths, trackedPaths, deletedTrackedPaths });
  const attributes = validateGitattributesContract(gitattributesSource, workingPaths);
  const ignores = validateGitignoreContract(gitignoreSource);
  const dependencies = validateDependencyManifest(packageManifest);
  const imports = validateSourceImports({ sourceFiles, existingPaths });
  const entries = validateEntryContract(entrySources);
  return Object.freeze({ status: 'verified', paths, attributes, ignores, dependencies, imports, entries });
}

function assertWithinRoot(root, candidate) {
  const relativePath = relative(root, candidate);
  if (!relativePath || relativePath.startsWith('..') || resolve(root, relativePath) !== candidate) {
    throw contractError('path-boundary');
  }
  return normalizeRepositoryPath(relativePath.replaceAll('\\', '/'));
}

async function collectWorkingPaths(repositoryRoot) {
  const paths = [];
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (directory === repositoryRoot && EXCLUDED_WORKING_DIRECTORIES.has(entry.name)) continue;
      const candidate = resolve(directory, entry.name);
      const repositoryPath = assertWithinRoot(repositoryRoot, candidate);
      const pathStat = await lstat(candidate);
      if (pathStat.isSymbolicLink()) throw contractError('symlink-in-validation-boundary', repositoryPath);
      if (pathStat.isDirectory()) {
        await walk(candidate);
      } else if (pathStat.isFile()) {
        paths.push(repositoryPath);
      } else {
        throw contractError('unsupported-path-type', repositoryPath);
      }
    }
  }
  await walk(repositoryRoot);
  return paths.sort();
}

async function readRegularText(repositoryRoot, repositoryPath) {
  const normalizedPath = normalizeRepositoryPath(repositoryPath);
  const absolutePath = resolve(repositoryRoot, ...normalizedPath.split('/'));
  assertWithinRoot(repositoryRoot, absolutePath);
  const pathStat = await lstat(absolutePath);
  if (pathStat.isSymbolicLink() || !pathStat.isFile()) {
    throw contractError('non-regular-text-source', normalizedPath);
  }
  return readFile(absolutePath, 'utf8');
}

async function gitPathList(repositoryRoot, args, exec = execFileAsync) {
  let result;
  try {
    result = await exec('git', args, {
      cwd: repositoryRoot,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    });
  } catch {
    throw contractError('git-inventory-failure');
  }
  if (!result || typeof result.stdout !== 'string') throw contractError('git-inventory-failure');
  return result.stdout.split('\0').filter(Boolean).map(normalizeRepositoryPath);
}

export async function verifyRepositoryLegacyRemoval({
  repositoryRoot = defaultRepositoryRoot,
  exec = execFileAsync,
} = {}) {
  const resolvedRoot = resolve(repositoryRoot);
  const rootStat = await lstat(resolvedRoot);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw contractError('repository-root-type');

  const [workingPaths, trackedPaths, deletedTrackedPaths] = await Promise.all([
    collectWorkingPaths(resolvedRoot),
    gitPathList(resolvedRoot, ['ls-files', '-z'], exec),
    gitPathList(resolvedRoot, ['ls-files', '--deleted', '-z'], exec),
  ]);
  if (!workingPaths.includes('.gitattributes')) throw contractError('missing-gitattributes');
  const sourcePaths = workingPaths.filter(
    (path) => path.startsWith('src/') && SCRIPT_EXTENSIONS.has(extname(path)),
  );
  const sourceEntries = await Promise.all(
    sourcePaths.map(async (path) => [path, await readRegularText(resolvedRoot, path)]),
  );
  let packageManifest;
  try {
    packageManifest = JSON.parse(await readRegularText(resolvedRoot, 'package.json'));
  } catch (error) {
    if (error.message?.startsWith('non-regular-text-source')) throw error;
    throw contractError('malformed-package-manifest', 'package.json');
  }

  return validateLegacyRemovalState({
    workingPaths,
    trackedPaths,
    deletedTrackedPaths,
    gitattributesSource: await readRegularText(resolvedRoot, '.gitattributes'),
    gitignoreSource: await readRegularText(resolvedRoot, '.gitignore'),
    packageManifest,
    sourceFiles: Object.fromEntries(sourceEntries),
    existingPaths: workingPaths,
    entrySources: {
      viteSource: await readRegularText(resolvedRoot, 'vite.config.js'),
      homeHtml: await readRegularText(resolvedRoot, 'index.html'),
      projectsHtml: await readRegularText(resolvedRoot, 'projects/index.html'),
      serverSource: await readRegularText(resolvedRoot, 'src/entries/server.jsx'),
    },
  });
}

const isCommandLine = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCommandLine) {
  const result = await verifyRepositoryLegacyRemoval();
  console.log(
    JSON.stringify({
      status: result.status,
      workingPaths: result.paths.workingPathCount,
      effectiveTrackedPaths: result.paths.effectiveTrackedPathCount,
      sourceModules: result.imports.sourceModuleCount,
    }),
  );
}
