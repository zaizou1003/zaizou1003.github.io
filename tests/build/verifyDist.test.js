import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FIXED_DISTRIBUTION_PATHS,
  ROOT_END_SENTINEL,
  assertAllowedArtifactFilename,
  assertPublishSafeArtifactText,
  assertTrustedDistributionPaths,
  extractRootMarkup,
  verifyPageHtml,
} from '../../scripts/verify-dist.mjs';
import { iconDefinitions } from '../../src/components/ui/iconPaths.js';
import {
  transformPageHtml,
  verifyPageMetadataHtml,
} from '../../scripts/metadata/html-transform.mjs';
import {
  portfolioData,
  selectCapabilities,
  selectFeaturedCertifications,
  selectFeaturedProjects,
  selectPublishedEducation,
  selectPublishedExperience,
  selectPublishedProjects,
  selectPublishedSkillGroups,
} from '../../src/data/index.js';
import { formatMonthRange, formatMonthYear, formatYearRange } from '../../src/utils/dates.js';
import {
  ALL_PROJECTS_CATEGORY,
  getAvailableProjectCategories,
} from '../../src/utils/projectFilters.js';
import {
  getProjectArtifactLinks,
  getProjectCategoryLabel,
  getProjectWorkModeLabel,
} from '../../src/utils/projectPresentation.js';

const contract = { id: 'home', relativeFile: 'index.html', heading: 'Ahmed Aziz Ben Aissa' };

function primaryLinks(pageId) {
  const prefix = pageId === 'home' ? '' : '/';
  return [
    [`${prefix}#capabilities`, 'Capabilities'],
    [`${prefix}#featured-projects`, 'Projects'],
    [`${prefix}#experience`, 'Experience'],
    [`${prefix}#skills`, 'Skills'],
    [`${prefix}#certifications`, 'Certifications'],
    [`${prefix}#education`, 'Education'],
    [`${prefix}#contact`, 'Contact'],
    ['/projects/', 'All projects'],
  ]
    .map(([href, label]) => `<li><a href="${href}">${label}</a></li>`)
    .join('');
}

function completeMarkup(pageId = 'home') {
  const mainContent =
    pageId === 'home'
      ? homeNarrative()
      : projectsNarrative();
  return [
    '<a class="skip-link" href="#main">Skip to main content</a>',
    '<header class="site-header"><div data-hydrate-navigation>',
    '<nav aria-label="Primary"><details><summary>Menu</summary>',
    `<ul>${primaryLinks(pageId)}</ul></details></nav>`,
    '</div></header>',
    `<main id="main" data-static-page="${pageId}">${mainContent}</main>`,
    '<footer class="site-footer"><ul data-footer-contacts="">',
    '<li><a href="mailto:Ahmedazizbenaissa@gmail.com" data-contact-kind="email">Email</a></li>',
    '<li><a href="https://www.linkedin.com/in/ahmed-ben-aissa-5b34992a3/" data-contact-kind="linkedin">LinkedIn</a></li>',
    '<li><a href="https://github.com/zaizou1003" data-contact-kind="github">GitHub</a></li>',
    '</ul></footer>',
  ].join('');
}

