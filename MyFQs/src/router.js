import { createRouter, createWebHashHistory } from 'vue-router'
import Home from './pages/Home.vue'
import ProcessQuestions from './pages/ProcessQuestions.vue'
import Questions from './pages/Questions.vue'
import QuestionViewer from './pages/QuestionViewer.vue'
import TestPaper from './pages/TestPaper.vue'
import Login from './pages/Login.vue'

const routes = [
  { path: '/', redirect: '/questions' },
  { path: '/add', name: 'add', component: Home },
  { path: '/login', name: 'login', component: Login },
  { path: '/process', name: 'process', component: ProcessQuestions },
  { path: '/questions', name: 'questions', component: Questions },
  { path: '/question/:id', name: 'edit', component: QuestionViewer },
  { path: '/testpaper', name: 'testpaper', component: TestPaper }
]



export default createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
});