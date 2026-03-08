import DefaultTheme from 'vitepress/theme';
import { useData, useRoute } from 'vitepress';
import codeblocksFold from 'vitepress-plugin-codeblocks-fold';
import 'vitepress-plugin-codeblocks-fold/style/index.css';
import './custom.css';

import ApiConfig from './components/ApiConfig.vue';
import ApiTryIt from './components/ApiTryIt.vue';
import BeautifulMermaid from './components/BeautifulMermaid.vue';
import FlowSelector from './components/FlowSelector.vue';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ApiConfig', ApiConfig);
    app.component('ApiTryIt', ApiTryIt);
    app.component('BeautifulMermaid', BeautifulMermaid);
    app.component('FlowSelector', FlowSelector);
  },
  setup() {
    const { frontmatter } = useData();
    const route = useRoute();
    codeblocksFold({ route, frontmatter }, false);
  },
};
