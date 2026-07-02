<template>
  <nav style="padding:12px; border-bottom:1px solid #eee">

    <router-link to="/questions">MyFQs</router-link> |
    <router-link to="/add">Add</router-link> |
  <!-- <router-link to="/testpaper">Papering</router-link>|--> 
     <router-link to="/login">Login</router-link> 
 </nav>
  <main style="padding:16px"><router-view /></main>
</template>

<script setup>
</script>

<style>
nav a { margin-right:8px }
</style>
