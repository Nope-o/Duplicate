import path from 'node:path';
import fs from 'fs-extra';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readIfExists(relPath) {
  const abs = path.join(DIST, relPath);
  const exists = await fs.pathExists(abs);
  assert(exists, `Missing expected file: dist/${relPath}`);
  return fs.readFile(abs, 'utf8');
}

function hasModuleBundleRef(html, key) {
  const pattern = new RegExp(`<script[^>]+type=["']module["'][^>]+src=["'][^"']*assets\\/${key}(?:\\.bundle)?(?:-[^"']+)?\\.js(?:\\?[^"']*)?["']`, 'i');
  return pattern.test(html);
}

async function run() {
  const mainHtml = await readIfExists('index.html');
  const sursightHtml = await readIfExists('projects/sursight-studio-app/index.html');
  const liteeditHtml = await readIfExists('projects/liteedit-app/index.html');
  const detailHtml = await readIfExists('projects/liteedit/index.html');
  const sitemapXml = await readIfExists('sitemap.xml');
  const indexableUrlList = await readIfExists('search-console-urls.txt');

  assert(!/@babel\/standalone\/babel\.min\.js/i.test(mainHtml), 'Main site still references Babel standalone');
  assert(!/type=["']text\/babel["']/i.test(mainHtml), 'Main site still contains text/babel scripts');
  assert(hasModuleBundleRef(mainHtml, 'main'), 'Main site bundle reference missing');
  assert(hasModuleBundleRef(sursightHtml, 'sursightApp'), 'SurSight bundle reference missing');
  assert(hasModuleBundleRef(liteeditHtml, 'liteeditApp'), 'LiteEdit bundle reference missing');
  assert(
    /assets\/project-details-entry-[^"']+\.js/i.test(detailHtml),
    'Project detail module wiring missing'
  );
  assert(/https:\/\/madhav-kataria\.com\/projects\/liteedit-app\//i.test(sitemapXml), 'Sitemap missing LiteEdit app URL');
  assert(/https:\/\/madhav-kataria\.com\/projects\/sursight-studio-app\//i.test(sitemapXml), 'Sitemap missing SurSight app URL');
  assert(/https:\/\/madhav-kataria\.com\//i.test(indexableUrlList), 'Search Console URL list missing homepage');
  assert(/https:\/\/madhav-kataria\.com\/projects\/ml\//i.test(indexableUrlList), 'Search Console URL list missing ML page');

  const assetsDir = path.join(DIST, 'assets');
  const assetFiles = await fs.readdir(assetsDir);
  const hasEntryBundle = (key) => assetFiles.some((name) => new RegExp(`^${key}(?:\\.bundle)?(?:-[^.]+)?\\.js$`, 'i').test(name));
  assert(hasEntryBundle('main'), 'Missing main entry bundle in dist/assets');
  assert(hasEntryBundle('sursightApp'), 'Missing sursightApp entry bundle in dist/assets');
  assert(hasEntryBundle('liteeditApp'), 'Missing liteeditApp entry bundle in dist/assets');

  const staticFiles = [
    'assets/images/logoo.webp',
    'assets/images/projects/sursight-studio/hero.webp',
    'projects/project-protection.js',
    'projects/ml/app.js',
    'Madhav_Kataria_Resume.pdf',
    'search-console-urls.txt'
  ];

  for (const rel of staticFiles) {
    const abs = path.join(DIST, rel);
    const exists = await fs.pathExists(abs);
    assert(exists, `Missing static file: dist/${rel}`);
  }

  console.log('Smoke test passed.');
}

run().catch((error) => {
  console.error(`Smoke test failed: ${error.message}`);
  process.exit(1);
});
