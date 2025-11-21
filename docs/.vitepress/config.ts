import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { withMermaid } from 'vitepress-plugin-mermaid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default withMermaid({
  title: 'Grant Platform',
  description: 'Open-source, multi-tenant RBAC/ACL platform with self-hosting capabilities',

  // Site configuration
  base: '/',
  lang: 'en-US',

  // Ignore dead links during development (docs are being built incrementally)
  ignoreDeadLinks: true,

  // Head configuration
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#2563eb' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Grant Platform' }],
    [
      'meta',
      {
        property: 'og:description',
        content: 'Open-source, multi-tenant RBAC/ACL platform with self-hosting capabilities',
      },
    ],
    ['meta', { property: 'og:image', content: '/grant-logo.svg' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'Grant Platform' }],
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
      { text: 'GitHub', link: 'https://github.com/logusgraphics/grant-platform' },
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
            { text: 'Accounts & Organizations', link: '/core-concepts/accounts-organizations' },
            { text: 'Projects & Scoping', link: '/core-concepts/projects-scoping' },
            { text: 'Users & Roles', link: '/core-concepts/users-roles' },
            { text: 'Groups & Permissions', link: '/core-concepts/groups-permissions' },
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
            { text: 'Project Structure', link: '/development/structure' },
            { text: 'GraphQL API', link: '/development/graphql' },
            { text: 'REST API', link: '/development/rest-api' },
            { text: 'Database Schema', link: '/development/database' },
            { text: 'Testing', link: '/development/testing' },
            { text: 'Security Audit', link: '/development/security-audit' },
            { text: 'Contributing', link: '/development/contributing' },
          ],
        },
        {
          text: 'Packages',
          items: [
            { text: 'Core Package', link: '/packages/core' },
            { text: 'Database Package', link: '/packages/database' },
            { text: 'Schema Package', link: '/packages/schema' },
            { text: 'Constants Package', link: '/packages/constants' },
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
            { text: 'Pricing', link: '/business-model/pricing' },
            { text: 'Migration Guide', link: '/business-model/migration' },
          ],
        },
        {
          text: 'Enterprise',
          items: [
            { text: 'SaaS Features', link: '/enterprise/saas-features' },
            { text: 'Enterprise Support', link: '/enterprise/support' },
            { text: 'Compliance', link: '/enterprise/compliance' },
            { text: 'Custom Integrations', link: '/enterprise/integrations' },
          ],
        },
        {
          text: 'API Reference',
          items: [
            { text: 'REST API', link: '/api-reference/rest-api' },
            { text: 'GraphQL Schema', link: '/api-reference/graphql-schema' },
            { text: 'Authentication', link: '/api-reference/authentication' },
            { text: 'Queries', link: '/api-reference/queries' },
            { text: 'Mutations', link: '/api-reference/mutations' },
            { text: 'Subscriptions', link: '/api-reference/subscriptions' },
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
            { text: 'Performance Optimization', link: '/advanced-topics/performance' },
            { text: 'Field Selection', link: '/advanced-topics/field-selection' },
            { text: 'Audit Logging', link: '/advanced-topics/audit-logging' },
            { text: 'Transaction Management', link: '/advanced-topics/transactions' },
            { text: 'Custom Middleware', link: '/advanced-topics/middleware' },
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
        {
          text: 'Troubleshooting',
          items: [
            { text: 'Common Issues', link: '/troubleshooting/common-issues' },
            { text: 'Performance Issues', link: '/troubleshooting/performance' },
            { text: 'Database Issues', link: '/troubleshooting/database' },
            { text: 'Deployment Issues', link: '/troubleshooting/deployment' },
            { text: 'FAQ', link: '/troubleshooting/faq' },
          ],
        },
      ],
    },

    // Social links
    socialLinks: [
      { icon: 'github', link: 'https://github.com/logusgraphics/grant-platform' },
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
      pattern: 'https://github.com/logusgraphics/grant-platform/edit/main/docs/:path',
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
    optimizeDeps: {
      exclude: ['debug'], // Exclude debug - we're using a shim instead
    },
    ssr: {
      noExternal: ['vitepress-plugin-mermaid'], // Ensure Mermaid plugin is processed by Vite
    },
    resolve: {
      alias: [
        // Replace debug/src/browser.js with our ESM shim
        {
          find: /^debug\/src\/browser\.js$/,
          replacement: resolve(__dirname, '.vitepress/debug-shim.js'),
        },
        // Also handle the full path pattern
        {
          find: /debug\/src\/browser/,
          replacement: resolve(__dirname, '.vitepress/debug-shim.js'),
        },
      ],
    },
    plugins: [
      {
        name: 'fix-debug-import',
        enforce: 'pre',
        resolveId(id) {
          // Intercept debug/src/browser.js imports and redirect to our shim
          if (id.includes('debug/src/browser.js') || id === 'debug/src/browser.js') {
            // Return absolute path to our shim
            return resolve(__dirname, '.vitepress/debug-shim.js');
          }
        },
        transform(code, id) {
          // Transform problematic default import of debug to named import
          if (
            code.includes('import createDebugger from') &&
            code.includes('debug') &&
            !code.includes('__debug_mod') &&
            !id.includes('debug-shim.js')
          ) {
            return code.replace(
              /import\s+createDebugger\s+from\s+['"](.*debug.*)['"]/g,
              (match, importPath) => {
                // Transform to named import from our shim
                return `import { createDebugger } from '/.vitepress/debug-shim.js';`;
              }
            );
          }
        },
      },
    ],
  },
});
