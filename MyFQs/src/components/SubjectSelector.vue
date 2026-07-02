<template>
  <div class="subject-selector">
    <label v-for="s in subjects" :key="s.code">
      <input type="radio" :value="s.code" v-model.number="value" /> {{ s.name }}
    </label>
  </div>
</template>

<script>
export default {
  name: 'SubjectSelector',
  props: { modelValue: { type: Number, default: 12 } },
  data() {
    return {
      subjects: [
        { code: 12, name: 'Mathematics' },
        { code: 14, name: 'Physics' },
        { code: 15, name: 'Chemistry' },
        { code: 18, name: 'Biology' },
        { code: 11, name: 'Chinese' },
        { code: 13, name: 'English' }
      ],
      value: this.modelValue
    }
  },
  watch: {
    value(v) { this.$emit('update:modelValue', v) },
    modelValue(v) { this.value = v }
  }
}
</script>

<style scoped>
.subject-selector { display:flex; gap:10px; flex-wrap:wrap }
label { cursor:pointer }
</style>
