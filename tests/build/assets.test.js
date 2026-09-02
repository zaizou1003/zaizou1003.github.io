import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import {
  approvedDistPaths,
  approvedPublicPaths,
  candidateAssets,
  candidateFilenames,
  createFaviconSvg,
  createPreviewBoardDocument,
  createSocialCardDocument,
  palette,
  publicCandidateAssets,
  publicDirectory,
  socialCardCopy,
} from '../../scripts/assets/manifest.mjs';
import { copyStaticAssets } from '../../scripts/copy-static-assets.mjs';
import {
  assertAssetPrivacy,
  assertSafeCandidateFilename,
  encodePngChunk,
  resolveCandidatePath,
  resolvePublishedAssetPath,
  validateAssetManifest,
  validatePublishedAssetManifest,
  verifyApprovedCompositions,
  verifyCandidateBuffer,
  verifyCandidateDirectory,
  verifyDistAssets,
  verifyPublicAssets,
  verifySvgText,
} from '../../scripts/verify-assets.mjs';
import { projects } from '../../src/data/projects.js';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function createPng({ width = 1, height = 1, alpha = 255, extraChunks = [] } = {}) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rows = [];
  for (let row = 0; row < height; row += 1) {
    const pixels = Buffer.alloc(width * 4);
    for (let column = 0; column < width; column += 1) {
      const offset = column * 4;
      pixels[offset] = 8;
      pixels[offset + 1] = 17;
      pixels[offset + 2] = 31;
      pixels[offset + 3] = alpha;
    }
    rows.push(Buffer.from([0]), pixels);
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    encodePngChunk('IHDR', ihdr),
    ...extraChunks,
    encodePngChunk('IDAT', deflateSync(Buffer.concat(rows))),
    encodePngChunk('IEND'),
  ]);
}

function jpegSegment(marker, data) {
  const length = Buffer.alloc(2);
  length.writeUInt16BE(data.length + 2);
  return Buffer.concat([Buffer.from([0xff, marker]), length, data]);
}

function createJpeg({ width = 1, height = 1, extraSegments = [], thumbnail = false } = {}) {
  const jfif = Buffer.alloc(14);
  jfif.write('JFIF\0', 0, 'ascii');
  jfif[5] = 1;
  jfif[6] = 1;
  jfif.writeUInt16BE(72, 8);
  jfif.writeUInt16BE(72, 10);
  jfif[12] = thumbnail ? 1 : 0;
  const sof = Buffer.from([
    8,
    (height >>> 8) & 0xff,
    height & 0xff,
    (width >>> 8) & 0xff,
    width & 0xff,
    3,
    1,
    0x11,
    0,
    2,
    0x11,
    0,
    3,
    0x11,
    0,
  ]);
  const scan = Buffer.from([3, 1, 0, 2, 0, 3, 0, 0, 63, 0]);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    jpegSegment(0xe0, jfif),
    ...extraSegments,
    jpegSegment(0xc0, sof),
    jpegSegment(0xda, scan),
    Buffer.from([0x11, 0x22, 0xff, 0x00, 0x33]),
    Buffer.from([0xff, 0xd9]),
  ]);
}

function fixtureDefinition(overrides) {
  return {
    filename: 'fixture.png',
    format: 'png',
    width: 1,
    height: 1,
    maxBytes: 1024 * 1024,
    requireOpaque: true,
    ...overrides,
  };
}

async function createPublishedSourceFixture({ omit = null } = {}) {
  const directory = await mkdtemp(resolve(tmpdir(), 'portfolio-public-asset-test-'));
  await mkdir(resolve(directory, 'social'));
  for (const definition of publicCandidateAssets) {
    if (definition.publicPath === omit) continue;
    await copyFile(
      resolvePublishedAssetPath(publicDirectory, definition.publicPath, approvedPublicPaths),
      resolvePublishedAssetPath(directory, definition.publicPath, approvedPublicPaths),
    );
  }
  return directory;
}

test('the approved manifest is exact, unique and fixed to eight review outputs', () => {
  assert.equal(validateAssetManifest(), candidateAssets);
  assert.deepEqual(candidateFilenames, [
    'favicon.svg',
    'apple-touch-icon.png',
    'home-og.jpg',
    'projects-og.jpg',
    'favicon-16-preview.png',
    'favicon-32-preview.png',
    'favicon-64-preview.png',
    'milestone-6-preview-board.png',
  ]);
  assert.equal(candidateAssets.filter(({ role }) => role === 'public-candidate').length, 4);
  assert.equal(candidateAssets.filter(({ role }) => role === 'review-aid').length, 4);
});

