import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';
import esbuild from 'esbuild';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = __dirname;
const GENERATED_MAIN_ENTRY = path.join(ROOT, '.vite-temp', 'main-site-entry.generated.js');
const RAW_BASE = process.env.VITE_BASE_PATH || '/';
const BASE_PATH = RAW_BASE.startsWith('/') ? RAW_BASE : `/${RAW_BASE}`;
const NORMALIZED_BASE = BASE_PATH.endsWith('/') ? BASE_PATH : `${BASE_PATH}/`;
const SHOULD_COPY_CNAME = NORMALIZED_BASE === '/';
const PAGES_CNAME = (process.env.PAGES_CNAME || '').trim();
const GENERATED_MAIN_ENTRY_PUBLIC = '/.vite-temp/main-site-entry.generated.js';
const ROOT_INDEX_FILE = path.resolve(ROOT, 'index.html').replace(/\\/g, '/');

const SAFE_BUILD = process.env.SAFE_BUILD === 'true';
const DIST_DIR = path.join(ROOT, 'dist');
const SITE_ORIGIN = 'https://madhav-kataria.com';
const SITEMAP_LASTMOD = process.env.SITEMAP_LASTMOD || new Date().toISOString().slice(0, 10);
const SITEMAP_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/projects/sursight-studio-app/', changefreq: 'weekly', priority: '0.9' },
  { path: '/projects/liteedit-app/', changefreq: 'weekly', priority: '0.9' },
  { path: '/projects/sursight-studio/', changefreq: 'monthly', priority: '0.8' },
  { path: '/projects/liteedit/', changefreq: 'monthly', priority: '0.8' },
  { path: '/projects/AutomationDashboard/', changefreq: 'monthly', priority: '0.7' },
  { path: '/projects/AttendanceTracker/', changefreq: 'monthly', priority: '0.7' },
  { path: '/projects/LLM/', changefreq: 'monthly', priority: '0.7' },
  { path: '/projects/ml/', changefreq: 'monthly', priority: '0.7' }
];

const STATIC_COPY_ITEMS = [
  { src: 'assets/images', dest: 'assets/images' },
  { src: 'js', dest: 'js' },
  { src: 'style.css', dest: 'style.css' },
  { src: 'projects/project-protection.js', dest: 'projects/project-protection.js' },
  { src: 'projects/ml/app.js', dest: 'projects/ml/app.js' },
  { src: 'Madhav_Kataria_Resume.pdf', dest: 'Madhav_Kataria_Resume.pdf' },
  { src: 'robots.txt', dest: 'robots.txt' },
  { src: 'BingSiteAuth.xml', dest: 'BingSiteAuth.xml' }
];

const MAIN_SITE_SOURCE_SCRIPTS = [
  'js/config.js',
  'js/analytics.js',
  'js/like-feedback.js',
  'js/audio.js',
  'js/pathfinding.js',
  'js/data/projects.js',
  'js/components/Navbar.js',
  'js/components/About.js',
  'js/components/PathfinderGame.js',
  'js/components/Journey.js',
  'js/components/Projects.js',
  'js/components/Resume.js',
  'js/components/Contact.js',
  'js/components/PrivacyPolicy.js',
  'js/App.js'
];

const OBFUSCATE_ENTRY_NAMES = new Set(['main', 'liteeditApp']);

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeRoutePath(routePath) {
  if (routePath === '/') return '/';
  return routePath.endsWith('/') ? routePath : `${routePath}/`;
}

