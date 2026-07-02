<template>
  <div>
    <h2>Questions</h2>
    <div class="filters">
      <label>Subject: <select v-model.number="filterSubject"><option :value="0">All</option><option v-for="s in subjects" :key="s.code" :value="s.code">{{s.name}}</option></select></label>
      <input v-model="kpsFilter" placeholder="kps filter" />
      <button @click="load">Search</button>
    </div>
    <div class="list">
      <div v-for="q in rows" :key="q.id" class="item">
        <div class="imgWrap">
          <img :src="q.img_path_masked || q.img_path" @click="$emit('open', q.id)" />
        </div>
        <div class="meta">
          <div class="metaLine">Subject: {{ subjectName(q) }} | KPs: {{ q.kps || '-' }}</div>
          <div class="actions">
            <button class="editBtn" @click="$emit('edit', q.id)">Edit</button>
          </div>
        </div>
      </div>
    </div>
    <div style="margin-top:12px; text-align:center">
      <button v-if="showLoadMoreButton && rows.length < allRows.length" @click="loadMore">Load More</button>
      <div v-else-if="rows.length >= allRows.length">No more items</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'QuestionList',
  data(){ return { allRows: [], rows: [], filterSubject:0, kpsFilter:'', subjects:[{code:12,name:'Math'},{code:11,name:'Chinese'},{code:13,name:'English'}], pageSize:10, pageIndex:0, loading:false, showLoadMoreButton:true } },
  methods:{
    subjectName(q){
      if (!q) return '-';
      if (q.subject_name) return q.subject_name;
      const s = this.subjects.find(x=>x.code === q.subject_code || x.code == q.subject_code);
      return s ? s.name : (q.subject_code || '-');
    },
    async load(){
      this.loading = true;
      const { listRecords, login } = await import('../api');
      try {
        const params = {};
        if (this.filterSubject) params.subject_code = this.filterSubject;
        if (this.kpsFilter) params.kps = this.kpsFilter;
        const res = await listRecords(params);
        if (res && res.data && res.data.success) {
          this.allRows = res.data.rows || [];
          this.pageIndex = 0;
          this.rows = this.allRows.slice(0, this.pageSize);
        }
      } catch (err) {
        // if unauthorized, prompt for credentials (very minimal)
     /*   if (err && err.response && err.response.status === 401) {
          const u = prompt('Username:','admin');
          const p = prompt('Password:','');
          if (u && p) {
            const { login } = await import('../api');
            const r = await login(u,p);
            if (r && r.success) return this.load();
            alert('Login failed');
          }
        } else {
          console.error(err);
        }*/
      } finally { this.loading = false; }
    },
    loadMore(){
      if (this.loading) return;
      const next = this.pageIndex + 1;
      const start = next * this.pageSize;
      if (start >= this.allRows.length) return;
      this.pageIndex = next;
      const more = this.allRows.slice(start, start + this.pageSize);
      this.rows = this.rows.concat(more);
    },
    onScroll(){
      const nearBottom = (window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 200);
      if (nearBottom) {
        // auto-load and hide the manual Load More button when auto-loading works
        const prevLen = this.rows.length;
        this.loadMore();
        if (this.rows.length > prevLen) this.showLoadMoreButton = false;
      }
    }
  },
  mounted(){ this.load(); window.addEventListener('scroll', this.onScroll) },
  beforeUnmount(){ window.removeEventListener('scroll', this.onScroll) }
}
</script>

<style scoped>
.list { display:flex; flex-wrap:wrap; gap:16px }
.item { width:320px; display:flex; flex-direction:column; align-items:center }
.imgWrap { width:100%; display:flex; justify-content:center }
.imgWrap img{ width:100%; max-width:560px; height:auto; cursor:pointer; border:1px solid #ddd; border-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,0.08) }
.meta { width:100%; padding:8px 6px; box-sizing:border-box; text-align:center }
.metaLine { font-size:14px; color:#333; margin-bottom:8px }
.actions { display:flex; justify-content:center }
.editBtn{ background:#1976d2; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer }
.editBtn:hover{ background:#115293 }
</style>
