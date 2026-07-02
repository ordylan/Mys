<template>
  <div class="bb-container">
    <div class="toolbar">
      <button @click="mode = 'draw'" :class="{active: mode === 'draw'}">Draw</button>
    <!--  <button @click="mode = 'select'" :class="{active: mode === 'select'}">Select</button>-->
      <button @click="undo" :disabled="undoStack.length===0">Undo</button>
    </div>

    <div class="image-wrap" ref="wrap" @mousedown.prevent="onMouseDown" @mousemove.prevent="onMouseMove" @mouseup.prevent="onMouseUp">
      <img :src="image" ref="img" @load="onLoad" draggable="false" />

      <div v-for="(b, i) in boxes" :key="i" class="box" :style="boxStyle(b)" @mousedown.stop.prevent="selectBox(i, $event)" :data-idx="i">
        <span class="idx">{{ i + 1 }}</span>
      </div>

      <div v-if="drawing && current" class="box preview" :style="boxStyle(current)" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, reactive } from 'vue';

const props = defineProps({
  image: { type: String, required: true },
  boxes: { type: Array, default: () => [] },
});
const emits = defineEmits(['update:boxes', 'confirm']);

const wrap = ref(null);
const img = ref(null);
const mode = ref('draw');
const drawing = ref(false);
const current = reactive({ x1: 0, y1: 0, x2: 0, y2: 0, displayW: 0, displayH: 0, imgW: 0, imgH: 0 });
const selected = ref(null);
const boxes = ref((props.boxes || []).map(b => ({ ...b })));
const undoStack = ref([])

watch(() => props.boxes, (v) => {
  boxes.value = (v || []).map(b => ({ ...b }));
});

function onLoad() {
  // nothing required here for now
}

function relPos(clientX, clientY) {
  const r = img.value.getBoundingClientRect();
  const x = Math.max(0, Math.min(r.width, clientX - r.left));
  const y = Math.max(0, Math.min(r.height, clientY - r.top));
  return { x, y, w: r.width, h: r.height, natW: img.value.naturalWidth, natH: img.value.naturalHeight };
}

function onMouseDown(e) {
  if (mode.value !== 'draw') return;
  const p = relPos(e.clientX, e.clientY);
  drawing.value = true;
  current.x1 = p.x;
  current.y1 = p.y;
  current.x2 = p.x;
  current.y2 = p.y;
  current.displayW = p.w;
  current.displayH = p.h;
  current.imgW = p.natW || p.w;
  current.imgH = p.natH || p.h;

  // capture outside events so releasing outside still finalizes the box
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onWindowMouseUp)
}

function onMouseMove(e) {
  if (!drawing.value) return;
  const p = relPos(e.clientX, e.clientY);
  current.x2 = p.x;
  current.y2 = p.y;
}

function onWindowMouseUp(e) {
  // call same finalizer as internal mouseup, but ensure listeners removed
  try { onMouseUp(e) } finally {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onWindowMouseUp)
  }
}

function onMouseUp(e) {
  if (!drawing.value) return;
  drawing.value = false;
  // ensure we have the last mouse position if provided
  if (e && e.clientX !== undefined) {
    const p = relPos(e.clientX, e.clientY);
    current.x2 = p.x;
    current.y2 = p.y;
  }
  const norm = normalize(current);
  if (norm.x2 - norm.x1 > 8 && norm.y2 - norm.y1 > 8) {
    boxes.value.push(norm);
    // record for undo
    undoStack.value.push({ type: 'add', item: norm })
    emits('update:boxes', boxes.value);
  }
}

function normalize(c) {
  const dx1 = Math.min(c.x1, c.x2);
  const dy1 = Math.min(c.y1, c.y2);
  const dx2 = Math.max(c.x1, c.x2);
  const dy2 = Math.max(c.y1, c.y2);
  // convert from display pixels to natural image pixels
  const dW = c.displayW || img.value.getBoundingClientRect().width;
  const dH = c.displayH || img.value.getBoundingClientRect().height;
  const nW = c.imgW || img.value.naturalWidth || dW;
  const nH = c.imgH || img.value.naturalHeight || dH;
  const scaleX = dW > 0 ? (nW / dW) : 1;
  const scaleY = dH > 0 ? (nH / dH) : 1;
  const x1 = Math.round(dx1 * scaleX);
  const y1 = Math.round(dy1 * scaleY);
  const x2 = Math.round(dx2 * scaleX);
  const y2 = Math.round(dy2 * scaleY);
  return { x1, y1, x2, y2, imgW: nW, imgH: nH };
}

function boxStyle(b) {
  if (!b) return {};
  // If this is the live preview, coordinates are in display pixels
  if (b.displayW && b.displayH) {
    const dx1 = Math.min(b.x1, b.x2);
    const dy1 = Math.min(b.y1, b.y2);
    const dx2 = Math.max(b.x1, b.x2);
    const dy2 = Math.max(b.y1, b.y2);
    const left = (dx1 / b.displayW) * 100 + '%';
    const top = (dy1 / b.displayH) * 100 + '%';
    const width = ((dx2 - dx1) / b.displayW) * 100 + '%';
    const height = ((dy2 - dy1) / b.displayH) * 100 + '%';
    return { left, top, width, height };
  }

  if (!b.imgW || !b.imgH) return {};
  const left = (b.x1 / b.imgW) * 100 + '%';
  const top = (b.y1 / b.imgH) * 100 + '%';
  const width = ((b.x2 - b.x1) / b.imgW) * 100 + '%';
  const height = ((b.y2 - b.y1) / b.imgH) * 100 + '%';
  return { left, top, width, height };
}

function selectBox(i, e) {
  if (mode.value !== 'select') return;
  selected.value = i;
}

function deleteSelected() {
  if (selected.value === null) return;
  // keep behavior but move to undo stack – however delete button is removed in UI
  const removed = boxes.value.splice(selected.value, 1)
  undoStack.value.push({ type: 'remove', item: removed[0], idx: selected.value })
  selected.value = null;
  emits('update:boxes', boxes.value);
}

function undo() {
  if (!undoStack.value.length) return;
  const last = undoStack.value.pop()
  if (last.type === 'add') {
    // remove last occurrence of that object (by shallow equality of coords)
    for (let i = boxes.value.length - 1; i >= 0; i--) {
      const b = boxes.value[i]
      if (b.x1 === last.item.x1 && b.y1 === last.item.y1 && b.x2 === last.item.x2 && b.y2 === last.item.y2) {
        boxes.value.splice(i, 1)
        emits('update:boxes', boxes.value)
        return
      }
    }
  } else if (last.type === 'remove') {
    // restore at index
    boxes.value.splice(last.idx, 0, last.item)
    emits('update:boxes', boxes.value)
  }
}
</script>

<style scoped>
.bb-container { display:flex; flex-direction:column; gap:8px }
.toolbar { display:flex; gap:8px }
.toolbar button { padding:6px 10px }
.toolbar button.active { background:#3b82f6; color:#fff }
.image-wrap { position:relative; border:1px solid #ddd; max-width:900px; overflow:hidden }
.image-wrap img { display:block; width:100%; height:auto; user-select:none }
.box { position:absolute; border:2px solid #3b82f6; box-sizing:border-box; background: rgba(59,130,246,0.08) }
.box.preview { border-style:dashed; opacity:0.9 }
.box .idx { position:absolute; top:-18px; left:0; background:#3b82f6; color:#fff; font-size:12px; padding:2px 6px }
</style>