function buildSitemapXml(routes) {
  const urlBlocks = routes
    .map((route) => {
      const path = normalizeRoutePath(route.path);
      const loc = `${SITE_ORIGIN}${path}`;
      const lastmod = route.lastmod || SITEMAP_LASTMOD;
      return [
        '  <url>',
        `    <loc>${escapeXml(loc)}</loc>`,
        `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
        `    <changefreq>${escapeXml(route.changefreq || 'monthly')}</changefreq>`,
        `    <priority>${escapeXml(route.priority || '0.5')}</priority>`,
        '  </url>'
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlBlocks,
    '</urlset>',
    ''
  ].join('\n');
}

function buildIndexableUrlList(routes) {
  return routes
    .map((route) => `${SITE_ORIGIN}${normalizeRoutePath(route.path)}`)
    .join('\n') + '\n';
}

async function buildMainSiteLegacyEntry() {
  const bootstrapModuleCode = [
    `import React from 'react';`,
    `import { createRoot } from 'react-dom/client';`,
    `window.React = React;`,
    `window.ReactDOM = { ...(window.ReactDOM || {}), createRoot };`
  ].join('\n');
  const transformedParts = [];

  for (const rel of MAIN_SITE_SOURCE_SCRIPTS) {
    const absPath = path.join(ROOT, rel);
    const source = await fs.readFile(absPath, 'utf8');
    const transformed = await esbuild.transform(source, {
      loader: 'jsx',
      minify: false,
      target: 'es2018',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      legalComments: 'none',
      sourcefile: rel,
      charset: 'utf8'
    });
    transformedParts.push(`// ${rel}\n${transformed.code}`);
  }

  await fs.ensureDir(path.dirname(GENERATED_MAIN_ENTRY));
  await fs.writeFile(
    GENERATED_MAIN_ENTRY,
    `${bootstrapModuleCode}\n\n${transformedParts.join('\n\n')}`,
    'utf8'
  );
}

function transformMainIndexHtml(html) {
  let output = html;
  output = output.replace(
    /<script\b[^>]*src=["']https:\/\/unpkg\.com\/@babel\/standalone\/babel\.min\.js["'][^>]*><\/script>\s*/i,
    ''
  );
  output = output.replace(
    /<script\b[^>]*src=["']https:\/\/cdn\.tailwindcss\.com["'][^>]*><\/script>\s*/i,
    ''
  );
  output = output.replace(
    /<script\b[^>]*src=["']https:\/\/unpkg\.com\/react@[^"']*["'][^>]*><\/script>\s*/i,
    ''
  );
  output = output.replace(
    /<script\b[^>]*src=["']https:\/\/unpkg\.com\/react-dom@[^"']*["'][^>]*><\/script>\s*/i,
    ''
  );
  output = output.replace(
    /<script\b[^>]*src=["']https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/tone\/[^"']*["'][^>]*><\/script>\s*/i,
    ''
  );
  output = output.replace(/<script\b[^>]*type=["']text\/babel["'][^>]*src=["']js\/[^"']+["'][^>]*><\/script>\s*/gi, '');
  output = output.replace(/<script\b[^>]*src=["']js\/analytics\.js["'][^>]*><\/script>\s*/i, '');
  output = output.replace(/<link\b[^>]*href=["']\/\/unpkg\.com["'][^>]*>\s*/i, '');
  output = output.replace(/<link\b[^>]*href=["']\/\/cdnjs\.cloudflare\.com["'][^>]*>\s*/i, '');

  if (!new RegExp(`src=["']${GENERATED_MAIN_ENTRY_PUBLIC.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'i').test(output)) {
    if (/<script>\s*\/\/ Security scripts/i.test(output)) {
      output = output.replace(
        /<script>\s*\/\/ Security scripts/i,
        `<script type="module" src="${GENERATED_MAIN_ENTRY_PUBLIC}"></script>\n  <script>\n    // Security scripts`
      );
    } else {
      output = output.replace(
        /<\/body>/i,
        `  <script type="module" src="${GENERATED_MAIN_ENTRY_PUBLIC}"></script>\n</body>`
      );
    }
  }
  return output;
}

function mainSiteLegacyEntryPlugin() {
  return {
    name: 'main-site-legacy-entry',
    apply: 'build',
    async buildStart() {
      await buildMainSiteLegacyEntry();
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (!ctx.filename) return html;
        const normalized = ctx.filename.replace(/\\/g, '/');
        if (normalized !== ROOT_INDEX_FILE) return html;
        return transformMainIndexHtml(html);
      }
    }
  };
}

function selectiveObfuscationPlugin() {
  return {
    name: 'selective-obfuscation',
    apply: 'build',
    generateBundle(_options, bundle) {
      if (SAFE_BUILD) return;

      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        if (!chunk.isEntry) continue;
        if (!OBFUSCATE_ENTRY_NAMES.has(chunk.name)) continue;

        // Avoid breaking ESM entry parsing on GitHub Pages.
        // If static imports are present, skip obfuscation for that entry.
        if (/^\s*import(?:\s|["'(])/m.test(chunk.code)) continue;

        const obfuscated = JavaScriptObfuscator.obfuscate(chunk.code, {
          compact: true,
          simplify: true,
          stringArray: true,
          stringArrayThreshold: 0.55,
          rotateStringArray: true,
          splitStrings: false,
          deadCodeInjection: false,
          controlFlowFlattening: false,
          debugProtection: false,
          selfDefending: false,
          disableConsoleOutput: false,
          renameGlobals: false,
          unicodeEscapeSequence: false
        }).getObfuscatedCode();
        chunk.code = obfuscated;
      }
    },
    async closeBundle() {
      try {
        await fs.remove(GENERATED_MAIN_ENTRY);
      } catch (err) {}
    }
  };
}

function copyStaticFilesPlugin() {
  return {
    name: 'copy-static-files',
    apply: 'build',
    async closeBundle() {
      for (const item of STATIC_COPY_ITEMS) {
        const srcPath = path.join(ROOT, item.src);
        const destPath = path.join(DIST_DIR, item.dest);

        if (!(await fs.pathExists(srcPath))) continue;
        await fs.ensureDir(path.dirname(destPath));
        await fs.copy(srcPath, destPath, {
          overwrite: true,
          filter: (filePath) => path.basename(filePath) !== '.DS_Store'
        });
      }

      // Emit CNAME only for root-path builds when domain is explicitly provided.
      if (SHOULD_COPY_CNAME && PAGES_CNAME) {
        await fs.writeFile(path.join(DIST_DIR, 'CNAME'), `${PAGES_CNAME}\n`, 'utf8');
      }

      const sitemapXml = buildSitemapXml(SITEMAP_ROUTES);
      await fs.writeFile(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf8');
      const indexableUrls = buildIndexableUrlList(SITEMAP_ROUTES);
      await fs.writeFile(path.join(DIST_DIR, 'search-console-urls.txt'), indexableUrls, 'utf8');
    }
  };
}

export default defineConfig({
  base: NORMALIZED_BASE,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    cssCodeSplit: true,
    terserOptions: {
      compress: {
        drop_console: false,
        passes: 2
      },
      mangle: {
        toplevel: true
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      input: {
        main: path.resolve(ROOT, 'index.html'),
        sursightApp: path.resolve(ROOT, 'projects/sursight-studio-app/index.html'),
        liteeditApp: path.resolve(ROOT, 'projects/liteedit-app/index.html'),
        sursightDetail: path.resolve(ROOT, 'projects/sursight-studio/index.html'),
        liteeditDetail: path.resolve(ROOT, 'projects/liteedit/index.html'),
        automationDetail: path.resolve(ROOT, 'projects/AutomationDashboard/index.html'),
        attendanceDetail: path.resolve(ROOT, 'projects/AttendanceTracker/index.html'),
        llm: path.resolve(ROOT, 'projects/LLM/index.html'),
        ml: path.resolve(ROOT, 'projects/ml/index.html')
      },
      output: {
        entryFileNames: 'assets/[name].bundle.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
  plugins: [
    mainSiteLegacyEntryPlugin(),
    selectiveObfuscationPlugin(),
    copyStaticFilesPlugin()
  ]
});