function homeNarrative() {
  const featuredProjects = selectFeaturedProjects(portfolioData.projects);
  const capabilityMarkup = selectCapabilities(portfolioData.capabilities)
    .map(
      (capability) =>
        `<article data-capability-id="${capability.id}"><h3>${capability.title}</h3><p>${capability.description}</p>${capability.evidenceProjectIds.map((id) => `<a href="#${id}">${id}</a>`).join('')}</article>`,
    )
    .join('');
  const projectMarkup = featuredProjects
    .map((project) => {
      const evidence = project.evidenceResults
        .slice(0, 3)
        .map(
          (result) =>
            `<li><strong>${result.label}</strong><span>${result.value}</span><span>${result.method}</span></li>`,
        )
        .join('');
      const artifacts = getProjectArtifactLinks(project).length > 0
        ? `<div data-project-artifacts="">${getProjectArtifactLinks(project).map((link) => `<a href="${link.href}">${link.label}</a>`).join('')}</div>`
        : '';
      const approvedFacts = [
        project.summary,
        project.role,
        getProjectWorkModeLabel(project.workMode),
        ...project.detailedDescription,
        ...project.technologies,
      ]
        .map((value) => `<p>${value}</p>`)
        .join('');
      return `<article data-featured-project-id="${project.id}" data-work-mode="${project.workMode}"><h3><a href="/projects/#${project.id}">${project.title}</a></h3>${approvedFacts}<ul data-project-evidence="">${evidence}</ul>${artifacts}</article>`;
    })
    .join('');
  const experienceMarkup = selectPublishedExperience(portfolioData.experience)
    .map(
      (record) => {
        const values = [
          record.employer,
          record.roleTitle,
          formatMonthRange(record.startDate, record.endDate),
          record.summary,
          ...record.highlights,
          ...record.technologies,
          ...(record.confidentialityNote ? [record.confidentialityNote] : []),
        ];
        return `<article data-experience-id="${record.id}">${values.map((value) => `<p>${value}</p>`).join('')}</article>`;
      },
    )
    .join('');
  const skillMarkup = selectPublishedSkillGroups(
    portfolioData.skills,
    portfolioData.projects,
    portfolioData.experience,
  )
    .map(
      (group) =>
        `<article data-skill-group-id="${group.id}"><h3>${group.title}</h3>${group.skills.map((skill) => `<span>${skill.name}</span>`).join('')}</article>`,
    )
    .join('');
  const certificationMarkup = selectFeaturedCertifications(portfolioData.certifications)
    .map(
      (record) =>
        `<article data-certification-id="${record.id}"><p>${record.issuer}</p><h3>${record.title}</h3><p>${formatMonthYear(record.issuedDate)}${record.expiresDate ? ` ${formatMonthYear(record.expiresDate)}` : ''}</p></article>`,
    )
    .join('');
  const educationMarkup = selectPublishedEducation(portfolioData.education)
    .map(
      (record) =>
        `<article data-education-id="${record.id}"><p>${formatYearRange(record.startDate, record.endDate)}</p><h3>${record.institution}</h3><p>${record.program}</p><p>${record.location}</p></article>`,
    )
    .join('');
  const contacts = ['email', 'linkedin', 'github']
    .map((kind) => {
      const link = portfolioData.profile.links[kind];
      return `<a href="${link.href}" data-home-contact-kind="${kind}">${link.label}</a>`;
    })
    .join('');

  return [
    `<section data-home-section="hero"><h1>${portfolioData.profile.name}</h1><p>${portfolioData.profile.role}</p><p>${portfolioData.profile.valueProposition}</p><p>${portfolioData.profile.summary}</p></section>`,
    `<section id="capabilities" data-home-section="capabilities">${capabilityMarkup}</section>`,
    `<section id="featured-projects" data-home-section="featured-projects">${projectMarkup}</section>`,
    `<section id="experience" data-home-section="experience">${experienceMarkup}</section>`,
    '<section id="selected-work" data-home-section="selected-work"><p data-selected-work-state="evidence-review">Only evidence-reviewed work is published here; additional technical case studies remain under validation.</p></section>',
    `<section id="skills" data-home-section="skills">${skillMarkup}</section>`,
    `<section id="certifications" data-home-section="certifications">${certificationMarkup}</section>`,
    `<section id="education" data-home-section="education">${educationMarkup}</section>`,
    `<section id="contact" data-home-section="contact">${contacts}</section>`,
  ].join('');
}

