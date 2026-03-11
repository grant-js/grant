import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import IconsResolver from 'unplugin-icons/resolver';
import Icons from 'unplugin-icons/vite';
import Components from 'unplugin-vue-components/vite';
import { withMermaid } from 'vitepress-plugin-mermaid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default withMermaid({
  title: 'Grant',
  description: 'Open-source, multi-tenant RBAC platform with self-hosting capabilities',

  // Site configuration
  base: '/',
  lang: 'en-US',

  // Ignore only localhost and repo source-path links (not all dead links); keeps detection for broken internal doc links
  ignoreDeadLinks: [/^https?:\/\/localhost/, /^\.?\/?(apps\/|packages\/|observability\/)/],

  // Exclude internal-only directories from build
  srcExclude: ['**/implementation-plans/**'],

  // Head configuration
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#2563eb' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Grant' }],
    [
      'meta',
      {
        property: 'og:description',
        content: 'Open-source, multi-tenant RBAC platform with self-hosting capabilities',
      },
    ],
    ['meta', { property: 'og:image', content: '/grant-logo.svg' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'Grant' }],
    [
      'meta',
      {
        name: 'twitter:description',
        content: 'Open-source, multi-tenant RBAC platform with self-hosting capabilities',
      },
    ],
    ['meta', { name: 'twitter:image', content: '/grant-logo.svg' }],
  ],

  // Theme configuration
  themeConfig: {
    // Logo - using custom SVG that adapts to theme
    logo: {
      light: '/grant-logo-light.svg',
      dark: '/grant-logo-dark.svg',
    },

    // Navigation
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started/introduction' },
      { text: 'API Reference', link: '/api-reference/rest-api' },
      { text: 'Self-Hosting', link: '/deployment/self-hosting' },
      { text: 'GitHub', link: 'https://github.com/logusgraphics/grant' },
    ],

    // Sidebar
    sidebar: {
      '/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/getting-started/introduction' },
            { text: 'Quick Start', link: '/getting-started/quick-start' },
            { text: 'Configuration', link: '/getting-started/configuration' },
          ],
        },
        {
          text: 'Architecture',
          items: [
            { text: 'Overview', link: '/architecture/overview' },
            { text: 'Multi-Tenancy', link: '/architecture/multi-tenancy' },
            { text: 'RBAC System', link: '/architecture/rbac' },
            { text: 'Data Model', link: '/architecture/data-model' },
            { text: 'Security', link: '/architecture/security' },
          ],
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Resources', link: '/core-concepts/resources' },
            { text: 'Permission Conditions', link: '/core-concepts/permission-conditions' },
            { text: 'API Keys', link: '/core-concepts/api-keys' },
            {
              text: 'Organization Members & Invitations',
              link: '/core-concepts/organization-invitations',
            },
            { text: 'Tags & Relationships', link: '/core-concepts/tags-relationships' },
          ],
        },
        {
          text: 'Integration',
          items: [
            { text: 'Integration Guide', link: '/integration/guide' },
            { text: 'Server SDK', link: '/integration/server-sdk' },
            { text: 'Client SDK', link: '/integration/client-sdk' },
            { text: 'Grant CLI', link: '/integration/cli' },
          ],
        },
        {
          text: 'Contributing',
          collapsed: true,
          items: [
            { text: 'Development Guide', link: '/contributing/guide' },
            { text: 'Adding REST Endpoints', link: '/contributing/rest-api' },
            { text: 'Testing', link: '/contributing/testing' },
            { text: 'Security Audit', link: '/contributing/security-audit' },
          ],
        },
        {
          text: 'Deployment',
          items: [
            { text: 'Self-Hosting', link: '/deployment/self-hosting' },
            { text: 'Docker', link: '/deployment/docker' },
            { text: 'Environment Setup', link: '/deployment/environment' },
          ],
        },
        {
          text: 'API Reference',
          items: [
            { text: 'REST API', link: '/api-reference/rest-api' },
            { text: 'Transport Layers', link: '/api-reference/transport-layers' },
            { text: 'Error Handling', link: '/api-reference/error-handling' },
          ],
        },
        {
          text: 'Advanced Topics',
          items: [
            { text: 'Caching System', link: '/advanced-topics/caching' },
            { text: 'Email Service & Adapters', link: '/advanced-topics/email-service' },
            { text: 'File Storage', link: '/advanced-topics/file-storage' },
            { text: 'Job Scheduling', link: '/advanced-topics/job-scheduling' },
            { text: 'Privacy Settings', link: '/advanced-topics/privacy-settings' },
            { text: 'Field Selection', link: '/advanced-topics/field-selection' },
            { text: 'Audit Logging', link: '/advanced-topics/audit-logging' },
            { text: 'Transaction Management', link: '/advanced-topics/transactions' },
          ],
        },
        {
          text: 'Observability',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/advanced-topics/observability-overview' },
            { text: 'Structured Logging', link: '/advanced-topics/logging' },
            { text: 'Metrics & Monitoring', link: '/advanced-topics/metrics' },
            { text: 'Grafana dashboards', link: '/advanced-topics/grafana-dashboards' },
            { text: 'Distributed Tracing', link: '/advanced-topics/tracing' },
            { text: 'Analytics', link: '/advanced-topics/analytics' },
            { text: 'Umami dashboards', link: '/advanced-topics/umami-dashboards' },
          ],
        },
      ],
    },

    // Social links
    socialLinks: [
      { icon: 'github', link: 'https://github.com/logusgraphics/grant' },
      { icon: 'twitter', link: 'https://twitter.com/logusgraphics' },
    ],

    // Footer
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-2026 Logus Graphics',
    },

    // Search
    search: {
      provider: 'local',
    },

    // Edit link
    editLink: {
      pattern: 'https://github.com/logusgraphics/grant/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    // Last updated
    lastUpdated: {
      text: 'Last updated',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium',
      },
    },
  },

  // Markdown configuration
  markdown: {
    lineNumbers: true,
    languageAlias: {
      conf: 'ini', // Map .conf files to INI syntax highlighting
    },
    config: (md) => {
      const defaultFence =
        md.renderer.rules.fence ??
        ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        const info = token.info.trim();

        // Custom fence for beautiful-mermaid diagrams:
        // ```bmermaid
        // ```bmermaid diagram-narrow   (max-width 450px, centered)
        const bmMatch = info.match(/^(bmermaid|beautiful-mermaid)(?:\s+(.+))?$/);
        if (bmMatch) {
          const wrapperClass = bmMatch[2] ?? undefined;
          const classAttr =
            wrapperClass != null
              ? ` wrapper-class="${String(wrapperClass).replace(/"/g, '&quot;')}"`
              : '';
          return `<BeautifulMermaid :code='${JSON.stringify(token.content)}'${classAttr} />`;
        }

        return defaultFence(tokens, idx, options, env, self);
      };
    },
  },

  // Mermaid theme configuration
  mermaid: {
    theme: 'neutral',
    themeVariables: {
      // Line colors
      lineColor: 'rgb(120, 178, 219)',
      arrowheadColor: 'rgb(120, 178, 219)',

      // Node colors
      nodeBorder: 'rgba(0, 100, 255, 1)',

      // Cluster colors
      clusterBkg: 'rgba(0, 100, 255, 0.05)',
      clusterBorder: 'rgba(0, 100, 255, 0.3)',

      // Edge colors
      edgeLabelBackground: 'transparent',
    },
  },

  // Vite configuration
  vite: {
    ssr: {
      noExternal: ['vitepress-plugin-mermaid'], // Ensure Mermaid plugin is processed by Vite
    },
    plugins: [
      Components({
        include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
        dts: false,
        resolvers: [
          IconsResolver({
            prefix: 'Icon',
          }),
        ],
      }),
      Icons({
        autoInstall: true,
      }),
      {
        name: 'fix-debug-esm',
        enforce: 'pre',
        resolveId(id, importer) {
          // Intercept any import that resolves to debug/src/browser.js
          if (id.includes('debug/src/browser') || id.endsWith('debug/src/browser.js')) {
            return resolve(__dirname, 'debug-shim.js');
          }
        },
        load(id) {
          // Also catch if Vite tries to load the file directly from node_modules
          if (id.includes('node_modules') && id.includes('debug') && id.includes('browser.js')) {
            return `export { default } from '${resolve(__dirname, 'debug-shim.js')}';`;
          }
        },
      },
    ],
  },
});
