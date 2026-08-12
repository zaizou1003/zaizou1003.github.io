import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ROOT_END_SENTINEL,
  extractRootMarkup,
  verifyPageHtml,
} from '../../scripts/verify-dist.mjs';
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