function projectsNarrative() {
  const publishedProjects = selectPublishedProjects(portfolioData.projects);
  const availableCategories = getAvailableProjectCategories(publishedProjects);
  const filters = [ALL_PROJECTS_CATEGORY, ...availableCategories]
    .map(
      (category) =>
        `<button aria-pressed="${category === ALL_PROJECTS_CATEGORY}" data-project-filter="${category}">${category === ALL_PROJECTS_CATEGORY ? 'All' : getProjectCategoryLabel(category)}</button>`,
    )
    .join('');
  const articles = publishedProjects
    .map((project) => {
      const facts = [
        project.summary,
        ...project.detailedDescription,
        project.role,
        getProjectWorkModeLabel(project.workMode),
        ...project.technologies,
        ...project.categories.map(getProjectCategoryLabel),
      ]
        .map((value) => `<p>${value}</p>`)
        .join('');
      const evidence = project.evidenceResults
        .map(
          (result) =>
            `<li><strong>${result.label}</strong><span>${result.value}</span><span>${result.method}</span></li>`,
        )
        .join('');
      const artifactLinks = getProjectArtifactLinks(project);
      const artifacts = artifactLinks.length > 0
        ? `<div data-project-artifacts="">${artifactLinks.map((link) => `<a href="${link.href}">${link.label}</a>`).join('')}</div>`
        : '';
      return `<article data-project-article-id="${project.id}" data-work-mode="${project.workMode}"><h3><a href="#${project.id}">${project.title}</a></h3>${facts}<ul data-project-evidence="">${evidence}</ul>${artifacts}</article>`;
    })
    .join('');

  return [
    '<section><h1>Projects</h1><p>Evidence-led case studies.</p></section>',
    '<div data-hydrate-projects="" data-hydration-status="static">',
    `<section><h2>Published project case studies</h2><div data-project-filter-controls="" hidden="">${filters}</div>`,
    `<p data-project-results-status="">Showing ${publishedProjects.length} of ${publishedProjects.length} projects.</p>`,
    `<ol data-project-article-list="">${articles}</ol></section></div>`,
  ].join('');
}

function documentWith(rootContent, { beforeBoundary = '', boundary = ROOT_END_SENTINEL } = {}) {
  return `<!doctype html><html><body><div id="root">${rootContent}</div>${beforeBoundary}${boundary}<script type="module" src="/client.js"></script></body></html>`;
}

test('production verifier accepts a complete mount with nested div elements', () => {
  const markup = completeMarkup();
  const html = documentWith(markup);
  assert.equal(extractRootMarkup(html, 'fixture'), markup);
  assert.doesNotThrow(() => verifyPageHtml(html, contract));
});

test('production body and metadata verifiers accept one complete transformed static document', () => {
  const template = `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><meta name="color-scheme" content="dark" /><meta name="theme-color" content="#08111F" /><!--page-metadata--></head><body><div id="root">${completeMarkup()}</div>${ROOT_END_SENTINEL}<script type="module" src="/client.js"></script></body></html>`;
  const html = transformPageHtml(template, 'home');
  assert.doesNotThrow(() => verifyPageHtml(html, contract));
  assert.doesNotThrow(() => verifyPageMetadataHtml(html, 'home'));
});