test('manifest validation rejects duplicates, extras and extension/MIME mismatches', async (context) => {
  const duplicate = candidateAssets.map((asset, index) =>
    index === 1 ? { ...asset, filename: candidateAssets[0].filename } : asset,
  );
  const unexpected = candidateAssets.map((asset, index) =>
    index === 0 ? { ...asset, filename: 'favicon.ico' } : asset,
  );
  const mismatch = candidateAssets.map((asset, index) =>
    index === 0 ? { ...asset, format: 'png' } : asset,
  );
  await context.test('duplicate destination', () =>
    assert.throws(() => validateAssetManifest(duplicate), /duplicate-asset-destination/),
  );
  await context.test('unexpected entry', () =>
    assert.throws(() => validateAssetManifest(unexpected), /unexpected-asset-manifest-entry/),
  );
  await context.test('extension mismatch', () =>
    assert.throws(() => validateAssetManifest(mismatch), /asset-extension-mismatch/),
  );
});

test('the published asset manifest locks the exact four source paths, dist paths and approved hashes', () => {
  assert.equal(validatePublishedAssetManifest(), publicCandidateAssets);
  assert.deepEqual(approvedPublicPaths, [
    'favicon.svg',
    'apple-touch-icon.png',
    'social/home-og.jpg',
    'social/projects-og.jpg',
  ]);
  assert.deepEqual(approvedDistPaths, approvedPublicPaths);
  assert.deepEqual(
    publicCandidateAssets.map(({ approvedSha256 }) => approvedSha256),
    [
      '58bde4cedd07f7f9907cf535b54d11f173fb85707852a3f8b9825ff442c5a253',
      'c1b4047249960ee2f3a373dbe81d95c560264cfddd3d2f677b7910057e8522c8',
      '70cdf2095893bfb2b6cde45b59bae294949bdfdfcf6b4b8e1bd0174cad12e166',
      '1ca527eea868fa7f00959740973244ded36931948f36d220c39a283a66e9cdf4',
    ],
  );
});

test('published manifest validation rejects missing, extra, duplicate and altered entries', async (context) => {
  const clone = () => publicCandidateAssets.map((definition) => ({ ...definition }));
  await context.test('missing entry', () =>
    assert.throws(
      () => validatePublishedAssetManifest(clone().slice(0, -1)),
      /unexpected-published-asset-manifest-entry/,
    ),
  );
  await context.test('extra entry', () =>
    assert.throws(
      () => validatePublishedAssetManifest([...clone(), { ...publicCandidateAssets[0] }]),
      /unexpected-published-asset-manifest-entry/,
    ),
  );
  await context.test('duplicate destination', () => {
    const definitions = clone();
    definitions[1].publicPath = definitions[0].publicPath;
    assert.throws(
      () => validatePublishedAssetManifest(definitions),
      /duplicate-published-asset-destination/,
    );
  });
  await context.test('traversal path', () => {
    const definitions = clone();
    definitions[0].publicPath = '../favicon.svg';
    assert.throws(
      () => validatePublishedAssetManifest(definitions),
      /unexpected-published-asset-manifest-entry/,
    );
  });
  await context.test('backslash path', () => {
    const definitions = clone();
    definitions[2].distPath = 'social\\home-og.jpg';
    assert.throws(
      () => validatePublishedAssetManifest(definitions),
      /unexpected-published-asset-manifest-entry/,
    );
  });
  await context.test('hash drift', () => {
    const definitions = clone();
    definitions[0].approvedSha256 = '0'.repeat(64);
    assert.throws(
      () => validatePublishedAssetManifest(definitions),
      /unexpected-published-asset-manifest-entry/,
    );
  });
  await context.test('extra field', () => {
    const definitions = clone();
    definitions[0].unapproved = true;
    assert.throws(
      () => validatePublishedAssetManifest(definitions),
      /unexpected-published-asset-manifest-entry/,
    );
  });
});

