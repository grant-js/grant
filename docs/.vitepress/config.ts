import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

export default withMermaid({
  title: 'Grant Platform',
  description: 'Open-source, multi-tenant RBAC/ACL platform with self-hosting capabilities',

  // Site configuration
  base: '/',
  lang: 'en-US',

  // Vite configuration to fix dependency issues
  vite: {
    optimizeDeps: { include: ['@braintree/sanitize-url'] },
    resolve: {
      alias: {
        dayjs: 'dayjs/',
      },
    },
  },

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
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: 'Self-Hosting', link: '/self-hosting/' },
      { text: 'SaaS', link: '/saas/' },
      { text: 'GitHub', link: 'https://github.com/logusgraphics/grant-platform' },
    ],

    // Sidebar
    sidebar: {
      '/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/introduction' },
            { text: 'Quick Start', link: '/quick-start' },
            { text: 'Installation', link: '/installation' },
            { text: 'Configuration', link: '/configuration' },
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
          ],
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Accounts & Organizations', link: '/concepts/accounts-organizations' },
            { text: 'Projects & Scoping', link: '/concepts/projects-scoping' },
            { text: 'Users & Roles', link: '/concepts/users-roles' },
            { text: 'Groups & Permissions', link: '/concepts/groups-permissions' },
            { text: 'Tags & Relationships', link: '/concepts/tags-relationships' },
          ],
        },
        {
          text: 'Development',
          items: [
            { text: 'Development Guide', link: '/development/guide' },
            { text: 'Project Structure', link: '/development/structure' },
            { text: 'GraphQL API', link: '/development/graphql' },
            { text: 'Database Schema', link: '/development/database' },
            { text: 'Testing', link: '/development/testing' },
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
            { text: 'Open Source vs SaaS', link: '/business/open-source-vs-saas' },
            { text: 'Feature Comparison', link: '/business/feature-comparison' },
            { text: 'Pricing', link: '/business/pricing' },
            { text: 'Migration Guide', link: '/business/migration' },
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
            { text: 'GraphQL Schema', link: '/api/graphql-schema' },
            { text: 'Authentication', link: '/api/authentication' },
            { text: 'Queries', link: '/api/queries' },
            { text: 'Mutations', link: '/api/mutations' },
            { text: 'Subscriptions', link: '/api/subscriptions' },
            { text: 'Error Handling', link: '/api/error-handling' },
          ],
        },
        {
          text: 'Advanced Topics',
          items: [
            { text: 'Performance Optimization', link: '/advanced/performance' },
            { text: 'Field Selection', link: '/advanced/field-selection' },
            { text: 'Audit Logging', link: '/advanced/audit-logging' },
            { text: 'Transaction Management', link: '/advanced/transactions' },
            { text: 'Custom Middleware', link: '/advanced/middleware' },
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
    config: (md) => {
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
});