test('empty root with populated sibling fails exact-boundary verification', () => {
  const html = documentWith('', { beforeBoundary: completeMarkup() });
  assert.throws(() => verifyPageHtml(html, contract), /outside #root|empty/i);
});

test('whitespace, comment-only and loading-only mounts fail', async (context) => {
  const fixtures = ['   \n ', '<!-- static placeholder -->', 'Loading...', 'Please wait'];
  for (const content of fixtures) {
    await context.test(content.trim() || 'whitespace', () => {
      assert.throws(
        () => verifyPageHtml(documentWith(content, { beforeBoundary: completeMarkup() }), contract),
        /outside #root|empty|comment|loading shell/i,
      );
    });
  }
});

test('missing and duplicate root openings fail', async (context) => {
  await context.test('missing root', () => {
    const html = documentWith(completeMarkup()).replace('id="root"', 'id="other"');
    assert.throws(() => verifyPageHtml(html, contract), /exactly one #root opening/i);
  });
  await context.test('duplicate root', () => {
    const html = documentWith(`<div id="root"></div>${completeMarkup()}`);
    assert.throws(() => verifyPageHtml(html, contract), /exactly one #root opening/i);
  });
});

test('missing and duplicate root-end boundaries fail', async (context) => {
  await context.test('missing boundary', () => {
    assert.throws(
      () => verifyPageHtml(documentWith(completeMarkup(), { boundary: '' }), contract),
      /exactly one root-end boundary/i,
    );
  });
  await context.test('duplicate boundary', () => {
    assert.throws(
      () =>
        verifyPageHtml(
          documentWith(completeMarkup(), { boundary: `${ROOT_END_SENTINEL}${ROOT_END_SENTINEL}` }),
          contract,
        ),
      /exactly one root-end boundary/i,
    );
  });
});

test('static shell verification requires the skip link and labelled primary navigation', async (context) => {
  await context.test('skip link', () => {
    const html = documentWith(completeMarkup().replace('class="skip-link"', 'class="removed"'));
    assert.throws(() => verifyPageHtml(html, contract), /one skip link/i);
  });
  await context.test('primary label', () => {
    const html = documentWith(completeMarkup().replace('aria-label="Primary"', ''));
    assert.throws(() => verifyPageHtml(html, contract), /labelled primary navigation/i);
  });
});

test('projects shell uses root-form homepage anchors', () => {
  const projectsContract = {
    id: 'projects',
    relativeFile: 'projects/index.html',
    heading: 'Projects',
  };
  assert.doesNotThrow(() => verifyPageHtml(documentWith(completeMarkup('projects')), projectsContract));
  assert.match(completeMarkup('projects'), /href="\/#experience"/);
});

test('static shell verification requires all three approved contact types', () => {
  const html = documentWith(
    completeMarkup().replace('data-contact-kind="github"', 'data-contact-kind="removed"'),
  );
  assert.throws(() => verifyPageHtml(html, contract), /approved GitHub contact link/i);
});

test('homepage requires the exact published flagship set and order', () => {
  const firstId = portfolioData.projects[0].id;
  const secondId = portfolioData.projects[1].id;
  const html = documentWith(
    completeMarkup().replace(
      `data-featured-project-id="${firstId}"`,
      `data-featured-project-id="${secondId}"`,
    ),
  );
  assert.throws(() => verifyPageHtml(html, contract), /exact published flagship order/i);
});

test('homepage requires the exact stable section order', () => {
  const html = documentWith(
    completeMarkup().replace(
      'data-home-section="capabilities"',
      'data-home-section="capabilities-moved"',
    ),
  );
  assert.throws(() => verifyPageHtml(html, contract), /section order/i);
});

test('a project with null artifact URLs cannot render a placeholder anchor', () => {
  const metaMind = portfolioData.projects[2];
  const markup = completeMarkup();
  const articleStart = markup.indexOf(`data-featured-project-id="${metaMind.id}"`);
  const articleEnd = markup.indexOf('</article>', articleStart);
  const changedMarkup = `${markup.slice(0, articleEnd)}<a href="#">Repository unavailable</a>${markup.slice(articleEnd)}`;
  assert.throws(
    () => verifyPageHtml(documentWith(changedMarkup), contract),
    /unapproved or missing artifact link/i,
  );
});

test('homepage flagship titles link to their stable Projects article anchors', () => {
  const markup = completeMarkup();
  for (const project of selectFeaturedProjects(portfolioData.projects)) {
    assert.match(markup, new RegExp(`href="/projects/#${project.id}"`));
  }
  assert.doesNotThrow(() => verifyPageHtml(documentWith(markup), contract));
});

test('VroomVroom cannot enter personal flagship project markup', () => {
  const markup = completeMarkup();
  const firstProjectStart = markup.indexOf(
    `data-featured-project-id="${portfolioData.projects[0].id}"`,
  );
  const firstProjectEnd = markup.indexOf('</article>', firstProjectStart);
  const changedMarkup = `${markup.slice(0, firstProjectEnd)}<p>VroomVroom</p>${markup.slice(firstProjectEnd)}`;
  assert.throws(
    () => verifyPageHtml(documentWith(changedMarkup), contract),
    /VroomVroom inside personal project/i,
  );
});

test('Projects page requires the exact complete published project order', () => {
  const projectsContract = {
    id: 'projects',
    relativeFile: 'projects/index.html',
    heading: 'Projects',
  };
  const firstId = portfolioData.projects[0].id;
  const secondId = portfolioData.projects[1].id;
  const html = documentWith(
    completeMarkup('projects').replace(
      `data-project-article-id="${firstId}"`,
      `data-project-article-id="${secondId}"`,
    ),
  );
  assert.throws(() => verifyPageHtml(html, projectsContract), /deterministic order/i);
});

test('Projects page rejects incomplete evidence and artifact placeholders', async (context) => {
  const projectsContract = {
    id: 'projects',
    relativeFile: 'projects/index.html',
    heading: 'Projects',
  };
  const firstEvidence = portfolioData.projects[0].evidenceResults[0];
  await context.test('missing evidence method', () => {
    const html = documentWith(
      completeMarkup('projects').replace(firstEvidence.method, 'Removed evidence method'),
    );
    assert.throws(() => verifyPageHtml(html, projectsContract), /incomplete evidence details/i);
  });
  await context.test('null artifact placeholder', () => {
    const metaMind = portfolioData.projects[2];
    const markup = completeMarkup('projects');
    const articleStart = markup.indexOf(`data-project-article-id="${metaMind.id}"`);
    const articleEnd = markup.indexOf('</article>', articleStart);
    const changed = `${markup.slice(0, articleEnd)}<a href="#">Repository unavailable</a>${markup.slice(articleEnd)}`;
    assert.throws(
      () => verifyPageHtml(documentWith(changed), projectsContract),
      /unapproved, missing or placeholder link/i,
    );
  });
});

test('Projects page requires only useful published filters and a hidden All baseline', async (context) => {
  const projectsContract = {
    id: 'projects',
    relativeFile: 'projects/index.html',
    heading: 'Projects',
  };
  await context.test('unavailable category', () => {
    const html = documentWith(
      completeMarkup('projects').replace(
        'data-project-filter="data-systems"',
        'data-project-filter="computer-vision"',
      ),
    );
    assert.throws(() => verifyPageHtml(html, projectsContract), /useful published-project filters/i);
  });
  await context.test('controls visible before enhancement', () => {
    const html = documentWith(completeMarkup('projects').replace(' hidden=""', ''));
    assert.throws(() => verifyPageHtml(html, projectsContract), /hidden before enhancement/i);
  });
  await context.test('All not selected', () => {
    const html = documentWith(
      completeMarkup('projects').replace(
        'aria-pressed="true" data-project-filter="all"',
        'aria-pressed="false" data-project-filter="all"',
      ),
    );
    assert.throws(() => verifyPageHtml(html, projectsContract), /All as the selected filter/i);
  });
});

test('Projects page rejects an extra unpublished article fixture', () => {
  const projectsContract = {
    id: 'projects',
    relativeFile: 'projects/index.html',
    heading: 'Projects',
  };
  const html = documentWith(
    completeMarkup('projects').replace(
      '</ol>',
      '<li><article data-project-article-id="private-project"><h3>Private project</h3></article></li></ol>',
    ),
  );
  assert.throws(() => verifyPageHtml(html, projectsContract), /deterministic order/i);
});

test('HTML and SVG path privacy exemptions require an exact curated icon payload', async (context) => {
  const paths = Object.values(iconDefinitions).flatMap((definition) => definition.paths);
  for (const [index, path] of paths.entries()) {
    await context.test(`approved path ${index + 1}`, () => {
      assert.doesNotThrow(() =>
        assertPublishSafeArtifactText(`<svg><path d="${path}"></path></svg>`, 'index.html'),
      );
      assert.doesNotThrow(() =>
        assertPublishSafeArtifactText(`<svg><path d='${path}'></path></svg>`, 'favicon.svg'),
      );
    });
  }

  const path = iconDefinitions.github.paths[0];
  const rejected = [
    ['phone-shaped path', '<svg><path d="Call +999 000 000 000"></path></svg>', /phone-like-value/],
    ['credential-shaped path', '<svg><path d="api_key=redacted-test-value"></path></svg>', /credential-like-value/],
    ['approved path plus spacing', `<svg><path d="${path} "></path></svg>`, /phone-like-value/],
    ['approved path plus character', `<svg><path d="${path} X"></path></svg>`, /phone-like-value/],
    ['visible path syntax', `<p>Visible d="${path}" text</p>`, /phone-like-value/],
    ['commented path element', `<svg><!-- <path d="${path}"></path> --></svg>`, /phone-like-value/],
    ['path syntax inside title value', `<div title='Visible d="${path}" text'></div>`, /phone-like-value/],
    ['path inside data-note', `<div data-note="${path}"></div>`, /phone-like-value/],
    ['path inside aria-label', `<div aria-label="${path}"></div>`, /phone-like-value/],
    ['path inside data-d', `<div data-d="${path}"></div>`, /phone-like-value/],
    ['d attribute on a non-path element', `<svg><g d="${path}"></g></svg>`, /phone-like-value/],
    ['path element outside SVG context', `<path d="${path}"></path>`, /phone-like-value/],
    ['path markup inside script text', `<script type="application/json">"<svg><path d='${path}'></path></svg>"</script>`, /phone-like-value/],
    ['duplicate d attribute', `<svg><path d="${path}" d="${path}"></path></svg>`, /duplicate-attribute/],
    ['unterminated d attribute', `<svg><path d="${path}></svg>`, /unterminated-attribute-value/],
  ];
  for (const [label, source, rule] of rejected) {
    await context.test(label, () =>
      assert.throws(() => assertPublishSafeArtifactText(source, 'index.html'), rule),
    );
  }
});

const BUILD_ASSET_FIXTURE = Object.freeze({
  home: 'assets/home-AAA111aa.js',
  navigationScript: 'assets/hydrateNavigation-BBB222bb.js',
  navigationStyle: 'assets/hydrateNavigation-CCC333cc.css',
  projects: 'assets/projects-DDD444dd.js',
  projectsStyle: 'assets/projects-EEE555ee.css',
});

function moduleScript(pathname) {
  return `<script type="module" src="/${pathname}"></script>`;
}

function assetLink(pathname, rel) {
  return `<link rel="${rel}" href="/${pathname}">`;
}

function requiredAssetTag(assetKey) {
  if (assetKey === 'home' || assetKey === 'projects') {
    return moduleScript(BUILD_ASSET_FIXTURE[assetKey]);
  }
  if (assetKey === 'navigationScript') {
    return assetLink(BUILD_ASSET_FIXTURE[assetKey], 'modulepreload');
  }
  return assetLink(BUILD_ASSET_FIXTURE[assetKey], 'stylesheet');
}

function trustedDistributionFixture() {
  const pageHtmlById = {
    home: [
      requiredAssetTag('home'),
      requiredAssetTag('navigationScript'),
      requiredAssetTag('navigationStyle'),
    ].join(''),
    projects: [
      requiredAssetTag('projects'),
      requiredAssetTag('navigationScript'),
      requiredAssetTag('navigationStyle'),
      requiredAssetTag('projectsStyle'),
    ].join(''),
  };
  const outputNames = [
    ...FIXED_DISTRIBUTION_PATHS,
    ...Object.values(BUILD_ASSET_FIXTURE),
  ];
  return { outputNames, pageHtmlById };
}

test('the final distribution contract accepts only the exact fixed and reachable logical assets', () => {
  const { outputNames, pageHtmlById } = trustedDistributionFixture();
  const trustedPaths = assertTrustedDistributionPaths(outputNames, pageHtmlById);
  assert.equal(trustedPaths.size, 14);
  for (const pathname of outputNames) {
    assert.doesNotThrow(() => assertAllowedArtifactFilename(pathname, trustedPaths));
  }
  assert.throws(
    () => assertAllowedArtifactFilename('unexpected.txt', trustedPaths),
    /untrusted-distribution-path/,
  );
});

test('the final distribution contract rejects every same-extension extra and legacy path', async (context) => {
  const extras = [
    'Projects/index.html',
    'public/legacy.html',
    'unexpected.txt',
    'unexpected.json',
    'extra.js',
    'assets/home-ORPHAN99.js',
    'assets/home-AAA111aa.js.map',
  ];
  for (const pathname of extras) {
    await context.test(pathname, () => {
      const { outputNames, pageHtmlById } = trustedDistributionFixture();
      outputNames.push(pathname);
      assert.throws(
        () => assertTrustedDistributionPaths(outputNames, pageHtmlById),
        /untrusted-distribution-path/,
      );
    });
  }
});

test('the final distribution contract rejects duplicate and unexpected logical assets', async (context) => {
  await context.test('duplicate Home bundle', () => {
    const { outputNames, pageHtmlById } = trustedDistributionFixture();
    const duplicate = 'assets/home-ZZZ999zz.js';
    outputNames.push(duplicate);
    pageHtmlById.home += moduleScript(duplicate);
    assert.throws(
      () => assertTrustedDistributionPaths(outputNames, pageHtmlById),
      /duplicate-logical-build-asset/,
    );
  });
  await context.test('unexpected Home stylesheet', () => {
    const { outputNames, pageHtmlById } = trustedDistributionFixture();
    const unexpected = 'assets/home-ZZZ999zz.css';
    outputNames.push(unexpected);
    pageHtmlById.home += assetLink(unexpected, 'stylesheet');
    assert.throws(
      () => assertTrustedDistributionPaths(outputNames, pageHtmlById),
      /unexpected-logical-build-asset/,
    );
  });
  await context.test('data-src does not prove reachability', () => {
    const { outputNames, pageHtmlById } = trustedDistributionFixture();
    const orphan = 'assets/home-ZZZ999zz.js';
    outputNames.push(orphan);
    pageHtmlById.home += `<script data-src="/${orphan}"></script>`;
    assert.throws(
      () => assertTrustedDistributionPaths(outputNames, pageHtmlById),
      /untrusted-distribution-path/,
    );
  });
  await context.test('missing referenced output', () => {
    const { outputNames, pageHtmlById } = trustedDistributionFixture();
    outputNames.splice(outputNames.indexOf(BUILD_ASSET_FIXTURE.home), 1);
    assert.throws(
      () => assertTrustedDistributionPaths(outputNames, pageHtmlById),
      /missing-reachable-build-asset/,
    );
  });
});

function replaceRequiredAsset(pageHtmlById, pageId, assetKey, replacement) {
  const approved = requiredAssetTag(assetKey);
  assert.equal(pageHtmlById[pageId].includes(approved), true);
  pageHtmlById[pageId] = pageHtmlById[pageId].replace(approved, replacement);
}

test('asset reachability ignores comments, text, raw script data and unrelated attributes', async (context) => {
  const homePath = BUILD_ASSET_FIXTURE.home;
  const navigationPath = BUILD_ASSET_FIXTURE.navigationScript;
  const cases = [
    ['commented script', 'home', 'home', `<!-- ${moduleScript(homePath)} -->`],
    ['commented link', 'home', 'navigationScript', `<!-- ${assetLink(navigationPath, 'modulepreload')} -->`],
    ['src inside title', 'home', 'home', `<script type="module" title='src="/${homePath}"'></script>`],
    ['href inside data-note', 'home', 'navigationScript', `<link rel="modulepreload" data-note='href="/${navigationPath}"'>`],
    ['visible filename text', 'home', 'home', `<p>/${homePath}</p>`],
    ['filename in script text', 'home', 'home', `<script type="application/json">"/${homePath}"</script>`],
    ['data-src pseudo-reference', 'home', 'home', `<script type="module" data-src="/${homePath}"></script>`],
    ['data-href pseudo-reference', 'home', 'navigationScript', `<link rel="modulepreload" data-href="/${navigationPath}">`],
  ];
  for (const [label, pageId, assetKey, replacement] of cases) {
    await context.test(label, () => {
      const { outputNames, pageHtmlById } = trustedDistributionFixture();
      replaceRequiredAsset(pageHtmlById, pageId, assetKey, replacement);
      assert.throws(
        () => assertTrustedDistributionPaths(outputNames, pageHtmlById),
        /unexpected-page-build-assets/,
      );
    });
  }
});

test('each logical build asset requires its exact live script or link role', async (context) => {
  const cases = [
    ['page JavaScript as stylesheet', 'home', 'home', assetLink(BUILD_ASSET_FIXTURE.home, 'stylesheet')],
    ['page JavaScript as modulepreload', 'home', 'home', assetLink(BUILD_ASSET_FIXTURE.home, 'modulepreload')],
    ['shared JavaScript as module script', 'home', 'navigationScript', moduleScript(BUILD_ASSET_FIXTURE.navigationScript)],
    ['CSS as module script', 'home', 'navigationStyle', moduleScript(BUILD_ASSET_FIXTURE.navigationStyle)],
    ['CSS as modulepreload', 'home', 'navigationStyle', assetLink(BUILD_ASSET_FIXTURE.navigationStyle, 'modulepreload')],
    ['wrong rel', 'home', 'navigationScript', assetLink(BUILD_ASSET_FIXTURE.navigationScript, 'preload')],
    ['missing rel', 'home', 'navigationScript', `<link href="/${BUILD_ASSET_FIXTURE.navigationScript}">`],
    ['extra rel token', 'home', 'navigationScript', `<link rel="modulepreload stylesheet" href="/${BUILD_ASSET_FIXTURE.navigationScript}">`],
    ['wrong type', 'home', 'home', `<script type="application/javascript" src="/${BUILD_ASSET_FIXTURE.home}"></script>`],
    ['missing type', 'home', 'home', `<script src="/${BUILD_ASSET_FIXTURE.home}"></script>`],
    ['link with conflicting type', 'home', 'navigationScript', `<link rel="modulepreload" type="module" href="/${BUILD_ASSET_FIXTURE.navigationScript}">`],
    ['script with conflicting rel', 'home', 'home', `<script type="module" rel="modulepreload" src="/${BUILD_ASSET_FIXTURE.home}"></script>`],
  ];
  for (const [label, pageId, assetKey, replacement] of cases) {
    await context.test(label, () => {
      const { outputNames, pageHtmlById } = trustedDistributionFixture();
      replaceRequiredAsset(pageHtmlById, pageId, assetKey, replacement);
      assert.throws(
        () => assertTrustedDistributionPaths(outputNames, pageHtmlById),
        /wrong-build-(?:asset-role|script-contract|link-contract)/,
      );
    });
  }
});

test('duplicate and malformed relevant attributes fail closed', async (context) => {
  const duplicateCases = [
    ['src', 'home', 'home', `<script type="module" src="/${BUILD_ASSET_FIXTURE.home}" src="/${BUILD_ASSET_FIXTURE.home}"></script>`],
    ['href', 'home', 'navigationScript', `<link rel="modulepreload" href="/${BUILD_ASSET_FIXTURE.navigationScript}" href="/${BUILD_ASSET_FIXTURE.navigationScript}">`],
    ['rel', 'home', 'navigationScript', `<link rel="modulepreload" rel="stylesheet" href="/${BUILD_ASSET_FIXTURE.navigationScript}">`],
    ['type', 'home', 'home', `<script type="module" type="application/javascript" src="/${BUILD_ASSET_FIXTURE.home}"></script>`],
  ];
  for (const [attribute, pageId, assetKey, replacement] of duplicateCases) {
    await context.test(`duplicate ${attribute}`, () => {
      const { outputNames, pageHtmlById } = trustedDistributionFixture();
      replaceRequiredAsset(pageHtmlById, pageId, assetKey, replacement);
      assert.throws(
        () => assertTrustedDistributionPaths(outputNames, pageHtmlById),
        new RegExp(`duplicate-attribute: (?:script|link)-${attribute}`),
      );
    });
  }

  await context.test('conflicting src and href', () => {
    const { outputNames, pageHtmlById } = trustedDistributionFixture();
    replaceRequiredAsset(
      pageHtmlById,
      'home',
      'home',
      `<script type="module" src="/${BUILD_ASSET_FIXTURE.home}" href="/${BUILD_ASSET_FIXTURE.navigationScript}"></script>`,
    );
    assert.throws(
      () => assertTrustedDistributionPaths(outputNames, pageHtmlById),
      /conflicting-build-asset-reference/,
    );
  });

  const malformedCases = [
    '<script type="module" src="/assets/home-AAA111aa.js',
    '<link rel="stylesheet" href="/assets/hydrateNavigation-CCC333cc.css',
    '<script type="module" src=/assets/home-AAA111aa.js></script>',
  ];
  for (const [index, malformed] of malformedCases.entries()) {
    await context.test(`malformed relevant tag ${index + 1}`, () => {
      const { outputNames, pageHtmlById } = trustedDistributionFixture();
      pageHtmlById.home += malformed;
      assert.throws(
        () => assertTrustedDistributionPaths(outputNames, pageHtmlById),
        /unterminated-(?:attribute-value|start-tag)|invalid-build-asset-reference/,
      );
    });
  }
});