test('candidate path enforcement rejects traversal, backslashes, URLs and private filenames', () => {
  assert.equal(assertSafeCandidateFilename('favicon.svg'), 'favicon.svg');
  assert.equal(resolveCandidatePath('C:\\safe-root', 'favicon.svg'), resolve('C:\\safe-root', 'favicon.svg'));
  for (const unsafe of [
    '../favicon.svg',
    '..\\favicon.svg',
    'nested/favicon.svg',
    'favicon.svg?token=test',
    'https://example.invalid/favicon.svg',
    'cv.pdf',
    'certificate.png',
    'brain.glb',
  ]) {
    assert.throws(() => assertSafeCandidateFilename(unsafe), /unsafe-candidate-path/);
  }
});

test('favicon source is the exact approved first-party numeric composition', () => {
  const svg = createFaviconSvg();
  const result = verifySvgText(svg, { requireExactComposition: true });
  assert.deepEqual(result, { format: 'svg', width: 64, height: 64, opaque: false });
  assert.ok(Buffer.byteLength(svg, 'utf8') <= 2 * 1024);
  assert.match(svg, /viewBox="0 0 64 64"/);
  assert.equal((svg.match(/<circle\b/g) ?? []).length, 3);
  assert.equal((svg.match(/<path\b/g) ?? []).length, 3);
  assert.equal(svg.includes('<text'), false);
  assert.equal(svg.includes('<metadata'), false);
  assert.equal(svg.includes('<!--'), false);
});

test('SVG verification rejects active, external, textual and unapproved geometry', async (context) => {
  const svg = createFaviconSvg();
  const fixtures = [
    ['script', svg.replace('</svg>', '<script/></svg>'), /disallowed-svg-content/],
    ['metadata', svg.replace('</svg>', '<metadata/></svg>'), /disallowed-svg-content/],
    ['comment', svg.replace('</svg>', '<!-- hidden --></svg>'), /disallowed-svg-content/],
    ['visible text', svg.replace('</svg>', '<text>brand</text></svg>'), /disallowed-svg-content/],
    ['external reference', svg.replace('<rect ', '<rect href="https://example.invalid/x" '), /disallowed-svg-reference/],
    ['filter', svg.replace('<rect ', '<rect filter="url(#x)" '), /disallowed-svg-reference/],
    ['raster', svg.replace('</svg>', '<image href="data:image/png;base64,test"/></svg>'), /disallowed-svg-reference|disallowed-svg-element/],
    ['numeric but unapproved change', svg.replace('M16 50L32 14', 'M15 50L32 14'), /unapproved-svg-composition/],
  ];
  for (const [name, fixture, pattern] of fixtures) {
    await context.test(name, () =>
      assert.throws(() => verifySvgText(fixture, { requireExactComposition: true }), pattern),
    );
  }
});

test('social compositions contain only the exact owner-approved wording', () => {
  const result = verifyApprovedCompositions();
  assert.deepEqual(result.home, socialCardCopy.home);
  assert.deepEqual(result.projects, socialCardCopy.projects);
  for (const key of ['home', 'projects']) {
    const document = createSocialCardDocument(key);
    for (const line of socialCardCopy[key]) assert.ok(document.includes(line.replace('&', '&amp;')));
    assert.equal(/<(?:img|script|link|iframe)\b/i.test(document), false);
  }
});

test('social composition verification rejects wording drift, extra text and network resources', async (context) => {
  const home = createSocialCardDocument('home');
  const projects = createSocialCardDocument('projects');
  const base = { home, projects };
  const fixtures = [
    ['wording drift', home.replace('AI Systems Engineer', 'AI Engineer'), /unapproved-social-copy/],
    ['extra visible text', home.replace('</body>', '<p>extra</p></body>'), /extra-visible-social-copy/],
    ['external image', home.replace('</body>', '<img src="https://example.invalid/x"></body>'), /disallowed-social-resource/],
    ['signed resource', home.replace('</body>', '<img src="/x?token=test"></body>'), /disallowed-social-resource/],
  ];
  for (const [name, fixture, pattern] of fixtures) {
    await context.test(name, () =>
      assert.throws(
        () => verifyApprovedCompositions({ socialDocuments: { ...base, home: fixture } }),
        pattern,
      ),
    );
  }
});

