# Grant Documentation

This directory contains the VitePress documentation site for Grant.

## 🚀 Getting Started

### Prerequisites

- Node.js 22+
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## 📁 Structure

```
docs/
├── .vitepress/
│   └── config.ts          # VitePress configuration
├── getting-started/       # Introduction, quick start, configuration
├── architecture/          # System design, multi-tenancy, RBAC, security
├── core-concepts/         # Resources, API keys, invitations, tags
├── development/           # Dev guide, SDKs, CLI, REST API, testing
├── deployment/            # Overview, Docker (Compose), Kubernetes (Helm), environment
├── api-reference/         # REST API, error handling
├── advanced-topics/       # Caching, email, jobs, i18n, observability
├── index.md               # Homepage
└── package.json           # Dependencies
```

## 📝 Content Guidelines

### Writing Style

- **Clear and concise** - Use simple language and short sentences
- **Code examples** - Include practical examples for every concept
- **Progressive disclosure** - Start simple, add complexity gradually
- **Cross-references** - Link related concepts and sections

### Markdown Standards

- Use proper heading hierarchy (H1 → H2 → H3)
- Include code blocks with language specification
- Use tables for structured data
- Add diagrams for complex concepts

### Code Examples

- **TypeScript preferred** - Use TypeScript for all code examples
- **Complete examples** - Include imports and full context
- **Error handling** - Show how to handle errors
- **Best practices** - Follow project coding standards

## 🎨 Customization

### Theme Configuration

The VitePress theme is configured in `.vitepress/config.ts`:

- **Navigation** - Top-level navigation menu
- **Sidebar** - Hierarchical sidebar structure
- **Search** - Local search functionality
- **Social links** - GitHub, Twitter, etc.

### Styling

- **CSS Variables** - Use CSS custom properties for theming
- **Component Styles** - Custom components and layouts
- **Responsive Design** - Mobile-first approach

## 🔄 Content Management

### Adding New Content

1. Create new markdown files in appropriate directories
2. Update sidebar configuration in `config.ts`
3. Add cross-references to related content
4. Test locally with `pnpm dev`

### Updating Existing Content

1. Edit markdown files directly
2. Update code examples to match current API
3. Verify all links work correctly
4. Test changes locally

### Content Review Process

1. **Technical accuracy** - Verify all code examples work
2. **Clarity** - Ensure content is easy to understand
3. **Completeness** - Check all sections are covered
4. **Consistency** - Follow established patterns and style

## 🚀 Deployment

### Production Build

```bash
pnpm build
```

This creates a `dist/` directory with static files ready for deployment.

### Deployment Options

- **GitHub Pages** - Automatic deployment from main branch
- **Vercel** - One-click deployment with previews
- **Netlify** - Custom domain and CDN
- **AWS S3** - Static website hosting with CloudFront

### CI/CD Integration

The documentation site can be automatically deployed:

```yaml
# GitHub Actions example
name: Deploy Docs
on:
  push:
    branches: [main]
    paths: ['docs/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      - run: pnpm install
      - run: pnpm build
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs/dist
```

## 📊 Analytics & Monitoring

### Usage Analytics

- **Page views** - Track popular content
- **Search queries** - Understand user needs
- **User journeys** - Optimize content flow
- **Performance** - Monitor load times

### Content Metrics

- **Completeness** - Track documentation coverage
- **Accuracy** - Monitor broken links and outdated content
- **User feedback** - Collect ratings and comments
- **Support impact** - Measure reduction in support tickets

## 🤝 Contributing

### Documentation Contributions

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Test locally with `pnpm dev`**
5. **Submit a pull request**

### Content Types

- **Bug fixes** - Correct errors and typos
- **Updates** - Keep content current with code changes
- **New content** - Add missing documentation
- **Improvements** - Enhance clarity and examples

### Review Process

- **Technical review** - Verify accuracy and completeness
- **Editorial review** - Check style and clarity
- **Community feedback** - Gather user input
- **Final approval** - Merge after all checks pass

## 📚 Resources

### VitePress Documentation

- [VitePress Guide](https://vitepress.dev/guide/)
- [Configuration Reference](https://vitepress.dev/reference/config/)
- [Theme Customization](https://vitepress.dev/guide/custom-theme/)

### Markdown Resources

- [Markdown Guide](https://www.markdownguide.org/)
- [GitHub Flavored Markdown](https://github.github.com/gfm/)
- [Mermaid Diagrams](https://mermaid-js.github.io/mermaid/)

### Writing Resources

- [Technical Writing Guide](https://developers.google.com/tech-writing)
- [Documentation Best Practices](https://docs.microsoft.com/en-us/contribute/)
- [API Documentation Standards](https://swagger.io/specification/)

---

**Questions?** Join our [Discord community](https://discord.gg/grant) or open an issue on [GitHub](https://github.com/grant-js/grant).
