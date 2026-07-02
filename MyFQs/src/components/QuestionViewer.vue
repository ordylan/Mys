
<template>
  <div v-if="data">
    <h2>Question Viewer / Edit</h2>
    <div class="viewer">
      <div class="imgcol">
        <img :src="showAnswer ? (data.img_path || data.question_original) : (data.img_path_masked || data.img_path)" class="qimg" />
        <div style="margin-top:8px">
          <button @click="showAnswer = !showAnswer">{{ showAnswer ? 'Hide Answer' : 'Show Answer' }}</button>
        </div>
      </div>
      <div class="formcol">
        <QuestionAttributeForm v-model:modelValue="attrs" />
        <div style="margin-top:12px">
          <button @click="save" :disabled="saving">Save</button>
          <button @click="goBack">Back to list</button>
        </div>
      </div>
    </div>
  </div>
  <div v-else>Loading...</div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getCrops, updateRecord } from '../api';
import { useRoute, useRouter } from 'vue-router';
import QuestionAttributeForm from './QuestionAttributeForm.vue';

const route = useRoute();
const router = useRouter();
const data = ref(null);
const attrs = ref({ subject_code: 12, kps: '' });
const showAnswer = ref(false);
const saving = ref(false);

onMounted(async () => {
  const res = await getCrops(route.params.id);
  // API returns full record; use fields if present
  data.value = res.data || res;
  if (data.value) {
    attrs.value.subject_code = data.value.subject_code ?? attrs.value.subject_code
    attrs.value.kps = data.value.kps ?? ''
  }
});

async function save() {
  if (!data.value) return;
  saving.value = true;
  try {
    const payload = { id: data.value.id, subject_code: attrs.value.subject_code, kps: attrs.value.kps };
    const res = await updateRecord(payload);
    if (res && res.data && res.data.success) {
      alert('Saved')
    } else {
      alert('Save failed')
    }
  } catch (e) { alert('Save error: ' + e.message) }
  finally { saving.value = false }
}

function goBack() { router.push({ name: 'questions' }) }
</script>

<style scoped>
.viewer{ display:flex; gap:16px }
.imgcol{ flex:0 0 480px }
.formcol{ flex:1 }
.qimg{ max-width:460px; max-height:520px; border:1px solid #111; object-fit:contain }
</style>