test('asset privacy checks reject sensitive classes without returning matched values', async (context) => {
  const fixtures = [
    ['phone-like-value', 'Call +999 000 000 000'],
    ['email-address', 'owner@example.invalid'],
    ['credential-like-value', 'api_key=redacted-test-value'],
    ['signed-or-expiring-url', 'asset.jpg?signature=redacted'],
    ['service-identifier', 'firebase'],
    ['recovery-private-path', 'src/utils/cv.pdf'],
    ['employer-reference', 'Ayming'],
  ];
  for (const [rule, fixture] of fixtures) {
    await context.test(rule, () => {
      let message = '';
      assert.throws(
        () => assertAssetPrivacy(fixture, 'candidate-artwork'),
        (error) => {
          message = error.message;
          return message.startsWith(rule);
        },
      );
      assert.equal(message.includes(fixture), false);
    });
  }
  assert.doesNotThrow(() =>
    assertAssetPrivacy(
      [...socialCardCopy.home, ...socialCardCopy.projects].join('\n'),
      'approved-social-copy',
    ),
  );
});

test('PNG verification accepts valid opaque pixels and rejects transparency and metadata', async (context) => {
  const opaque = createPng();
  assert.equal(verifyCandidateBuffer(opaque, fixtureDefinition()).opaque, true);
  await context.test('alpha transparency', () =>
    assert.throws(
      () => verifyCandidateBuffer(createPng({ alpha: 0 }), fixtureDefinition()),
      /asset-transparency/,
    ),
  );
  for (const type of ['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME', 'pHYs']) {
    await context.test(`${type} metadata`, () =>
      assert.throws(
        () =>
          verifyCandidateBuffer(
            createPng({ extraChunks: [encodePngChunk(type, Buffer.from('redacted'))] }),
            fixtureDefinition(),
          ),
        /png-metadata-chunk/,
      ),
    );
  }
});

test('PNG verification rejects corruption, truncation, wrong dimensions and trailing payloads', async (context) => {
  const valid = createPng();
  const corrupt = Buffer.from(valid);
  corrupt[corrupt.length - 8] ^= 1;
  const fixtures = [
    ['signature', Buffer.from('not png'), fixtureDefinition(), /png-signature/],
    ['truncated', valid.subarray(0, valid.length - 3), fixtureDefinition(), /truncated-png-chunk|invalid-png-chunk/],
    ['CRC', corrupt, fixtureDefinition(), /png-crc/],
    ['dimensions', valid, fixtureDefinition({ width: 2 }), /asset-dimensions/],
    ['trailing payload', Buffer.concat([valid, Buffer.from('x')]), fixtureDefinition(), /png-trailing-data/],
    ['byte budget', valid, fixtureDefinition({ maxBytes: valid.length - 1 }), /asset-byte-budget/],
  ];
  for (const [name, buffer, definition, pattern] of fixtures) {
    await context.test(name, () =>
      assert.throws(() => verifyCandidateBuffer(buffer, definition), pattern),
    );
  }
});

test('JPEG verification accepts the approved structural contract', () => {
  const jpeg = createJpeg({ width: 1200, height: 630 });
  const result = verifyCandidateBuffer(
    jpeg,
    fixtureDefinition({
      filename: 'fixture.jpg',
      format: 'jpeg',
      width: 1200,
      height: 630,
      maxBytes: 300 * 1024,
    }),
  );
  assert.equal(result.format, 'jpeg');
  assert.equal(result.opaque, true);
});

test('JPEG verification rejects metadata, comments, thumbnails, corruption and trailing payloads', async (context) => {
  const definition = fixtureDefinition({ filename: 'fixture.jpg', format: 'jpeg' });
  const valid = createJpeg();
  const fixtures = [
    ['EXIF/XMP APP1', createJpeg({ extraSegments: [jpegSegment(0xe1, Buffer.from('Exif\0\0'))] }), /jpeg-private-metadata/],
    ['IPTC APP13', createJpeg({ extraSegments: [jpegSegment(0xed, Buffer.from('IPTC'))] }), /jpeg-private-metadata/],
    ['unapproved ICC APP2', createJpeg({ extraSegments: [jpegSegment(0xe2, Buffer.from('ICC_PROFILE\0'))] }), /unapproved-jpeg-app-segment/],
    ['Adobe APP14', createJpeg({ extraSegments: [jpegSegment(0xee, Buffer.from('Adobe'))] }), /unapproved-jpeg-app-segment/],
    ['comment', createJpeg({ extraSegments: [jpegSegment(0xfe, Buffer.from('comment'))] }), /jpeg-comment/],
    ['thumbnail', createJpeg({ thumbnail: true }), /jpeg-thumbnail/],
    ['trailing payload', Buffer.concat([valid, Buffer.from('x')]), /jpeg-trailing-or-incomplete-data/],
    ['truncated', valid.subarray(0, valid.length - 2), /invalid-jpeg-marker-boundary|missing-jpeg-eoi/],
    ['wrong dimensions', valid, /asset-dimensions/],
    ['wrong MIME', createPng(), /jpeg-signature/],
  ];
  for (const [name, buffer, pattern] of fixtures) {
    const currentDefinition =
      name === 'wrong dimensions' ? { ...definition, width: 2 } : definition;
    await context.test(name, () =>
      assert.throws(() => verifyCandidateBuffer(buffer, currentDefinition), pattern),
    );
  }
});

