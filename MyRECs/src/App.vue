<template>
  <div class="app">
    <header style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <h1 style="margin:0">MyRECs</h1>
      <nav style="margin-left:auto;display:flex;gap:8px">
        <router-link to="/Home">Home</router-link>
        <router-link to="/Entries">Entries</router-link>
        <router-link to="/Single">Random</router-link>
        <button @click="openCloudEvent" >Cloud</button>
      </nav>
    </header>

    <router-view />
  </div>
</template>

<script>
export default {
  setup() {
    function openCloudEvent() { window.dispatchEvent(new CustomEvent('open-cloud')) }
    return { openCloudEvent }
  }
}
</script>

<style scoped>
.content img{max-width:320px;display:block;margin-top:6px}
</style>
