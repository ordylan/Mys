<template>
  <div class="login-page">
    <h2>Welcome back! </h2>
    <form @submit.prevent="onSubmit">
      <div><label>Your account: <input v-model="username" /></label></div>
      <div><label>Authorization: <input v-model="password" type="password" /></label></div>
      <div style="margin-top:8px"><button type="submit">Login</button></div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../api'

const router = useRouter()
const username = ref('admin')
const password = ref('')

async function onSubmit() {
  try {
    const res = await login(username.value, password.value)
    if (res && res.success) {
      alert('Login successful')
      router.push({ name: 'home' })
    } else {
      alert('Login failed')
    }
  } catch (e) {
    // api interceptor will show message
  }
}
</script>

<style scoped>
.login-page { max-width:360px }
label { display:block; margin:6px 0 }
</style>
