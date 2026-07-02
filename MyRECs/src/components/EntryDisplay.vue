<template>
  <span>
    <template v-for="(seg, i) in segments" :key="i">
      <span v-if="seg.type === 'text'" v-html="seg.html"></span>
      <span v-else class="cloze" :class="{ revealed: seg.revealed }" @click="toggle(i)">
        <span class="cloze-hidden" :style="{ width: (seg.widthPx ? seg.widthPx + 'px' : (seg.width + 'ch')) }"></span>
        <span class="cloze-answer" v-html="seg.html"></span>
      </span>
    </template>
  </span>
</template>

<script>
import { ref, watch } from 'vue'
import katex from 'katex'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({ html: true, linkify: true })

export default {
  name: 'EntryDisplay',
  props: { text: { type: String, default: '' } },
  setup(props) {
    const segments = ref([])

    function stripTagsLength(s) {
      return s.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '').length
    }

    function renderInline(s) {
      if (!s) return ''
      // convert literal \n and real newlines to <br/>
      s = s.replace(/\\n/g, '\n')
      s = s.replace(/\r?\n/g, '<br/>')
      // emphasize markup **bold** -> wavy underline
      s = s.replace(/\*\*(.+?)\*\*/g, '<span class="emphasize">$1</span>')
      // render inline katex $...$
      s = s.replace(/\$(.+?)\$/g, (m, expr) => {
        try { return katex.renderToString(expr, { throwOnError: false, displayMode: false }) }
        catch (e) { return m }
      })
      return md.renderInline(s)
    }

    function parse(t) {
      segments.value = []
      if (!t) return
      let src = t
      // accept either literal >[ ... ]< or escaped &gt;[ ... ]&lt; markers
      // allow any characters (including "]") inside the cloze by
      // matching up to the closing "]<" (or "]&lt;") sequence
      const re = /(?:>|&gt;)\[([\s\S]*?)\](?:<|&lt;)/g
      let last = 0
      let m
      while ((m = re.exec(src)) !== null) {
        if (m.index > last) {
          const before = src.slice(last, m.index)
          segments.value.push({ type: 'text', html: renderInline(before) })
        }
        const ansRaw = m[1]
        const html = renderInline(ansRaw)
        // measure rendered width in px so Chinese characters are accounted for
        const rawLen = stripTagsLength(html)
        let widthPx = null
        try {
          const span = document.createElement('span')
          span.style.position = 'absolute'
          span.style.visibility = 'hidden'
          span.style.whiteSpace = 'nowrap'
          span.style.font = getComputedStyle(document.body).font
          span.innerHTML = html
          document.body.appendChild(span)
          const measured = span.offsetWidth
          document.body.removeChild(span)
          const extraPx = 18
          widthPx = Math.max(48, measured + extraPx)
        } catch (e) {
          // fallback to char-based width
          const extra = 3
          const width = Math.max(6, rawLen + extra)
          segments.value.push({ type: 'cloze', html, width, revealed: false })
          last = re.lastIndex
          continue
        }
        segments.value.push({ type: 'cloze', html, widthPx, revealed: false })
        last = re.lastIndex
      }
      if (last < src.length) {
        segments.value.push({ type: 'text', html: renderInline(src.slice(last)) })
      }
    }

    watch(() => props.text, (v) => parse(v), { immediate: true })

    function toggle(i) {
      const seg = segments.value[i]
      if (!seg || seg.type !== 'cloze') return
      seg.revealed = !seg.revealed
    }

    return { segments, toggle }
  }
}
</script>

<style scoped>
.cloze{cursor:pointer;display:inline-block;position:relative;vertical-align:baseline;line-height:1em}
.cloze .cloze-hidden{display:inline-block;border-bottom:2px solid #000;height:1em;vertical-align:middle;min-width:2ch}
.cloze .cloze-answer{display:none;position:absolute;left:0;top:0;z-index:2;background:transparent;white-space:nowrap}
.cloze.revealed .cloze-answer{display:inline-block}
.cloze.revealed .cloze-hidden{opacity:1}
.cloze .cloze-answer img{max-width:360px;max-height:240px;width:auto;height:auto}
</style>
