<template>
  <div>
    <h3>Generate Test Paper</h3>
    <div>
      <label>Subject: <select v-model.number="subject"><option :value="0">All</option><option v-for="s in subjects" :key="s.code" :value="s.code">{{s.name}}</option></select></label>
      <input v-model="kps" placeholder="kps filter" />
      <button @click="search">Search</button>
      <button @click="generate" :disabled="selected.length===0">Generate</button>
    </div>
    <div class="results">
      <label v-for="q in rows" :key="q.id" class="card">
        <input type="checkbox" :value="q.id" v-model="selected" /> 
        <img :data-src="q.img_path_masked||q.img_path" @lazyload-complete="onImageLoad" @lazyload-error="onImageError" />
        <div>{{q.kps}}</div>
      </label>
    </div>
    <div v-if="paper.length" class="paper">
      <h4>Test Paper Preview</h4>
      <div v-for="(p,i) in paper" :key="p.id" class="paper-item">
        <div class="qnum">Q{{ i+1 }}</div>
        <img :data-src="p.masked" @lazyload-complete="onImageLoad" @lazyload-error="onImageError" />
      </div>
      <h4 style="margin-top:18px">Answers</h4>
      <div class="answers">
        <div v-for="(p,i) in paper" :key="p.id" class="answer-item">
          <div class="qnum">Q{{ i+1 }}</div>
          <img :data-src="p.original" @lazyload-complete="onImageLoad" @lazyload-error="onImageError" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { triggerLazyLoad } from '../utils/lazyLoad'

export default {
  name: 'TestPaperGenerator',
  data(){ return { subject:0, kps:'', rows:[], selected:[], paper:[], subjects:[{code:12,name:'Math'},{code:11,name:'Chinese'},{code:13,name:'English'}] } },
  methods:{
    async search(){
      const { listRecords } = await import('../api');
      const params = {};
      if (this.subject) params.subject_code = this.subject;
      if (this.kps) params.kps = this.kps;
      const res = await listRecords(params);
      if (res && res.data && res.data.success) this.rows = res.data.rows || [];
      this.$nextTick(() => {
        triggerLazyLoad();
      });
    },
    async generate(){
      const { generatePaper } = await import('../api');
      const res = await generatePaper(this.selected);
      if (res && res.data && res.data.success) {
        // res.data.items should be array of { id, masked, original }
        this.paper = (res.data.items || []).map(it => ({ id: it.id, masked: it.masked || it, original: it.original || it }))

        this.$nextTick(() => {
          triggerLazyLoad();
        });
      }
    },
    onImageLoad(event) {
      console.log('Test paper image loaded:', event.detail.src);
    },
    onImageError(event) {
      console.warn('Test paper image load failed:', event.detail.src);
    }
  },
  mounted() {
    this.$nextTick(() => {
      triggerLazyLoad();
    });
  }
}
</script>

<style scoped>
.results { display:flex; flex-wrap:wrap; gap:12px }
.card img{ width:160px }
.paper { margin-top:12px }
.paper-item{ border:1px solid #ddd; padding:8px; margin-bottom:8px; display:flex; align-items:center; gap:12px }
.paper-item img{ width:420px; max-width:65% }
.qnum{ min-width:44px; background:#f0f0f0; padding:6px 8px; border-radius:4px; text-align:center; font-weight:600 }
.answers{ margin-top:8px; display:flex; flex-direction:column; gap:8px }
.answer-item{ display:flex; align-items:center; gap:12px }
.answer-item img{ width:420px; max-width:75% }
</style>