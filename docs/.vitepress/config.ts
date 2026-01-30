import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { withMermaid } from 'vitepress-plugin-mermaid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default withMermaid({
  title: 'Grant',
  description: 'Open-source, multi-tenant RBAC/ACL platform with self-hosting capabilities',

  // Site configuration
  base: '/',
  lang: 'en-US',

  // Ignore dead links during development (docs are being built incrementally)
  ignoreDeadLinks: true,

  // Exclude implementation plans from build (internal documentation only)
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
        content: 'Open-source, multi-tenant RBAC/ACL platform with self-hosting capabilities',
      },
    ],
    ['meta', { property: 'og:image', content: '/grant-logo.svg' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'Grant' }],
    [
      'meta',
      {
        name: 'twitter:description',
        content: 'Open-source, multi-tenant RBAC/ACL platform with self-hosting capabilities',
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
      { text: 'Self-Hosting', link: '/self-hosting/README' },
      { text: 'SaaS', link: '/saas/README' },
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
            { text: 'Installation', link: '/getting-started/installation' },
            { text: 'Configuration', link: '/getting-started/configuration' },
          ],
        },
        {
          text: 'Architecture',
          items: [
            { text: 'Overview', link: '/architecture/overview' },
            { text: 'Multi-Tenancy', link: '/architecture/multi-tenancy' },
            { text: 'RBAC/ACL System', link: '/architecture/rbac-acl' },
            { text: 'Data Model', link: '/architecture/data-model' },
            { text: 'Security', link: '/architecture/security' },
            { text: 'File Storage', link: '/architecture/file-storage' },
          ],
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Resources', link: '/core-concepts/resources' },
            { text: 'API Keys', link: '/core-concepts/api-keys' },
            {
              text: 'Organization Members & Invitations',
              link: '/core-concepts/organization-invitations',
            },
            { text: 'Tags & Relationships', link: '/core-concepts/tags-relationships' },
          ],
        },
        {
          text: 'Development',
          items: [
            { text: 'Development Guide', link: '/development/guide' },
            { text: 'Server SDK', link: '/development/server-sdk' },
            { text: 'Client SDK', link: '/development/client-sdk' },
            { text: 'Grant CLI', link: '/development/cli' },
            { text: 'REST API', link: '/development/rest-api' },
            { text: 'Testing', link: '/development/testing' },
            { text: 'Security Audit', link: '/development/security-audit' },
          ],
        },
        {
          text: 'Deployment',
          items: [
            { text: 'Self-Hosting', link: '/deployment/self-hosting' },
            { text: 'AWS CloudFormation', link: '/deployment/cloudformation' },
            { text: 'Docker', link: '/deployment/docker' },
            { text: 'Environment Setup', link: '/deployment/environment' },
          ],
        },
        {
          text: 'Business Model',
          items: [
            { text: 'Open Source vs SaaS', link: '/business-model/open-source-vs-saas' },
            { text: 'Feature Comparison', link: '/business-model/feature-comparison' },
            { text: 'License Strategy', link: '/business-model/license-strategy' },
            { text: 'Recommendations', link: '/business-model/recommendations' },
          ],
        },
        {
          text: 'SaaS & Enterprise',
          items: [
            { text: 'SaaS Features', link: '/saas/README' },
            { text: 'Migration Guide', link: '/migration/README' },
          ],
        },
        {
          text: 'API Reference',
          items: [
            { text: 'REST API', link: '/api-reference/rest-api' },
            { text: 'Error Handling', link: '/api-reference/error-handling' },
          ],
        },
        {
          text: 'Advanced Topics',
          items: [
            { text: 'Internationalization (i18n)', link: '/advanced-topics/internationalization' },
            { text: 'Caching System', link: '/advanced-topics/caching' },
            { text: 'Cache Setup Guide', link: '/advanced-topics/caching-setup' },
            { text: 'Email Service & Adapters', link: '/advanced-topics/email-service' },
            { text: 'Job Scheduling & Background Tasks', link: '/advanced-topics/job-scheduling' },
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
            { text: 'Distributed Tracing', link: '/advanced-topics/tracing' },
            { text: 'Metrics & Monitoring', link: '/advanced-topics/metrics' },
            { text: 'Business Analytics', link: '/advanced-topics/analytics' },
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
      copyright: 'Copyright © 2024 Logus Graphics',
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
    config: (_md) => {
      // Add custom markdown plugins here
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
