<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from '@/lib/i18n'

/**
 * Canvas signature pad (mouse + touch + pen). Emits "change" with a PNG data URL,
 * or null when cleared. The pad stays white in dark mode so the ink is always visible
 * and the saved signature looks the same everywhere.
 */

 
const emit = defineEmits<{ change: [dataUrl: string | null] }>()
const { t } = useI18n()

const canvas = ref<HTMLCanvasElement | null>(null)
const empty = ref(true)
let drawing = false

// Match the canvas resolution to its displayed size (sharp on retina screens)
function resize() {
  const el = canvas.value
  if (!el) return
  const ratio = window.devicePixelRatio || 1
  el.width = el.offsetWidth * ratio
  el.height = el.offsetHeight * ratio
  const ctx = el.getContext('2d')
  if (ctx) {
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1e1b4b'
  }
  empty.value = true
  emit('change', null)
}

onMounted(() => {
  resize()
  window.addEventListener('resize', resize)
})
onBeforeUnmount(() => window.removeEventListener('resize', resize))

const point = (e: PointerEvent) => {
  const rect = canvas.value!.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function start(e: PointerEvent) {
  canvas.value!.setPointerCapture?.(e.pointerId)
  drawing = true
  const ctx = canvas.value!.getContext('2d')
  const { x, y } = point(e)
  ctx?.beginPath()
  ctx?.moveTo(x, y)
}

function move(e: PointerEvent) {
  if (!drawing) return
  const ctx = canvas.value!.getContext('2d')
  const { x, y } = point(e)
  ctx?.lineTo(x, y)
  ctx?.stroke()
  empty.value = false
}

function end() {
  if (!drawing) return
  drawing = false
  if (!empty.value) emit('change', canvas.value!.toDataURL('image/png'))
}

function clear() {
  const el = canvas.value!
  el.getContext('2d')?.clearRect(0, 0, el.width, el.height)
  empty.value = true
  emit('change', null)
}
</script>

<template>
  <div>
    <div class="relative">
      <canvas
        ref="canvas"
        :aria-label="t('sign.drawPlaceholder')"
        class="h-44 w-full cursor-crosshair touch-none rounded-xl border-2 border-dashed border-slate-300 bg-white sm:h-52 dark:border-slate-600"
        @pointerdown="start"
        @pointermove="move"
        @pointerup="end"
        @pointerleave="end"
      />
      <span
        v-if="empty"
        class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400"
      >
        {{ t('sign.drawPlaceholder') }}
      </span>
    </div>
    <button
      type="button"
      class="mt-2 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      @click="clear"
    >
      {{ t('sign.clear') }}
    </button>
  </div>
</template>
