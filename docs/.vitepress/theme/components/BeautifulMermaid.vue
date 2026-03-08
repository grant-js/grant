<script setup lang="ts">
import { computed, ref } from 'vue';
import { useData } from 'vitepress';
import { THEMES, renderMermaidSVG } from 'beautiful-mermaid';
import DiagramModal from './DiagramModal.vue';

const props = defineProps<{
  code: string;
  /** Optional wrapper class for per-diagram styling (e.g. diagram-narrow) */
  wrapperClass?: string;
}>();

const { isDark } = useData();
const showModal = ref(false);

const result = computed(() => {
  try {
    // Chosen to align closely with VitePress light/dark surfaces and contrast
    const theme = isDark.value ? THEMES['zinc-dark'] : THEMES['github-light'];
    return {
      svg: renderMermaidSVG(props.code, {
        ...theme,
        transparent: true,
      }),
      error: '',
    };
  } catch (error) {
    return {
      svg: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
});
</script>

<template>
  <div class="beautiful-mermaid" :class="props.wrapperClass">
    <div v-if="result.error" class="beautiful-mermaid-error">
      Failed to render diagram: {{ result.error }}
    </div>
    <button
      v-else
      type="button"
      class="beautiful-mermaid-trigger"
      aria-label="Expand diagram"
      @click="showModal = true"
    >
      <span class="beautiful-mermaid-svg" v-html="result.svg" />
    </button>
    <DiagramModal
      :visible="showModal"
      :svg-content="result.svg"
      @close="showModal = false"
    />
  </div>
</template>

<style scoped>
.beautiful-mermaid {
  margin: 1rem 0;
}

.beautiful-mermaid-trigger {
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  margin: 0;
  font: inherit;
  text-align: inherit;
}

.beautiful-mermaid-svg {
  display: block;
  max-width: min(100%, var(--bm-diagram-max-width-sm, 100%));
  margin-inline: auto;
  border-radius: 8px;
  transition: box-shadow 0.2s, filter 0.2s;
}

.beautiful-mermaid-trigger:hover .beautiful-mermaid-svg {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  filter: brightness(0.98);
}

.dark .beautiful-mermaid-trigger:hover .beautiful-mermaid-svg {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

@media (min-width: 768px) {
  .beautiful-mermaid-svg {
    max-width: min(100%, var(--bm-diagram-max-width-md, 688px));
  }
}

@media (min-width: 1024px) {
  .beautiful-mermaid-svg {
    max-width: min(100%, var(--bm-diagram-max-width-lg, 688px));
  }
}

.beautiful-mermaid-svg :deep(svg) {
  width: 100%;
  height: auto;
}

.beautiful-mermaid-error {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.08);
  color: #b91c1c;
  font-size: 0.9rem;
}

.dark .beautiful-mermaid-error {
  color: #fca5a5;
  border-color: rgba(248, 113, 113, 0.4);
  background: rgba(248, 113, 113, 0.12);
}
</style>
