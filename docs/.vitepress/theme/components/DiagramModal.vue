<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  visible: boolean;
  svgContent: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const container = ref<HTMLElement | null>(null);
const content = ref<HTMLElement | null>(null);

const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);

let isPanning = false;
let startX = 0;
let startY = 0;
let startTx = 0;
let startTy = 0;
let lastPinchDistance = 0;
let lastPinchCenterX = 0;
let lastPinchCenterY = 0;
let lastTouchScale = 1;
let lastTouchTx = 0;
let lastTouchTy = 0;

function resetTransform() {
  scale.value = 1;
  translateX.value = 0;
  translateY.value = 0;
}

function getContentCenter(): { x: number; y: number } {
  const el = content.value;
  if (!el) return { x: 0, y: 0 };
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function zoomAt(clientX: number, clientY: number, _delta: number) {
  const el = container.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const x = clientX - rect.left - rect.width / 2;
  const y = clientY - rect.top - rect.height / 2;
  const factor = _delta > 0 ? 1.15 : 1 / 1.15;
  const newScale = Math.min(4, Math.max(0.25, scale.value * factor));
  const r = newScale / scale.value;
  translateX.value = translateX.value * r + x * (1 - r);
  translateY.value = translateY.value * r + y * (1 - r);
  scale.value = newScale;
}

function onWheel(e: WheelEvent) {
  if (!props.visible) return;
  e.preventDefault();
  zoomAt(e.clientX, e.clientY, e.deltaY);
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0 || (e.target as HTMLElement).closest('[data-diagram-close]')) return;
  isPanning = true;
  startX = e.clientX;
  startY = e.clientY;
  startTx = translateX.value;
  startTy = translateY.value;
  (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
}

function onPointerMove(e: PointerEvent) {
  if (!isPanning) return;
  translateX.value = startTx + e.clientX - startX;
  translateY.value = startTy + e.clientY - startY;
}

function onPointerUp(e: PointerEvent) {
  if (e.button === 0) {
    isPanning = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }
}

function getTouchDistance(touches: TouchList): number {
  if (touches.length < 2) return 0;
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
}

function getTouchCenter(touches: TouchList): { x: number; y: number } {
  if (touches.length === 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (let i = 0; i < touches.length; i++) {
    x += touches[i].clientX;
    y += touches[i].clientY;
  }
  return { x: x / touches.length, y: y / touches.length };
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    lastPinchDistance = getTouchDistance(e.touches);
    const c = getTouchCenter(e.touches);
    lastPinchCenterX = c.x;
    lastPinchCenterY = c.y;
    lastTouchScale = scale.value;
    lastTouchTx = translateX.value;
    lastTouchTy = translateY.value;
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length === 2 && lastPinchDistance > 0) {
    e.preventDefault();
    const dist = getTouchDistance(e.touches);
    const center = getTouchCenter(e.touches);
    const newScale = Math.min(4, Math.max(0.25, (lastTouchScale * dist) / lastPinchDistance));
    const dx = center.x - lastPinchCenterX;
    const dy = center.y - lastPinchCenterY;
    scale.value = newScale;
    translateX.value = lastTouchTx + dx;
    translateY.value = lastTouchTy + dy;
    lastPinchDistance = dist;
    lastPinchCenterX = center.x;
    lastPinchCenterY = center.y;
    lastTouchScale = newScale;
    lastTouchTx = translateX.value;
    lastTouchTy = translateY.value;
  }
}

function onTouchEnd(e: TouchEvent) {
  if (e.touches.length < 2) {
    lastPinchDistance = 0;
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close');
}

watch(
  () => props.visible,
  (v) => {
    if (v) resetTransform();
  }
);

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="diagram-modal">
      <div
        v-show="visible"
        class="diagram-modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Diagram zoom view"
        @click.self="emit('close')"
      >
        <div class="diagram-modal-backdrop" />
        <button
          type="button"
          class="diagram-modal-close"
          data-diagram-close
          aria-label="Close"
          @click="emit('close')"
        >
          ×
        </button>
        <div
          ref="container"
          class="diagram-modal-container"
          @wheel.prevent="onWheel"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointerleave="onPointerUp"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
          @touchcancel="onTouchEnd"
        >
          <div
            ref="content"
            class="diagram-modal-content"
            :style="{
              transform: `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${scale})`,
            }"
            v-html="svgContent"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.diagram-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  box-sizing: border-box;
}

.diagram-modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
}

.diagram-modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 2;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.diagram-modal-close:hover {
  background: rgba(255, 255, 255, 0.25);
}

.dark .diagram-modal-close {
  background: rgba(255, 255, 255, 0.1);
}

.dark .diagram-modal-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.diagram-modal-container {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 90vw;
  max-height: 85vh;
  overflow: hidden;
  border-radius: 12px;
  background: var(--vp-c-bg-soft, #f8fafc);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  cursor: grab;
  touch-action: none;
}

.diagram-modal-container:active {
  cursor: grabbing;
}

.diagram-modal-content {
  position: absolute;
  left: 50%;
  top: 50%;
  transform-origin: 0 0;
  display: inline-block;
  pointer-events: none;
}

.diagram-modal-content :deep(svg) {
  display: block;
  max-width: none;
  max-height: none;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
}

.diagram-modal-content {
  transform-origin: 0 0;
}

.diagram-modal-transition-enter-active,
.diagram-modal-transition-leave-active {
  transition: opacity 0.2s ease;
}

.diagram-modal-transition-enter-from,
.diagram-modal-transition-leave-to {
  opacity: 0;
}
</style>