test('directory verification checks exact inventory, regular files, hashes and every definition', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'portfolio-asset-test-'));
  try {
    for (const definition of candidateAssets) {
      const buffer =
        definition.format === 'svg'
          ? Buffer.from(createFaviconSvg(), 'utf8')
          : definition.format === 'png'
            ? createPng({ width: definition.width, height: definition.height })
            : createJpeg({ width: definition.width, height: definition.height });
      await writeFile(resolveCandidatePath(directory, definition.filename), buffer);
    }
    const verified = await verifyCandidateDirectory({ directory });
    assert.equal(verified.status, 'verified');
    assert.equal(verified.assets.length, candidateAssets.length);
    assert.ok(verified.assets.every(({ sha256 }) => /^[a-f0-9]{64}$/.test(sha256)));
    await writeFile(resolve(directory, 'unexpected.txt'), 'unexpected');
    await assert.rejects(
      () => verifyCandidateDirectory({ directory }),
      /candidate-directory-inventory/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('directory verification rejects a symlink in the exact candidate inventory when supported', async (context) => {
  const directory = await mkdtemp(resolve(tmpdir(), 'portfolio-asset-symlink-test-'));
  const targetDirectory = await mkdtemp(resolve(tmpdir(), 'portfolio-asset-symlink-target-'));
  const target = resolve(targetDirectory, 'target.svg');
  try {
    await writeFile(target, createFaviconSvg());
    try {
      await symlink(target, resolve(directory, 'favicon.svg'), 'file');
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) {
        context.skip('File symlinks are not available in this Windows environment.');
        return;
      }
      throw error;
    }
    for (const definition of candidateAssets.filter(({ filename }) => filename !== 'favicon.svg')) {
      const buffer =
        definition.format === 'png'
          ? createPng({ width: definition.width, height: definition.height })
          : createJpeg({ width: definition.width, height: definition.height });
      await writeFile(resolveCandidatePath(directory, definition.filename), buffer);
    }
    await assert.rejects(
      () => verifyCandidateDirectory({ directory }),
      /candidate-directory-inventory|candidate-must-be-a-regular-file/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
    await rm(targetDirectory, { recursive: true, force: true });
  }
});

test('the promoted public files match all four approved hashes and format contracts', async () => {
  const result = await verifyPublicAssets();
  assert.equal(result.status, 'verified');
  assert.deepEqual(result.assets.map(({ path }) => path), approvedPublicPaths);
  assert.deepEqual(
    result.assets.map(({ sha256 }) => sha256),
    publicCandidateAssets.map(({ approvedSha256 }) => approvedSha256),
  );
});

test('the production copier copies only the four approved bytes and ignores inherited public files', async () => {
  const sourceDirectory = await createPublishedSourceFixture();
  const destinationDirectory = await mkdtemp(resolve(tmpdir(), 'portfolio-dist-asset-test-'));
  try {
    await writeFile(resolve(sourceDirectory, 'banner.png'), 'legacy fixture');
    await writeFile(resolve(sourceDirectory, 'manifest.json'), '{}');
    await writeFile(resolve(sourceDirectory, 'favicon-16-preview.png'), 'review aid fixture');
    const result = await copyStaticAssets({ sourceDirectory, destinationDirectory });
    assert.equal(result.status, 'copied-and-verified');
    assert.deepEqual(result.copied.map(({ destination }) => destination), approvedDistPaths);
    for (const definition of publicCandidateAssets) {
      const source = await readFile(
        resolvePublishedAssetPath(sourceDirectory, definition.publicPath, approvedPublicPaths),
      );
      const destination = await readFile(
        resolvePublishedAssetPath(destinationDirectory, definition.distPath, approvedDistPaths),
      );
      assert.ok(destination.equals(source));
    }
    assert.deepEqual((await readdir(destinationDirectory)).sort(), [
      'apple-touch-icon.png',
      'favicon.svg',
      'social',
    ]);
    assert.deepEqual((await readdir(resolve(destinationDirectory, 'social'))).sort(), [
      'home-og.jpg',
      'projects-og.jpg',
    ]);
  } finally {
    await rm(sourceDirectory, { recursive: true, force: true });
    await rm(destinationDirectory, { recursive: true, force: true });
  }
});

test('public and dist verification reject missing, corrupt, extra and non-regular assets', async (context) => {
  await context.test('missing public source', async () => {
    const sourceDirectory = await createPublishedSourceFixture({ omit: 'favicon.svg' });
    try {
      await assert.rejects(() => verifyPublicAssets({ directory: sourceDirectory }), /ENOENT/);
    } finally {
      await rm(sourceDirectory, { recursive: true, force: true });
    }
  });

  await context.test('corrupt promoted source', async () => {
    const sourceDirectory = await createPublishedSourceFixture();
    try {
      await writeFile(resolve(sourceDirectory, 'favicon.svg'), '<svg></svg>');
      await assert.rejects(
        () => verifyPublicAssets({ directory: sourceDirectory }),
        /invalid-system-mark-geometry|invalid-svg-namespace|approved-asset-hash-mismatch/,
      );
    } finally {
      await rm(sourceDirectory, { recursive: true, force: true });
    }
  });

  await context.test('directory in place of regular source file', async () => {
    const sourceDirectory = await createPublishedSourceFixture({ omit: 'favicon.svg' });
    try {
      await mkdir(resolve(sourceDirectory, 'favicon.svg'));
      await assert.rejects(
        () => verifyPublicAssets({ directory: sourceDirectory }),
        /published-asset-must-be-a-regular-file/,
      );
    } finally {
      await rm(sourceDirectory, { recursive: true, force: true });
    }
  });

  await context.test('unexpected inherited dist asset', async () => {
    const sourceDirectory = await createPublishedSourceFixture();
    const destinationDirectory = await mkdtemp(resolve(tmpdir(), 'portfolio-dist-extra-test-'));
    try {
      await copyStaticAssets({ sourceDirectory, destinationDirectory });
      await writeFile(resolve(destinationDirectory, 'banner.png'), 'legacy fixture');
      await assert.rejects(
        () => verifyDistAssets({ directory: destinationDirectory, sourceDirectory }),
        /unexpected-dist-asset/,
      );
    } finally {
      await rm(sourceDirectory, { recursive: true, force: true });
      await rm(destinationDirectory, { recursive: true, force: true });
    }
  });

  await context.test('missing required dist asset', async () => {
    const sourceDirectory = await createPublishedSourceFixture();
    const destinationDirectory = await mkdtemp(resolve(tmpdir(), 'portfolio-dist-missing-test-'));
    try {
      await copyStaticAssets({ sourceDirectory, destinationDirectory });
      await rm(resolve(destinationDirectory, 'social/home-og.jpg'));
      await assert.rejects(
        () => verifyDistAssets({ directory: destinationDirectory, sourceDirectory }),
        /ENOENT/,
      );
    } finally {
      await rm(sourceDirectory, { recursive: true, force: true });
      await rm(destinationDirectory, { recursive: true, force: true });
    }
  });

  await context.test('valid-format but wrong approved dist bytes', async () => {
    const sourceDirectory = await createPublishedSourceFixture();
    const destinationDirectory = await mkdtemp(resolve(tmpdir(), 'portfolio-dist-hash-test-'));
    try {
      await copyStaticAssets({ sourceDirectory, destinationDirectory });
      await copyFile(
        resolve(destinationDirectory, 'social/projects-og.jpg'),
        resolve(destinationDirectory, 'social/home-og.jpg'),
      );
      await assert.rejects(
        () => verifyDistAssets({ directory: destinationDirectory, sourceDirectory }),
        /approved-asset-hash-mismatch/,
      );
    } finally {
      await rm(sourceDirectory, { recursive: true, force: true });
      await rm(destinationDirectory, { recursive: true, force: true });
    }
  });
});

test('public verification rejects symlinked approved files when supported', async (context) => {
  const sourceDirectory = await createPublishedSourceFixture({ omit: 'favicon.svg' });
  const targetDirectory = await mkdtemp(resolve(tmpdir(), 'portfolio-public-symlink-target-'));
  const target = resolve(targetDirectory, 'favicon.svg');
  try {
    await copyFile(resolve(publicDirectory, 'favicon.svg'), target);
    try {
      await symlink(target, resolve(sourceDirectory, 'favicon.svg'), 'file');
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) {
        context.skip('File symlinks are not available in this Windows environment.');
        return;
      }
      throw error;
    }
    await assert.rejects(
      () => verifyPublicAssets({ directory: sourceDirectory }),
      /published-asset-symlink/,
    );
  } finally {
    await rm(sourceDirectory, { recursive: true, force: true });
    await rm(targetDirectory, { recursive: true, force: true });
  }
});

test('Milestone 7 templates delegate all favicon, social and JSON-LD wiring to one transform marker', async () => {
  for (const file of ['index.html', 'projects/index.html']) {
    const html = await readFile(file, 'utf8');
    assert.equal(/rel=["'](?:icon|apple-touch-icon)["']/i.test(html), false);
    assert.equal(/(?:og:image|twitter:image|canonical|application\/ld\+json)/i.test(html), false);
    assert.equal(html.split('<!--page-metadata-->').length - 1, 1);
  }
});

test('the package scripts use the exact verified Milestone 7 build order with publicDir disabled', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
  assert.equal(packageJson.scripts['generate:assets'], 'node scripts/generate-assets.mjs');
  assert.equal(packageJson.scripts['verify:assets'], 'node scripts/verify-assets.mjs');
  assert.equal(packageJson.scripts['copy:assets'], 'node scripts/copy-static-assets.mjs');
  assert.equal(packageJson.scripts['validate:metadata'], 'node scripts/validate-metadata.mjs');
  assert.equal(packageJson.scripts['verify:crawl'], 'node scripts/verify-crawl-files.mjs');
  assert.equal(packageJson.scripts['copy:crawl'], 'node scripts/copy-crawl-files.mjs');
  assert.equal(packageJson.scripts['check:budgets'], 'node scripts/check-budgets.mjs');
  assert.equal(
    packageJson.scripts.build,
    'npm run validate:content && npm run validate:metadata && npm run verify:assets && npm run verify:crawl && npm run build:client && npm run copy:assets && npm run copy:crawl && npm run build:ssr && npm run prerender && npm run verify:dist && npm run check:budgets',
  );
  const viteConfig = await readFile('vite.config.js', 'utf8');
  assert.match(viteConfig, /\bpublicDir:\s*false\b/);
  assert.match(viteConfig, /\bcopyPublicDir:\s*false\b/g);
});

test('review aids never enter public source or a verified dist asset set', async () => {
  for (const filename of [
    'favicon-16-preview.png',
    'favicon-32-preview.png',
    'favicon-64-preview.png',
    'milestone-6-preview-board.png',
  ]) {
    await assert.rejects(() => readFile(resolve(publicDirectory, filename)), /ENOENT/);
    assert.equal(approvedPublicPaths.includes(filename), false);
    assert.equal(approvedDistPaths.includes(filename), false);
  }
});

test('the preview board labels private review evidence outside candidate artwork', () => {
  const records = candidateAssets
    .filter(({ filename }) => !['favicon.svg', 'milestone-6-preview-board.png'].includes(filename))
    .map((definition) => ({ ...definition, bytes: 123, dataUrl: 'data:image/png;base64,AA==' }));
  const board = createPreviewBoardDocument(records);
  for (const { filename } of records) assert.ok(board.includes(filename));
  assert.match(board, /actual 16, 32 and 64 CSS-pixel sizes/);
  assert.match(board, /not for public promotion/);
});

test('all project image fields remain null during brand-only Phase A', () => {
  assert.ok(projects.length > 0);
  assert.ok(projects.every(({ image }) => image === null));
});

test('the approved palette remains the deep-navy, teal and sky-blue design system', () => {
  assert.deepEqual(
    { navy: palette.navy, teal: palette.teal, sky: palette.sky },
    { navy: '#08111F', teal: '#5EEAD4', sky: '#7DD3FC' },
  );
});
