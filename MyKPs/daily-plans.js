(function(){
  const DB_NAME = 'MyKPs';
  const DB_VERSION = 3; // 与主页面一致
  const KPS_STORE = 'KPs';
  const LOGS_STORE = 'MyLearningLogs';
  const DAILY_STORE = 'DailyPlans';
  const ANNOUNCEMENTS_STORE = 'Announcements';
  const FLAWLESS_STORE = 'Flawless';
  const CONFIG_STORE = 'AppConfig'; // 主页面配置

  const ID_EPOCH = new Date('2016-06-01T00:00:00Z').getTime();
 // let lastId = 0; // 用于防重

function generateId(externalDate) {
  let now;
  if (externalDate !== undefined) {
    now = externalDate instanceof Date ? externalDate.getTime() : externalDate;
  } else {
    now = Date.now();
  }
  let id = Math.floor((now - ID_EPOCH) / 100);
//  if (id <= lastId) {
  //  id = lastId + 1;
  //}
 // lastId = id;
  return id;
}

  let db;
  let appConfig = null; // 缓存学科配置

  // Elements
  const planDate = document.getElementById('planDate');
  const weekdayDisplay = document.getElementById('weekdayDisplay');
  const kpsSelect = document.getElementById('kpsSelect');
  const textContent = document.getElementById('textContent');
  const addBtn = document.getElementById('addBtn');
  const tasksList = document.getElementById('tasksList');
  const toggleAddBtn = document.getElementById('toggleAddBtn');
  const addControls = document.getElementById('addControls');
  const announcementContent = document.getElementById('announcementContent');
  const editAnnouncementBtn = document.getElementById('editAnnouncementBtn');
  const tagRadios = Array.from(document.getElementsByClassName('tagRad'));
  const refreshBtn = document.getElementById('refreshBtn');
  const prevDayBtn = document.getElementById('prevDayBtn');
  const nextDayBtn = document.getElementById('nextDayBtn');
  const categoryRadiosContainer = document.getElementById('categoryRadios');

  let flawlessContent = document.getElementById('flawlessContent');
  let editFlawlessBtn = document.getElementById('editFlawlessBtn');

  // ==================== 初始化日期 ====================
  function setDefaultDate() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    planDate.value = `${y}-${m}-${day}`;
  }

  const toggleEditTasksBtn = document.getElementById('toggleEditTasksBtn');
  const editTaskHeader = document.getElementById('editTaskHeader');
  const cancelEditBtn = document.getElementById('cancelEditBtn');

 
  // last rendered date for direction calculation
  let lastRenderedDate = null;
  // animation preference: 'auto' (respect device), 'force' (always animate), 'off' (never animate)
  let animationPreference = 'auto';
  // transition lock and pending queue to avoid double-trigger flicker
  let isTransitioning = false;
  let pendingDate = null;
  // animation duration in ms (keep in sync with injected CSS)
  const ANIM_DUR = 600;

  function loadAnimationPreference(){
    try{ const v = localStorage.getItem('kp_anim_pref'); if(v) animationPreference = v; }catch(e){}
  }
  function saveAnimationPreference(){ try{ localStorage.setItem('kp_anim_pref', animationPreference); }catch(e){} }

  // decide whether to run animations based on preference and device setting
  function shouldAnimate(){return false;
    if(animationPreference === 'force') return true;
    if(animationPreference === 'off') return false;
    // auto: respect device prefers-reduced-motion
    try{ return !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }catch(e){ return true; }
  }

  // ==================== 打开数据库 ====================
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      // 创建所有必需的存储（兼容升级场景）
      if (!db.objectStoreNames.contains(KPS_STORE)) {
        const store = db.createObjectStore(KPS_STORE, { keyPath: 'uniqueId' });
        store.createIndex('subject', 'subject', { unique: false });
      }
      if (!db.objectStoreNames.contains(LOGS_STORE)) {
        const store = db.createObjectStore(LOGS_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('KPsId', 'KPsId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(CONFIG_STORE)) {
        db.createObjectStore(CONFIG_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DAILY_STORE)) {
        const store = db.createObjectStore(DAILY_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains(ANNOUNCEMENTS_STORE)) {
        const store = db.createObjectStore(ANNOUNCEMENTS_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('pinnedAt', 'pinnedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(FLAWLESS_STORE)) {
        const store = db.createObjectStore(FLAWLESS_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date', { unique: true });
      }
    };
    req.onsuccess = (e) => {
      db = e.target.result;
      // 检查所有必需存储是否存在，若缺失则自动升级
      const requiredStores = [
        KPS_STORE, LOGS_STORE, CONFIG_STORE,
        DAILY_STORE, ANNOUNCEMENTS_STORE, FLAWLESS_STORE
      ];
      const missing = requiredStores.filter(name => !db.objectStoreNames.contains(name));
      if (missing.length === 0) {
        resolve(db);
      } else {
        // 需要补建缺失的存储
        const currentVersion = db.version;
        db.close();
        const upgradeReq = indexedDB.open(DB_NAME, currentVersion + 1);
        upgradeReq.onupgradeneeded = (ev) => {
          const upDB = ev.target.result;
          if (!upDB.objectStoreNames.contains(DAILY_STORE)) {
            const store = upDB.createObjectStore(DAILY_STORE, { keyPath: 'id', autoIncrement: true });
            store.createIndex('date', 'date', { unique: false });
          }
          if (!upDB.objectStoreNames.contains(ANNOUNCEMENTS_STORE)) {
            const store = upDB.createObjectStore(ANNOUNCEMENTS_STORE, { keyPath: 'id', autoIncrement: true });
            store.createIndex('pinnedAt', 'pinnedAt', { unique: false });
          }
          if (!upDB.objectStoreNames.contains(FLAWLESS_STORE)) {
            const store = upDB.createObjectStore(FLAWLESS_STORE, { keyPath: 'id', autoIncrement: true });
            store.createIndex('date', 'date', { unique: true });
          }
          if (!upDB.objectStoreNames.contains(KPS_STORE)) {
            const store = upDB.createObjectStore(KPS_STORE, { keyPath: 'uniqueId' });
            store.createIndex('subject', 'subject', { unique: false });
          }
          if (!upDB.objectStoreNames.contains(LOGS_STORE)) {
            const store = upDB.createObjectStore(LOGS_STORE, { keyPath: 'id', autoIncrement: true });
            store.createIndex('KPsId', 'KPsId', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
          if (!upDB.objectStoreNames.contains(CONFIG_STORE)) {
            upDB.createObjectStore(CONFIG_STORE, { keyPath: 'id' });
          }
        };
        upgradeReq.onsuccess = (ev) => {
          db = ev.target.result;
          resolve(db);
        };
        upgradeReq.onerror = (ev) => reject(ev.target.error);
      }
    };
    req.onerror = (e) => reject(e.target.error);
  });
}
  // ==================== 读取 AppConfig ====================
  async function loadAppConfig() {
    if (!db.objectStoreNames.contains(CONFIG_STORE)) return null;
    const tx = db.transaction([CONFIG_STORE], 'readonly');
    const store = tx.objectStore(CONFIG_STORE);
    const config = await new Promise((res, rej) => {
      const req = store.get('main');
      req.onsuccess = () => res(req.result);
      req.onerror = rej;
    });
    appConfig = config;
    return config;
  }

  // ==================== 动态生成学科选择 radio ====================
  function renderCategoryRadios() {
    if (!categoryRadiosContainer || !appConfig) return;
    categoryRadiosContainer.innerHTML = '';
    if (!appConfig.subjects || appConfig.subjects.length === 0) {
      categoryRadiosContainer.textContent = '(no subjects configured)';
      return;
    }
    appConfig.subjects.forEach((subj, idx) => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'categoryRad';
      radio.value = subj.key;
      if (idx === 0) radio.checked = true;
      label.appendChild(radio);
      label.appendChild(document.createTextNode(' ' + subj.displayName));
      categoryRadiosContainer.appendChild(label);
    });
  }

  // ==================== KPs 缓存与选择器 ====================
  const kpsCache = {};
  let allTopics = []; // 全部知识点原始数据

  async function loadKPs() {
    kpsSelect.innerHTML = '<option value="">Loading...</option>';
    try {
      const tx = db.transaction([KPS_STORE], 'readonly');
      const store = tx.objectStore(KPS_STORE);
      const items = await new Promise((res, rej) => {
        const req = store.getAll();
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      allTopics = items;
      items.forEach(it => { kpsCache[it.uniqueId] = it; });
      refreshKpsSelectForCategory();
    } catch (err) {
      console.warn('Failed to load KPs', err);
      kpsSelect.innerHTML = '<option value="">(no KPS)</option>';
    }
  }

  function getStatusChar(lastClickedISO) {
    if (!lastClickedISO || new Date(lastClickedISO).getTime() === 0) return '🔴';
    const lastClicked = new Date(lastClickedISO);
    const now = new Date();
    const diffDays = Math.floor(Math.abs(now - lastClicked) / 86400000);
    if (diffDays < 5) return '🟢';
    if (diffDays < 7) return '🟡';
    return '🔴';
  }

  // 根据当前选中的学科 key 刷新 KPs 下拉选项
  function refreshKpsSelectForCategory() {
    if (!kpsSelect || !appConfig) return;
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '(no ref) select KPS or leave empty';

    const sel = document.querySelector('input[name="categoryRad"]:checked');
    const selectedSubjectKey = sel ? sel.value : (appConfig.subjects[0] ? appConfig.subjects[0].key : null);
    if (!selectedSubjectKey) {
      kpsSelect.innerHTML = '';
      kpsSelect.appendChild(defaultOpt);
      return;
    }

    // 从配置中获取该学科下的所有 topic id，保持顺序
    const subject = appConfig.subjects.find(s => s.key === selectedSubjectKey);
    if (!subject) {
      kpsSelect.innerHTML = '';
      kpsSelect.appendChild(defaultOpt);
      return;
    }

    const orderedTopicIds = subject.kps.map(t => t.id);
    const frag = document.createDocumentFragment();
    frag.appendChild(defaultOpt);

    orderedTopicIds.forEach(id => {
      const topic = kpsCache[id];
      if (!topic) return; // 如果知识点在存储中被删除了，跳过
      const opt = document.createElement('option');
      opt.value = topic.uniqueId;
      const clickCount = topic.clickCount || 0;
      const colorChar = getStatusChar(topic.lastClicked);
      opt.textContent = `${colorChar} ${topic.name} (${clickCount})`;
      frag.appendChild(opt);
    });

    kpsSelect.innerHTML = '';
    kpsSelect.appendChild(frag);
  }

  // ==================== 辅助函数 ====================
  function getSelectedTags() {
    const r = document.querySelector('input[name="tagRad"]:checked');
    if (!r) return '';
    
    // If custom tag is selected, use the custom input value
    if (r.value === '') {
      const customTagInput = document.getElementById('customTagInput');
      return customTagInput ? customTagInput.value.trim() : '';
    }
    
    return r.value;
  }

  function allowedToCreateForDate(dStr) {
    const d = new Date(dStr); d.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    return d.getTime() >= yesterday.getTime();
  }

  function allowedToSetStatusForDate(dStr) {
    return true; // 保留原逻辑
  }

  function formatDateLocal(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function updateWeekdayDisplay(dateStr) {
    if (!weekdayDisplay) return;
    if (!dateStr) { weekdayDisplay.textContent = ''; return; }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) { weekdayDisplay.textContent = ''; return; }
    try {
      const name = d.toLocaleDateString(navigator.language || 'en-US', { weekday: 'long' });
      weekdayDisplay.textContent = name;
    } catch (e) {
      const names = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      weekdayDisplay.textContent = names[d.getDay()];
    }
  }

  // ==================== 任务增删改查 ====================
  let showEditButtons = false;
  let editingItemId = null;

  async function addTask() {
    const date = planDate.value;
    if (!date) { alert('Please choose a date'); return; }
    if (!allowedToCreateForDate(date)) { alert('You can only create tasks for yesterday, today, or future dates'); return; }

    const categoryRad = document.querySelector('input[name="categoryRad"]:checked');
    const category = categoryRad ? categoryRad.value : (appConfig.subjects[0] ? appConfig.subjects[0].key : '');
    const tags = getSelectedTags();
    const kpsId = kpsSelect.value || null;
    const content = textContent.value.trim();
    if (!kpsId && !content) { alert('Please select a KPS or enter the task text'); return; }

    const item = {
      id: generateId(),  // Use custom timestamp-based ID like index.html
      date: date,
      category: category,   // 存储学科 key
      tag: tags || null,
      content: content || null,
      kpsId: kpsId,
      status: null,
      createdAt: new Date().toISOString()
    };

    try {
      const tx = db.transaction([DAILY_STORE], 'readwrite');
      const store = tx.objectStore(DAILY_STORE);
      if (editingItemId !== null) {
        item.id = editingItemId;
        item.updatedAt = new Date().toISOString();
        const req = store.put(item);
        await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
        editingItemId = null;
        if (editTaskHeader) editTaskHeader.style.display = 'none';
        if (toggleEditTasksBtn) toggleEditTasksBtn.disabled = false;
        addBtn.textContent = 'Save Task';
      } else {
        const req = store.add(item);
        await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
      }
      textContent.value = '';
      if (tagRadios && tagRadios.length) tagRadios[0].checked = true;
      kpsSelect.value = '';
      await renderTasksForDate(date);
      try { ensureAnimationStyles(); tasksList.classList.add('kp-flash'); setTimeout(() => tasksList.classList.remove('kp-flash'), 500); } catch (e) {}
    } catch (err) {
      console.error('Add task failed', err);
      alert('Add failed');
    }
  }

  function startEditing(item) {
    if (!item) return;
    if (item.status !== null) { alert('Cannot edit a task with a status'); return; }
    editingItemId = item.id;
    if (addControls && addControls.style.display === 'none') {
      if (toggleAddBtn) { addControls.style.display = 'block'; toggleAddBtn.textContent = 'Cancel'; }
    }
    if (editTaskHeader) editTaskHeader.style.display = '';
    addBtn.textContent = 'Update Task';

    // 设置学科 radio
    const cat = item.category || '';
    const catEl = document.querySelector(`input[name="categoryRad"][value="${cat}"]`);
    if (catEl) catEl.checked = true;
    refreshKpsSelectForCategory(); // 先刷新 KPs 下拉再设值
    // 设置 tag
    if (item.tag) {
      const tagEl = document.querySelector(`input[name="tagRad"][value="${item.tag}"]`);
      if (tagEl) tagEl.checked = true;
    }
    kpsSelect.value = item.kpsId || '';
    textContent.value = item.content || '';
  }

  function cancelEditing() {
    editingItemId = null;
    if (editTaskHeader) editTaskHeader.style.display = 'none';
    addBtn.textContent = 'Save Task';
    textContent.value = '';
    kpsSelect.value = '';
    if (tagRadios && tagRadios.length) tagRadios[0].checked = true;
    const firstCat = document.querySelector('input[name="categoryRad"]');
    if (firstCat) { firstCat.checked = true; refreshKpsSelectForCategory(); }
  }

  // 渲染任务表格（列顺序 = 学科配置顺序）
  async function renderTasksForDate(dateStr) {
    tasksList.innerHTML = '';
    try {
      const tx = db.transaction([DAILY_STORE], 'readonly');
      const store = tx.objectStore(DAILY_STORE);
      const idx = store.index('date');
      const req = idx.getAll(dateStr);
      const items = await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

      if (items.length === 0) {
        tasksList.innerHTML = '<p>No tasks</p>';
        return 0;
      }

      // 确定列顺序：appConfig.subjects 的 key，并添加一个“其他”列以防万一
      const subjectKeys = appConfig.subjects.map(s => s.key);
// 直接使用学科键作为列，移除 _other_
const columnKeys = subjectKeys;

const table = document.createElement('table');
table.className = 'tasks-table';
const thead = document.createElement('thead');
const htr = document.createElement('tr');
columnKeys.forEach(key => {
  const th = document.createElement('th');
  const subj = appConfig.subjects.find(s => s.key === key);
  th.textContent = subj ? subj.displayName : key;
  htr.appendChild(th);
});
thead.appendChild(htr);
table.appendChild(thead);

const tbody = document.createElement('tbody');
const row = document.createElement('tr');
const cells = {};
columnKeys.forEach(key => {
  const td = document.createElement('td');
  td.dataset.cat = key;
  td.style.minWidth = '120px';
  row.appendChild(td);
  cells[key] = td;
});
tbody.appendChild(row);

for (const it of items) {
  const col = it.category;
  // 如果 category 不在当前学科 keys 中，跳过该项
  if (!subjectKeys.includes(col)) continue;
  const target = cells[col];
  if (!target) continue;

  const taskEl = document.createElement('div');
  taskEl.className = 'task';
  if (it.status === -1) taskEl.classList.add('status-red');
  else if (it.status === 0) taskEl.classList.add('status-yellow');
  else if (it.status === 1) taskEl.classList.add('status-green');

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = it.tag || '-';
  taskEl.appendChild(meta);

  const body = document.createElement('div');
  const kpName = it.kpsId ? (kpsCache[it.kpsId] ? kpsCache[it.kpsId].name : it.kpsId) : null;
  let displayText = '';
  if (kpName && it.content && String(it.content).trim().length > 0) {
    displayText = `[${kpName}] (${it.content})`;
  } else if (kpName) {
    displayText = '[' + kpName + ']';
  } else if (it.content && String(it.content).trim().length > 0) {
    displayText = it.content;
  } else {
    displayText = '>>Unknown Task<<';
  }
  body.textContent = displayText;
  taskEl.appendChild(body);

  const actions = document.createElement('div');
  actions.style.marginTop = '8px';
  const canEdit = it.status === null;

  if (showEditButtons && canEdit) {
    const editBtn = document.createElement('button');
    editBtn.className = 'small ghost';
    editBtn.textContent = 'Edit';
    editBtn.style.marginLeft = '6px';
    editBtn.addEventListener('click', () => startEditing(it));
    actions.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'small ghost';
    delBtn.style.marginLeft = '6px';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => deleteTask(it));
    actions.appendChild(delBtn);
  }

  if (allowedToSetStatusForDate(it.date) && it.status === null) {
    const s0 = document.createElement('button');
    s0.textContent = '-1';
    s0.className = 'small';
    s0.style.marginLeft = '6px';
    s0.style.backgroundColor = '#f67a84ff';
    s0.style.color = '#fff';
    s0.addEventListener('click', () => setStatus(it, -1));

    const s1 = document.createElement('button');
    s1.textContent = '0';
    s1.className = 'small';
    s1.style.marginLeft = '6px';
    s1.style.backgroundColor = '#fbd86dff';
    s1.style.color = '#000';
    s1.addEventListener('click', () => setStatus(it, 0));

    const s2 = document.createElement('button');
    s2.textContent = '1';
    s2.className = 'small';
    s2.style.marginLeft = '6px';
    s2.style.backgroundColor = '#a7e2a5ff';
    s2.style.color = '#fff';
    s2.addEventListener('click', () => setStatus(it, 1));

    actions.appendChild(s0);
    actions.appendChild(s1);
    actions.appendChild(s2);
  } else if (!allowedToSetStatusForDate(it.date)) {
    const note = document.createElement('span');
    note.textContent = '';
    note.style.marginLeft = '12px';
    actions.appendChild(note);
  }

  taskEl.appendChild(actions);
  target.appendChild(taskEl);
}

      table.appendChild(tbody);
      tasksList.appendChild(table);
      return items.length;
    } catch (err) {
      console.error('Render tasks failed', err);
      tasksList.innerHTML = '<p>Load error</p>';
    }
    return 0;
  }

  async function setStatus(item, statusVal) {
    if (item.status !== null && item.status !== statusVal) { alert('Cannot change status once set'); return; }
    if (!allowedToSetStatusForDate(item.date)) { alert('You can only set status for yesterday or today'); return; }
    item.status = statusVal;
    item.statusUpdatedAt = new Date().toISOString();
    try {
      const tx = db.transaction([DAILY_STORE, LOGS_STORE, KPS_STORE], 'readwrite');
      const dstore = tx.objectStore(DAILY_STORE);
      const lstore = tx.objectStore(LOGS_STORE);
      const tstore = tx.objectStore(KPS_STORE);
      await new Promise((res, rej) => { const r = dstore.put(item); r.onsuccess = () => res(); r.onerror = () => rej(r.error); });
      if (item.kpsId && (statusVal === 0 || statusVal === 1)) {
        const nowISO = new Date().toISOString();
        try {
          const kpsIdNum = Number(item.kpsId);
          console.log('setStatus: kpsId=', item.kpsId, '(type:', typeof item.kpsId, '), converted to:', kpsIdNum, 'statusVal=', statusVal);
          const getReq = tstore.get(kpsIdNum);
          const topic = await new Promise((res, rej) => { getReq.onsuccess = () => res(getReq.result); getReq.onerror = () => rej(getReq.error); });
          console.log('setStatus: topic found=', !!topic, topic ? {uniqueId: topic.uniqueId, name: topic.name, clickCount: topic.clickCount} : null);
          if (topic) {
            const oldClickCount = topic.clickCount || 0;
            topic.clickCount = oldClickCount + 1;
            topic.lastClicked = nowISO;
            console.log('setStatus: updating clickCount from', oldClickCount, 'to', topic.clickCount);
            await new Promise((res, rej) => { const ur = tstore.put(topic); ur.onsuccess = () => res(); ur.onerror = (e) => { console.error('Failed to put topic:', e); rej(e); }; });
            console.log('setStatus: topic updated successfully');
            kpsCache[kpsIdNum] = topic;
            console.log('setStatus: cache updated');
          } else {
            console.warn('setStatus: topic not found for kpsId=', kpsIdNum);
          }
          const log = { 
            id: generateId(),
            KPsId: kpsIdNum, 
            KPsName: (topic && topic.name) ? topic.name : String(kpsIdNum), 
            timestamp: nowISO 
          };
          console.log('setStatus: adding log=', log);
          const addReq = lstore.add(log);
          addReq.onsuccess = () => console.log('setStatus: log added successfully, id=', addReq.result);
          addReq.onerror = (e) => console.error('setStatus: failed to add log:', e);
        } catch (e) { console.error('Failed to update topic or add log', e); }
      }
     await new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
      renderTasksForDate(item.date);
    } catch (err) { console.error('Set status failed', err); alert('Set status failed'); }
  }

  async function deleteTask(item) {
    if (item.status !== null) { alert('Tasks with status cannot be deleted'); return; }
    if (!confirm('Confirm delete this task?')) return;
    try {
      const tx = db.transaction([DAILY_STORE], 'readwrite');
      const store = tx.objectStore(DAILY_STORE);
      const req = store.delete(item.id);
      await new Promise((res, rej) => { req.onsuccess = () => res(); req.onerror = () => rej(req.error); });
      renderTasksForDate(item.date);
    } catch (err) { console.error('Delete failed', err); alert('Delete failed'); }
  }

  // Announcement handling
  // Basic HTML-escaped markdown renderer (very small subset): headings (#..), bold **, italic *, links [text](url), line breaks
  function escapeHtml(str){
    if(!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function renderMarkdown(md){
    if(!md) return '';
    // Support special KPS wrapper >| ... |< by extracting them first and replacing
    // with tokens so they survive HTML-escaping. We'll restore them to a highlighted
    // span after markdown->HTML processing.
    const kpTokens = [];
    if(typeof md === 'string'){
      md = md.replace(/>\|\s*([\s\S]*?)\s*\|</g, function(_, inner){
        const id = '__KP_WRAP_' + kpTokens.length + '__';
        kpTokens.push(inner);
        return id;
      });
    }
    // escape first
    let s = escapeHtml(md);
    // Support GitHub-style pipe tables. Detect table blocks and convert to HTML table.
    // A simple implementation: a header line with pipes, a separator line with dashes/colons, then rows.
    s = s.replace(/(^\|[^\n]*\n\|?[ \-:|\t]+\n(?:\|[^\n]*\n?)+)/gm, function(tableBlock){
      const lines = tableBlock.trim().split('\n').map(l=>l.trim()).filter(Boolean);
      if(lines.length < 2) return tableBlock;
      const headerLine = lines[0];
      const sepLine = lines[1];
      // validate separator line contains '-' or ':'
      if(!/[\-:]/.test(sepLine)) return tableBlock;
      // helper to split a pipe line into cells, trimming edges
      const splitCells = (line) => {
        // remove leading/trailing pipe if present, then split
        let t = line;
        if(t.startsWith('|')) t = t.slice(1);
        if(t.endsWith('|')) t = t.slice(0, -1);
        return t.split('|').map(c=> c.trim());
      };
      const headers = splitCells(headerLine);
      const rows = lines.slice(2).map(l=> splitCells(l));
      const thead = '<thead><tr>' + headers.map(h=> '<th>' + h + '</th>').join('') + '</tr></thead>';
      const tbody = '<tbody>' + rows.map(r=> '<tr>' + r.map(c=> '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody>';
      // add a specific class so we can style tables (borders, padding)
      return '<table class="kp-md-table">' + thead + tbody + '</table>';
    });
    // headings: ### -> h4, ## -> h3, # -> h2
    s = s.replace(/^###\s*(.+)$/gm, '<h4>$1</h4>');
    s = s.replace(/^##\s*(.+)$/gm, '<h3>$1</h3>');
    s = s.replace(/^#\s*(.+)$/gm, '<h2>$1</h2>');
    // bold **text**
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // italic *text*
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // links [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // paragraphs: two newlines -> paragraph break
    s = s.replace(/\n\n+/g, '</p><p>');
    // single newlines -> <br>
    s = s.replace(/\n/g, '<br>');
    // wrap with paragraph if not already starting with heading or paragraph
    if(!/^\s*<(h2|h3|h4|p)/i.test(s)) s = '<p>' + s + '</p>';
    // restore KPS tokens with highlighted span (insert escaped inner content)
    try{
      for(let i=0;i<kpTokens.length;i++){
        const token = '__KP_WRAP_' + i + '__';
        const innerEsc = escapeHtml(kpTokens[i]);
        const span = '<span class="kp-inline-kp">' + innerEsc + '</span>';
        s = s.split(token).join(span);
      }
      // inject style for the highlighted KPS token once
      if(typeof document !== 'undefined' && !document.getElementById('kp-inline-kp-style')){
        const css = '\n.kp-inline-kp{background:linear-gradient(90deg, rgba(242, 220, 79, 0.2), rgba(242, 215, 79, 0.19));padding:0 4px;border-radius:4px}\n';
        const st = document.createElement('style'); st.id = 'kp-inline-kp-style'; st.textContent = css; document.head.appendChild(st);
      }
    }catch(e){ /* ignore token restore errors */ }
    return s;
  }

  // Render a small subset of markdown inline (no block elements) for titles.
  // Supports bold (**text**), italic (*text*), and links [text](url).
  // Input is escaped first to avoid XSS; safe to insert as innerHTML for simple title rendering.
  function renderInlineMarkdown(md){
    if(!md) return '';
    let s = escapeHtml(md);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return s;
  }

  function ensureAnnouncementStyles(){
    if(document.getElementById('kp-announcement-style')) return;
    const css = `
      .kp-ann-note{border:1px dashed #ddd;border-left:6px solid #f7cc4cff;padding:10px;margin:8px 0;border-radius:6px;background:#fff}
      .kp-ann-note .kp-ann-head{display:flex;align-items:center;justify-content:space-between;cursor:pointer}
      .kp-ann-note .kp-ann-title{font-weight:700;margin-right:12px}
      .kp-ann-note .kp-ann-body{margin-top:8px;display:none}
      .kp-ann-note.expanded .kp-ann-body{display:block}
      .kp-ann-actions{display:flex;gap:6px;margin-left:8px;align-items:center}
      .kp-ann-btn{padding:4px 6px;border-radius:6px;border:1px solid transparent;cursor:pointer;font-size:12px}
      .kp-ann-btn.ghost{background:transparent;border-color: #ddd;color: #333}
      .kp-ann-btn.danger{background: #f55552ff;color: #fff;border-color: #ef4d4bff}
      .kp-ann-btn.primary{background: #4fa1f2ff;color: #fff;border-color: #409af5ff}
      .kp-ann-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:10000}
      .kp-ann-modal{background: #fff;padding:14px;border-radius:10px;max-width:900px;width:94%;max-height:88vh;overflow:auto}
      .kp-ann-list{display:flex;flex-direction:column;gap:10px}
      .kp-ann-editor{display:flex;flex-direction:column;gap:8px;margin-top:8px}
      /* Markdown table styling for announcements */
      .kp-md-table{border-collapse:collapse;width:100%;margin:8px 0}
      .kp-md-table th,.kp-md-table td{border:1px solid #dcdcdc;padding:6px 8px;text-align:left}
      .kp-md-table th{background: #f7f7f7;font-weight:600}
    `;
    const s = document.createElement('style'); s.id = 'kp-announcement-style'; s.textContent = css; document.head.appendChild(s);
  }

  function ensureFlawlessStyles(){
    if(document.getElementById('kp-flawless-style')) return;
    const css = `
      .kp-flawless{border:1px dashed #d6f0ff;border-left:6px solid #4fa1f2ff;padding:10px;margin:8px 0;border-radius:6px;background:#fff}
      .kp-flawless .kp-flawless-title{font-weight:700;margin-bottom:6px}
      .kp-flawless .kp-flawless-body{margin-top:6px}
      .kp-flawless .kp-flawless-actions{display:flex;gap:6px;align-items:center;justify-content:flex-end}
      .kp-flawless .kp-flawless-btn{padding:4px 6px;border-radius:6px;border:1px solid transparent;cursor:pointer;font-size:12px}
      .kp-flawless textarea{width:100%;min-height:80px}
    `;
    const s = document.createElement('style'); s.id = 'kp-flawless-style'; s.textContent = css; document.head.appendChild(s);
  }

  // Quick-phrases: styles and storage + suggestion UI
  function ensureQuickPhraseStyles(){
    if(document.getElementById('kp-quick-style')) return;
    const css = `
      .kp-quick-suggestions{border:1px solid #cfcfcf;background:#fff;padding:6px;border-radius:6px;box-shadow:0 12px 30px rgba(0,0,0,0.18);max-width:560px}
      .kp-quick-suggestions .item{padding:8px 10px;cursor:pointer;border-radius:6px;margin:2px 0}
      .kp-quick-suggestions .item:hover{background:#eff8ff}
      .kp-quick-suggestions .item.selected{background:#dff0ff;border:1px solid #bfe6ff;box-shadow:inset 0 0 0 1px rgba(79,161,242,0.06)}
      /* highlight matched substring with background color for clearer visibility (works for Chinese) */
      .kp-quick-suggestions .match{background:linear-gradient(90deg, rgba(79,161,242,0.18), rgba(79,161,242,0.12));padding:0 2px;border-radius:2px}
      /* ensure suggestions can float near textarea/caret */
      .kp-quick-wrapper{position:relative;display:block}
      .kp-quick-suggestions{position:absolute;left:0;top:100%;z-index:14000;margin-top:6px}
      .kp-quick-suggestions.floating{position:absolute;box-shadow:0 18px 46px rgba(0,0,0,0.22);max-width:420px}
    `;
    const s = document.createElement('style'); s.id = 'kp-quick-style'; s.textContent = css; document.head.appendChild(s);
  }

  function loadQuickPhrases(){
    try{ const v = localStorage.getItem('kp_quick_phrases'); if(!v) return []; return String(v).split(/\r?\n/).map(l=>l.trim()).filter(Boolean); }catch(e){return [];}
  }
  function saveQuickPhrases(list){ try{ localStorage.setItem('kp_quick_phrases', (list||[]).join('\n')); }catch(e){} }

  // Show modal to edit quick phrases (one per line)
  function showQuickPhrasesModal(){
    ensureQuickPhraseStyles();
    const overlay = document.createElement('div'); overlay.style.position='fixed'; overlay.style.inset='0'; overlay.style.background='rgba(0,0,0,0.45)'; overlay.style.display='flex'; overlay.style.alignItems='center'; overlay.style.justifyContent='center'; overlay.style.zIndex='10000';
    const modal = document.createElement('div'); modal.style.background='#fff'; modal.style.padding='14px'; modal.style.borderRadius='10px'; modal.style.width='720px'; modal.style.maxHeight='80vh'; modal.style.overflow='auto';
    const ta = document.createElement('textarea'); ta.style.width='100%'; ta.style.minHeight='240px'; ta.value = loadQuickPhrases().join('\n');
    const row = document.createElement('div'); row.style.display='flex'; row.style.justifyContent='space-between'; row.style.marginTop='8px';
    const left = document.createElement('div'); const info = document.createElement('div'); info.textContent='One phrase per line. Suggestions use fuzzy substring matching (supports Chinese).'; left.appendChild(info);
    const right = document.createElement('div'); right.style.display='flex'; right.style.gap='8px';
    const cancel = document.createElement('button'); cancel.className='kp-ann-btn ghost'; cancel.textContent='Cancel';
    const save = document.createElement('button'); save.className='kp-ann-btn primary'; save.textContent='Save';
    right.appendChild(cancel); right.appendChild(save); row.appendChild(left); row.appendChild(right);
    modal.appendChild(ta); modal.appendChild(row); overlay.appendChild(modal); document.body.appendChild(overlay);
    cancel.addEventListener('click', ()=>{ try{ overlay.remove(); }catch(e){} });
    save.addEventListener('click', ()=>{ const lines = String(ta.value||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean); saveQuickPhrases(lines); try{ overlay.remove(); }catch(e){} });
  }

  // suggestion state
  let qp_suggestions = [];
  let qp_selected = -1;
  // currently displayed matched suggestions (subset of qp_suggestions)
  let qp_currentMatched = [];
  // last caller element for suggestions (textarea/input)
  let qp_lastCallerEl = null;
  // summon-based suggestion mode: active after user presses Tab (anywhere in the text)
  let qp_mode = false;
  // position (index) of the summon char in the textarea value when mode started
  let qp_summonPos = null;

  // Ensure Flawless store exists: if missing, upgrade DB to create it.
 /*
  async function ensureFlawlessStoreExists(){
    if(!db) await openDB();
    if(db && db.objectStoreNames && db.objectStoreNames.contains(FLAWLESS_STORE)) return true;
    // perform a versioned upgrade to create the store
    try{
      const newVersion = (db && db.version) ? (db.version + 1) : (DB_VERSION || 2);
      if(db) try{ db.close(); }catch(e){}
      await new Promise((resolve, reject)=>{
        const r = indexedDB.open(DB_NAME, newVersion);
        r.onupgradeneeded = (e)=>{
          const nd = e.target.result;
          if(!nd.objectStoreNames.contains(FLAWLESS_STORE)){
            const store = nd.createObjectStore(FLAWLESS_STORE, { keyPath: 'id', autoIncrement: true });
            store.createIndex('date', 'date', { unique: true });
          }
        };
        r.onsuccess = (e)=>{ db = e.target.result; resolve(db); };
        r.onerror = (e)=> reject(e.target.error);
      });
      return true;
    }catch(err){ console.warn('ensureFlawlessStoreExists failed', err); return false; }
  }
*/
 async function buildQuickPhrasesList(dateStr) {
    const res = [];
    const saved = loadQuickPhrases();
    for (const s of saved) res.push({ text: s, isTask: false });
    try {
      if (db && db.objectStoreNames.contains(DAILY_STORE)) {
        const tx = db.transaction([DAILY_STORE], 'readonly');
        const store = tx.objectStore(DAILY_STORE);
        const idx = store.index('date');
        const r = idx.getAll(dateStr);
        const items = await new Promise((res2, rej2) => { r.onsuccess = () => res2(r.result); r.onerror = () => rej2(r.error); });
        for (const it of (items || [])) {
          const kpName = it.kpsId && kpsCache[it.kpsId] ? kpsCache[it.kpsId].name : null;
          const tag = it.tag || '-';
          // 用学科 displayName 代替 category key
          const subj = appConfig.subjects.find(s => s.key === it.category);
          const catDisplay = subj ? subj.displayName : it.category;
          let parts = [`${catDisplay}-${tag}`];
          if (kpName) parts.push('[' + kpName + ']');
          if (it.content) {
            if (kpName) parts.push('(' + it.content + ')');
            else parts.push('- ' + it.content);
          }
          const txt = parts.join(' ');
          res.push({ text: txt, isTask: true, item: it });
        }
      }
    } catch (e) { console.warn('buildQuickPhrasesList failed', e); }
    return res;
  }

  function createQuickSuggestContainer(){
    // Backwards-compatible: when called without args use global `textContent`.
    const callerEl = (arguments && arguments.length && arguments[0]) ? arguments[0] : textContent;
    if(!callerEl) return null;
    // prefer floating container attached to body so it can appear over other layout
    const containerId = 'kp-quick-suggestions-' + (callerEl.id || 'anon');
    let el = document.getElementById(containerId);
    if(!el){
      // ensure styles exist before creating container
      try{ ensureQuickPhraseStyles(); }catch(e){}
      el = document.createElement('div'); el.className = 'kp-quick-suggestions'; el.style.display='none'; el.id = containerId;
      // attach to body so positioning absolute works reliably
      document.body.appendChild(el);
    }
    return el;
  }

  // compute caret coordinates (approximate) and position floating container below caret
  function positionSuggestContainerFor(el, container){
    if(!el || !container) return;
    try{
      const rect = el.getBoundingClientRect();
      const computed = window.getComputedStyle(el);
      const lineHeight = parseInt(computed.lineHeight) || Math.round(parseInt(computed.fontSize || '14') * 1.2);
      const selStart = el.selectionStart || 0;
      const before = el.value.slice(0, selStart);
      const lines = before.split('\n').length - 1;
      const top = rect.top + window.scrollY + (lines * lineHeight) + lineHeight + 6 - el.scrollTop;
      const left = rect.left + window.scrollX + 6;
      container.style.position = 'absolute'; container.classList.add('floating');
      container.style.left = Math.max(8, left) + 'px'; container.style.top = top + 'px'; container.style.zIndex = 14000;
    }catch(e){ /* ignore positioning errors */ }
  }

  // render suggestions for a given prefix. callerEl is optional textarea/input to position near caret.
  function renderQuickSuggestions(prefix, callerEl, showAll){
    const caller = callerEl || qp_lastCallerEl || textContent;
    const container = createQuickSuggestContainer(caller); if(!container) return;
    const p = String(prefix||'').trim();
    // when prefix empty and not explicitly showing all, hide
    if(!p && !showAll){ container.style.display='none'; qp_selected = -1; qp_currentMatched = []; return; }
    let matched = [];
    if(showAll){ matched = (qp_suggestions||[]).slice(0,8); }
    else {
      const lower = p.toLowerCase();
      matched = qp_suggestions.filter(s=> {
        if(!s || !s.text) return false;
        try{ return String(s.text).toLowerCase().indexOf(lower) !== -1; }catch(e){ return false; }
      });
    }
    if(!matched || matched.length===0){ container.style.display='none'; qp_selected = -1; qp_currentMatched = []; return; }
    container.innerHTML = '';
    qp_currentMatched = matched;
    matched.forEach((m,idx)=>{
      const div = document.createElement('div'); div.className='item'; div.dataset.idx = idx;
      const txt = String(m.text || '');
      if(showAll || !p){ const span = document.createElement('span'); span.textContent = txt; div.appendChild(span); }
      else {
        const lowerTxt = txt.toLowerCase(); const matchIndex = lowerTxt.indexOf(String(p).toLowerCase());
        if(matchIndex === -1){ const span = document.createElement('span'); span.textContent = txt; div.appendChild(span); }
        else {
          const before = txt.slice(0, matchIndex);
          const matchedStr = txt.slice(matchIndex, matchIndex + p.length);
          const after = txt.slice(matchIndex + p.length);
          if(before) { const s1 = document.createElement('span'); s1.textContent = before; div.appendChild(s1); }
          const sm = document.createElement('span'); sm.className = 'match'; sm.textContent = matchedStr; div.appendChild(sm);
          if(after) { const s2 = document.createElement('span'); s2.textContent = after; div.appendChild(s2); }
        }
      }
      div.addEventListener('mousedown', (e)=>{ e.preventDefault(); acceptQuickSuggestion(idx); });
      container.appendChild(div);
    });
    qp_selected = 0; updateQuickSelection(caller);
    try{ positionSuggestContainerFor(caller, container); }catch(e){}
    container.style.display='block';
  }

  function updateQuickSelection(callerEl){
    const caller = callerEl || qp_lastCallerEl || textContent;
    const container = createQuickSuggestContainer(caller); if(!container) return;
    const items = Array.from(container.querySelectorAll('.item'));
    items.forEach((it,i)=>{ if(i===qp_selected) it.classList.add('selected'); else it.classList.remove('selected'); });
    // ensure selected item is visible
    const sel = items[qp_selected]; if(sel && sel.scrollIntoView) try{ sel.scrollIntoView({block:'nearest'}); }catch(e){}
  }

  function acceptQuickSuggestion(idx){
    const sel = (qp_currentMatched && qp_currentMatched[idx]) ? qp_currentMatched[idx] : null;
    if(!sel) return hideQuickSuggestions(qp_lastCallerEl);
    // For task suggestions, wrap with >| ... |< so renderMarkdown can turn it
    // into a highlighted span later. Non-task suggestions are inserted as-is.
    const insertText = sel.isTask ? (`>|${sel.text}|<`) : sel.text;
    const target = qp_lastCallerEl || textContent;
    if(!target){ hideQuickSuggestions(); return; }
    // Replace only the current line content after the summon char with the matched text.
    try{
      const val = target.value || '';
      const caret = target.selectionStart || 0;
        // Use tracked qp_summonPos (set when Tab was pressed) as the start of the typed prefix
        // Replace the text between qp_summonPos and current caret with the inserted suggestion, leaving trailing text intact.
        const startPos = (typeof qp_summonPos === 'number' && qp_summonPos >= 0 && qp_summonPos <= val.length) ? qp_summonPos : caret;
        const endPos = caret;
        const before = val.slice(0, startPos);
        const after = val.slice(endPos);
        const newVal = before + insertText + after;
        target.value = newVal;
        const newCaret = (before + insertText).length;
        try{ target.setSelectionRange(newCaret, newCaret); target.focus(); }catch(e){}
    }catch(e){
      // fallback
      target.value = insertText;
    }
    hideQuickSuggestions(target);
    qp_mode = false; qp_summonPos = null;
  }

  function hideQuickSuggestions(callerEl){
    const caller = callerEl || qp_lastCallerEl || textContent;
    const c = createQuickSuggestContainer(caller);
    if(c){ c.style.display='none'; c.innerHTML=''; }
    qp_suggestions = [];
    qp_selected = -1;
    qp_currentMatched = [];
    qp_lastCallerEl = null;
    qp_mode = false;
    qp_summonPos = null;
  }


  // wire input and keyboard handling
  // attach quick-phrase handlers to a specific element (textarea/input). If el omitted, use `textContent`.
  function attachQuickHandlers(el){
    const target = el || textContent;
    if(!target) return;
    // ensure suggestions container exists for this target
    createQuickSuggestContainer(target);
    // input: when in qp_mode (user pressed Tab to summon), update prefix live and filter suggestions.
    // If user moves outside the initial position or types too many chars (>8), cancel qp_mode.
    target.addEventListener('input', async (e)=>{
      qp_lastCallerEl = target;
      try{
        if(!qp_mode) return; // only react when summon mode is active
        const val = target.value || '';
        const caret = target.selectionStart || 0;
        // ensure summon position still inside same line
        let lineStart = val.lastIndexOf('\n', Math.max(0, caret-1));
        lineStart = lineStart === -1 ? 0 : (lineStart + 1);
        if(typeof qp_summonPos !== 'number' || qp_summonPos < lineStart || qp_summonPos > val.length){
          // moved outside summon zone, cancel but keep characters
          qp_mode = false; qp_summonPos = null; hideQuickSuggestions(target); return;
        }
        // prefix is the text the user typed since Tab (from qp_summonPos to caret)
        const prefix = val.slice(qp_summonPos, caret);
        // ignore if >8 characters (cancel mode but keep characters)
        if(prefix.length > 8){ qp_mode = false; qp_summonPos = null; hideQuickSuggestions(target); return; }
        qp_suggestions = await buildQuickPhrasesList(planDate.value);
        renderQuickSuggestions(prefix, target, prefix.length === 0);
      }catch(err){ console.warn('quick input handler failed', err); }
    });
    target.addEventListener('keydown', async (e)=>{
      // Tab behavior:
      // - If qp_mode is active (user pressed Tab), typed characters filter suggestions live.
      // - If suggestions are visible, Tab accepts the current selection.
      if(e.key === 'Tab'){
        // Always prevent default Tab inside the input so we can open/accept suggestions reliably
        e.preventDefault();
        // if suggestions currently visible, allow accept flow below to handle it
        const container = createQuickSuggestContainer(target);
        const visible = container && container.style && container.style.display === 'block';
        if(visible){
          // if suggestions visible, accept current selection on Tab
          if(typeof qp_selected === 'number' && qp_selected >= 0){
            try{ acceptQuickSuggestion(qp_selected); }catch(e){/* ignore */}
          }
        }
        else {
          // Not visible: start summon mode at current caret (allow Tab anywhere)
          qp_lastCallerEl = target;
          qp_mode = true;
          const pos = target.selectionStart || 0;
          qp_summonPos = pos; // prefix starts at this caret position
          try{
            qp_suggestions = await buildQuickPhrasesList(planDate.value);
            // show all when no prefix yet
            renderQuickSuggestions('', target, true);
          }catch(err){ console.warn('Tab summon failed', err); }
        }
        return;
      }
      const container = createQuickSuggestContainer(target); if(!container) return;
      const items = container.querySelectorAll('.item'); if(items.length===0) return;
      if(e.key === 'ArrowDown'){ e.preventDefault(); qp_selected = Math.min(qp_selected+1, items.length-1); updateQuickSelection(target); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); qp_selected = Math.max(qp_selected-1, 0); updateQuickSelection(target); }
      else if(e.key === 'Tab' || e.key === 'Enter'){ if(qp_selected>=0){ e.preventDefault(); acceptQuickSuggestion(qp_selected); } }
      else if(e.key === 'Escape'){ hideQuickSuggestions(target); }
      else {
        // other keys: let input handler handle filtering
      }
    });
    // hide when blurred (delay to allow click)
    target.addEventListener('blur', ()=>{ setTimeout(()=> { hideQuickSuggestions(target); qp_mode = false; qp_summonPos = null; }, 160); });
  }

  function extractTitle(text){
    if(!text) return '';
    // If parameters are appended after a trailing '|||', they must not appear in the title.
    // splitParams will strip the parameter section and return the main text.
    try{
      const sp = splitParams(String(text));
      const main = sp.main || '';
      const m = main.match(/^\s*#\s*(.+)/m);
      if(m) return m[1].trim();
      const first = main.split(/\n/).find(l=> l.trim().length>0);
      if(!first) return '';
      return first.trim().slice(0,120);
    }catch(e){
      // fallback to old behaviour
      const m = String(text).match(/^\s*#\s*(.+)/m);
      if(m) return m[1].trim();
      const first = String(text).split(/\n/).find(l=> l.trim().length>0);
      if(!first) return '';
      return first.trim().slice(0,120);
    }
  }

  // Remove the leading heading line (e.g. "# Title") from markdown so it won't duplicate
  function stripLeadingHeading(md){
    if(!md) return '';
    // Also strip any parameter section appended with '|||' so body does not show params.
    const sp = splitParams(String(md));
    const main = sp.main || '';
    const lines = String(main).split(/\n/);
    for(let i=0;i<lines.length;i++){
      const line = lines[i];
      if(line.trim().length === 0) continue;
      if(/^\s*#{1,6}\s+/.test(line)){
        lines.splice(i,1);
        return lines.join('\n').trim();
      }
      break;
    }
    return main;
  }

  // Parse parameter section appended with '|||'. Returns { main: <md without params>, params: [<string>] }
  function splitParams(md){
    if(!md) return { main: '', params: [] };
    const s = String(md);
    // Only consider '|||' if it appears on the first line. This prevents removing content
    // when '|||' is used later in the body.
    const lines = s.split(/\r?\n/);
    const first = lines.length ? lines[0] : '';
    const idx = first.indexOf('|||');
    if(idx === -1) return { main: s, params: [] };
    const left = first.slice(0, idx).trimRight();
    const part = first.slice(idx + 3).trim();
    const rest = lines.slice(1).join('\n');
    const main = (left + (rest ? '\n' + rest : '')).trim();
    if(!part) return { main, params: [] };
    // split by english comma
    const params = part.split(',').map(p=> p.trim()).filter(Boolean);
    return { main, params };
  }

  function parseParams(md){ return splitParams(md).params; }

  function renderAnnouncementCard(a){
    const wrap = document.createElement('div'); wrap.className = 'kp-ann-note';
    const head = document.createElement('div'); head.className = 'kp-ann-head';
    // parse parameter section (if any). Title and body should not display the parameter section.
    const rawText = a.text || a.content || '';
  const parsed = splitParams(rawText);
  const params = parsed.params || [];
  // Debug: log params for this announcement
  try{ console.log('Announcement', a.id, 'params=', params); }catch(e){}
    const titleText = extractTitle(parsed.main || rawText || '');
    const meta = document.createElement('div'); meta.className = 'kp-ann-meta'; meta.style.fontSize='12px'; meta.style.color='#666';
    const updated = a.updatedAt || a.createdAt || ''; meta.textContent = updated ? new Date(updated).toLocaleString() : '';
    const right = document.createElement('div'); right.style.display='flex'; right.style.alignItems='center';
    const actions = document.createElement('div'); actions.className = 'kp-ann-actions';
    const editBtn = document.createElement('button'); editBtn.className = 'kp-ann-btn ghost'; editBtn.textContent = 'Edit';
    const pinBtn = document.createElement('button'); pinBtn.className = 'kp-ann-btn ghost'; pinBtn.textContent = a.pinned ? 'Unpin' : 'Pin';
    const delBtn = document.createElement('button'); delBtn.className = 'kp-ann-btn danger'; delBtn.textContent = 'Delete';
    // For pinned cards show only Edit in the main view
    if(a.pinned){ actions.appendChild(editBtn); }
    else { actions.appendChild(editBtn); actions.appendChild(pinBtn); actions.appendChild(delBtn); }
    right.appendChild(actions);

    // Only append a title element when an actual title exists (params removed earlier); otherwise leave header empty
    if(titleText){
      const title = document.createElement('div'); title.className = 'kp-ann-title'; title.innerHTML = renderInlineMarkdown(titleText);
      head.appendChild(title);
    }
    head.appendChild(right);
    wrap.appendChild(head);

    const body = document.createElement('div'); body.className = 'kp-ann-body';
    // avoid duplicating title: strip leading heading if present; also use the main text without params
    let bodyMd = parsed.main || '';
    if(extractTitle(parsed.main || '')) bodyMd = stripLeadingHeading(bodyMd);
    body.innerHTML = renderMarkdown(bodyMd);
    wrap.appendChild(body);

    // If parameters include 'Open', auto-expand pinned cards on the homepage
    try{ if(Array.isArray(params) && params.find(p=> p.toLowerCase() === 'open')) wrap.classList.add('expanded'); }catch(e){}

    // toggle on head click (only when clicking outside action buttons)
    head.addEventListener('click', (e)=>{ if(e.target === editBtn || e.target === pinBtn || e.target === delBtn) return; wrap.classList.toggle('expanded'); });

    // actions
    // Edit: inline editor in main view for pinned (and for others when clicked here)
    editBtn.addEventListener('click', (e)=>{ e.stopPropagation();
      if(wrap.dataset.editing === '1') return;
      wrap.dataset.editing = '1';
      wrap.classList.add('expanded');
      const prevBody = body;
      const editorWrap = document.createElement('div'); editorWrap.className='kp-ann-editor';
      const ta = document.createElement('textarea'); ta.style.width='100%'; ta.style.minHeight='120px'; ta.value = a.text || a.content || '';
      const sr = document.createElement('div'); sr.style.display='flex'; sr.style.justifyContent='space-between'; sr.style.alignItems='center'; sr.style.gap='8px';
      const leftGroup = document.createElement('div'); leftGroup.style.display='flex'; leftGroup.style.gap='8px';
      const cancelPinBtn = document.createElement('button'); cancelPinBtn.className='kp-ann-btn ghost'; cancelPinBtn.textContent = a.pinned ? 'Unpin' : 'Pin';
      const deleteBtn = document.createElement('button'); deleteBtn.className='kp-ann-btn danger'; deleteBtn.textContent='Delete';
      leftGroup.appendChild(cancelPinBtn); leftGroup.appendChild(deleteBtn);
      const rightGroup = document.createElement('div'); rightGroup.style.display='flex'; rightGroup.style.gap='8px';
      const cancel = document.createElement('button'); cancel.className='kp-ann-btn ghost'; cancel.textContent='Cancel';
      const save = document.createElement('button'); save.className='kp-ann-btn primary'; save.textContent='Save';
      rightGroup.appendChild(cancel); rightGroup.appendChild(save);
      sr.appendChild(leftGroup); sr.appendChild(rightGroup);
      editorWrap.appendChild(ta); editorWrap.appendChild(sr);
      wrap.replaceChild(editorWrap, prevBody);

      cancel.addEventListener('click', (ev)=>{ ev.stopPropagation(); wrap.replaceChild(prevBody, editorWrap); delete wrap.dataset.editing; });
      save.addEventListener('click', async (ev)=>{ ev.stopPropagation(); try{ const tx = db.transaction([ANNOUNCEMENTS_STORE],'readwrite'); const store = tx.objectStore(ANNOUNCEMENTS_STORE); const rec = Object.assign({}, a); rec.text = ta.value; rec.updatedAt = new Date().toISOString(); const req = store.put(rec); await new Promise((res,rej)=>{ req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); }); await new Promise((res,rej)=>{ tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); // update body
          let newBodyMd = rec.text || rec.content || '';
          if(extractTitle(rec.text || rec.content || '')) newBodyMd = stripLeadingHeading(newBodyMd);
          prevBody.innerHTML = renderMarkdown(newBodyMd);
          wrap.replaceChild(prevBody, editorWrap);
          delete wrap.dataset.editing;
          loadAnnouncement();
        }catch(err){ console.error('Save failed', err); alert('Save failed'); } });

      cancelPinBtn.addEventListener('click', async (ev)=>{ ev.stopPropagation(); try{ const tx = db.transaction([ANNOUNCEMENTS_STORE],'readwrite'); const store = tx.objectStore(ANNOUNCEMENTS_STORE); const rec = Object.assign({}, a); rec.pinned = !rec.pinned; if(rec.pinned) rec.pinnedAt = new Date().toISOString(); else delete rec.pinnedAt; rec.updatedAt = new Date().toISOString(); const req = store.put(rec); await new Promise((res,rej)=>{ req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); }); await new Promise((res,rej)=>{ tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); loadAnnouncement(); wrap.replaceChild(prevBody, editorWrap); delete wrap.dataset.editing; }catch(err){ console.error('Pin toggle failed', err); alert('Pin/unpin failed'); } });

      deleteBtn.addEventListener('click', async (ev)=>{ ev.stopPropagation(); if(!confirm('Delete this announcement?')) return; try{ const tx = db.transaction([ANNOUNCEMENTS_STORE],'readwrite'); const store = tx.objectStore(ANNOUNCEMENTS_STORE); const req = store.delete(a.id); await new Promise((res,rej)=>{ req.onsuccess=()=>res(); req.onerror=()=>rej(req.error); }); await new Promise((res,rej)=>{ tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); try{ if(wrap.parentNode) wrap.parentNode.removeChild(wrap); }catch(e){} loadAnnouncement(); }catch(err){ console.error('Delete failed', err); alert('Delete failed'); } });
    });

    // pin and del behavior for non-inline buttons still supported
    pinBtn.addEventListener('click', async (e)=>{ e.stopPropagation(); try{ const tx = db.transaction([ANNOUNCEMENTS_STORE],'readwrite'); const store = tx.objectStore(ANNOUNCEMENTS_STORE); const rec = Object.assign({}, a); rec.pinned = !rec.pinned; if(rec.pinned) rec.pinnedAt = new Date().toISOString(); else delete rec.pinnedAt; rec.updatedAt = new Date().toISOString(); const r = store.put(rec); await new Promise((res,rej)=>{ r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); await new Promise((res,rej)=>{ tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); loadAnnouncement(); }catch(err){ console.error('Pin toggle failed', err); alert('Pin/unpin failed'); } });

    delBtn.addEventListener('click', async (e)=>{ e.stopPropagation(); if(!confirm('Delete this announcement?')) return; try{ const tx = db.transaction([ANNOUNCEMENTS_STORE],'readwrite'); const store = tx.objectStore(ANNOUNCEMENTS_STORE); const r = store.delete(a.id); await new Promise((res,rej)=>{ r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); await new Promise((res,rej)=>{ tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); loadAnnouncement(); }catch(err){ console.error('Delete announcement failed', err); alert('Delete failed'); } });

    return wrap;
  }

  // Flawless: render a single per-day, editable note (English / 无懈可击)
  function renderFlawlessCard(rec, dateStr){
    const wrap = document.createElement('div'); wrap.className = 'kp-flawless';
    const head = document.createElement('div'); head.style.display='flex'; head.style.justifyContent='space-between'; head.style.alignItems='center';
    const left = document.createElement('div'); left.style.display='flex'; left.style.flexDirection='column';
    const title = document.createElement('div'); title.className='kp-flawless-title'; title.textContent = 'Flawless';
    const small = document.createElement('div'); small.style.fontSize='12px'; small.style.color='#666'; small.textContent = dateStr || '';
    left.appendChild(title); left.appendChild(small);
    head.appendChild(left);
    const actions = document.createElement('div'); actions.className='kp-flawless-actions';
    const editBtn = document.createElement('button'); editBtn.className='kp-flawless-btn'; editBtn.textContent = rec ? 'Edit' : 'Add';
    actions.appendChild(editBtn);
    head.appendChild(actions);
    wrap.appendChild(head);

    const body = document.createElement('div'); body.className='kp-flawless-body';
    body.innerHTML = rec && rec.text ? renderMarkdown(rec.text) : '(no flawless note)';
    wrap.appendChild(body);

    editBtn.addEventListener('click', (e)=>{ e.stopPropagation(); editFlawless(rec, dateStr, body, wrap, editBtn); });
    return wrap;
  }

  async function loadFlawlessForDate(dateStr){
    ensureFlawlessStyles();
    // create container if not present
    try{
      if(!flawlessContent){
        // try to find static container by id (ToDos.php creates #flawlessContent)
        flawlessContent = document.getElementById('flawlessContent') || flawlessContent;
        if(!flawlessContent){
          // create wrapper and insert between tasksList and addControls
          const wrapper = document.createElement('div'); wrapper.id = 'flawlessContent';
          wrapper.style.marginTop = '8px';
          // attach to DOM
          if(tasksList && tasksList.parentNode){
            tasksList.parentNode.insertBefore(wrapper, addControls || tasksList.nextSibling);
            flawlessContent = wrapper;
          }
        }
      }
    }catch(e){/* ignore */}
    if(!flawlessContent) return;
    try{
    /*  if(!db.objectStoreNames.contains(FLAWLESS_STORE)){
        // try to create the store automatically for compatibility
       // const ok = await ensureFlawlessStoreExists();
        if(!ok || !db.objectStoreNames.contains(FLAWLESS_STORE)){
          flawlessContent.innerHTML = '(no flawless store)'; return;
        }
      }*/
      const tx = db.transaction([FLAWLESS_STORE], 'readonly');
      const store = tx.objectStore(FLAWLESS_STORE);
      // index is unique date
      const idx = store.index('date');
      const req = idx.get(dateStr);
      const rec = await new Promise((res,rej)=>{ req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); });
      // If the page contains a static flawless structure (ToDos.php), populate it directly
      const staticBody = document.getElementById('flawlessBody');
      const staticDate = document.getElementById('flawlessDate');
      const staticEditBtn = document.getElementById('editFlawlessBtn');
      if(staticBody){
        if(staticDate) staticDate.textContent = dateStr || '';
        staticBody.innerHTML = rec && rec.text ? renderMarkdown(rec.text) : '(no flawless note)';
        // wire up edit button with a single onclick that fetches fresh record when clicked
        if(staticEditBtn){
          staticEditBtn.onclick = function(e){ e.stopPropagation(); editFlawless(null, dateStr, staticBody, flawlessContent || document.getElementById('flawlessContent'), staticEditBtn); };
        }
        return;
      }
      // clear content and render fallback card when no static structure present
      flawlessContent.innerHTML = '';
      flawlessContent.appendChild(renderFlawlessCard(rec, dateStr));
    }catch(err){ console.error('Load flawless failed',err); if(flawlessContent) flawlessContent.textContent='(load failed)'; }
  }

  async function editFlawless(rec, dateStr, bodyEl, wrap, editBtn){
    // if already in edit mode, do nothing
    if(wrap.dataset.flawlessEditing === '1') return;
    // if caller didn't pass the record, fetch latest from DB
    if(!rec){
      try{
        if(db && db.objectStoreNames && db.objectStoreNames.contains(FLAWLESS_STORE)){
          const t = db.transaction([FLAWLESS_STORE],'readonly');
          const s = t.objectStore(FLAWLESS_STORE); const idx = s.index('date');
          const r = idx.get(dateStr);
          rec = await new Promise((res,rej)=>{ r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
        }
      }catch(e){ console.warn('Failed to fetch flawless record for edit', e); }
    }
    wrap.dataset.flawlessEditing = '1';
    const prevBody = bodyEl;
    const editor = document.createElement('div'); editor.style.display='flex'; editor.style.flexDirection='column'; editor.style.gap='6px';
    const ta = document.createElement('textarea'); ta.value = rec && rec.text ? rec.text : '';
    const row = document.createElement('div'); row.style.display='flex'; row.style.justifyContent='flex-end'; row.style.gap='8px';
    const saveBtn = document.createElement('button'); saveBtn.className='kp-flawless-btn'; saveBtn.textContent='Save';
    const cancelBtn = document.createElement('button'); cancelBtn.className='kp-flawless-btn'; cancelBtn.textContent='Cancel';
    row.appendChild(cancelBtn); row.appendChild(saveBtn);
    editor.appendChild(ta); editor.appendChild(row);
    wrap.replaceChild(editor, prevBody);
    try{ attachQuickHandlers(ta); }catch(e){}

    cancelBtn.addEventListener('click', ()=>{ wrap.replaceChild(prevBody, editor); delete wrap.dataset.flawlessEditing; });

    saveBtn.addEventListener('click', async ()=>{
      const newText = ta.value;
      try{
        // ensure store exists
        if(!db.objectStoreNames.contains(FLAWLESS_STORE)){
          //await ensureFlawlessStoreExists();
        }
        const tx = db.transaction([FLAWLESS_STORE], 'readwrite');
        const store = tx.objectStore(FLAWLESS_STORE);
        let recToSave = Object.assign({}, rec || {});
        recToSave.date = dateStr;
        recToSave.text = newText;
        recToSave.updatedAt = new Date().toISOString();
        recToSave.id = generateId(new Date(dateStr));//aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
        if(rec && rec.id){ recToSave.id = rec.id; const req = store.put(recToSave); await new Promise((res,rej)=>{ req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); }); }
        else { const req = store.add(recToSave); const newId = await new Promise((res,rej)=>{ req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); }); recToSave.id = newId; }
        await new Promise((res,rej)=>{ tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); });
        // replace UI; if previous body had an id (static), preserve it so loader still finds the static container
        const newBody = document.createElement('div'); newBody.className='kp-flawless-body'; newBody.innerHTML = renderMarkdown(recToSave.text);
        if(prevBody && prevBody.id) newBody.id = prevBody.id;
        wrap.replaceChild(newBody, editor);
        delete wrap.dataset.flawlessEditing;
        // reload to rebind handlers and ensure consistent state
        await loadFlawlessForDate(dateStr);
      }catch(err){ console.error('Save flawless failed', err); alert('Save failed'); }
    });
  }

  async function loadAnnouncement(){
    if(!announcementContent) return;
    try{
      if(!db.objectStoreNames.contains(ANNOUNCEMENTS_STORE)){ announcementContent.textContent = '(no announcement)'; return; }
      const tx = db.transaction([ANNOUNCEMENTS_STORE],'readonly');
      const store = tx.objectStore(ANNOUNCEMENTS_STORE);
      const req = store.getAll();
      const items = await new Promise((res,rej)=>{ req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); });
      if(!items || items.length===0){ announcementContent.innerHTML = '(no announcement)'; return; }
      // show only pinned announcements (support multiple).
      // Parse parameter section for each item and store as _params. Items with param 'AOP' should be prioritized,
      // but within the same priority group keep time order (pinnedAt/updatedAt desc).
      const pinned = (items||[]).filter(i=> i.pinned).map(i=>{ try{ const p = splitParams(i.text||i.content||''); i._params = p.params || []; }catch(e){ i._params = []; } return i; }).sort((a,b)=>{
        const aAop = (a._params && a._params.find(p=> p.toLowerCase() === 'aop')) ? 1 : 0;
        const bAop = (b._params && b._params.find(p=> p.toLowerCase() === 'aop')) ? 1 : 0;
        if(aAop !== bAop) return bAop - aAop; // those with AOP first
        const pa = a.pinnedAt || a.updatedAt || a.createdAt || '';
        const pb = b.pinnedAt || b.updatedAt || b.createdAt || '';
        if(pa === pb){ const ua = a.updatedAt || a.createdAt || ''; const ub = b.updatedAt || b.createdAt || ''; return ub.localeCompare(ua); }
        return pb.localeCompare(pa);
      });
      // Debug: log parsed params for pinned announcements
      try{ pinned.forEach(i=> console.log('Pinned announcement', i.id, 'params=', i._params || [])); }catch(e){}
      if(!pinned || pinned.length===0){ announcementContent.innerHTML = '(no announcement)'; return; }
      announcementContent.innerHTML = '';
      ensureAnnouncementStyles();
      for(const a of pinned){ announcementContent.appendChild(renderAnnouncementCard(a)); }
    }catch(err){ console.warn('Load announcement failed', err); if(announcementContent) announcementContent.textContent='(load failed)'; }
  }

  // Modal that shows all announcements with edit/pin/delete and in-modal editing
  async function showAnnouncementsModal(focusId, opts){
    ensureAnnouncementStyles();
    try{
      const tx = db.transaction([ANNOUNCEMENTS_STORE],'readonly'); const store = tx.objectStore(ANNOUNCEMENTS_STORE); const r = store.getAll(); const items = await new Promise((res,rej)=>{ r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
      const overlay = document.createElement('div'); overlay.className = 'kp-ann-modal-overlay';
      const modal = document.createElement('div'); modal.className = 'kp-ann-modal';
      const h = document.createElement('h3'); h.textContent = 'All announcements'; modal.appendChild(h);
      const ctrlRow = document.createElement('div'); ctrlRow.style.display='flex'; ctrlRow.style.justifyContent='space-between'; ctrlRow.style.alignItems='center';
      const left = document.createElement('div'); const newBtn = document.createElement('button'); newBtn.className='kp-ann-btn primary'; newBtn.textContent='New'; left.appendChild(newBtn); ctrlRow.appendChild(left);
      const right = document.createElement('div'); const closeBtn = document.createElement('button'); closeBtn.className='kp-ann-btn ghost'; closeBtn.textContent='Close'; right.appendChild(closeBtn); ctrlRow.appendChild(right);
      modal.appendChild(ctrlRow);
      const list = document.createElement('div'); list.className = 'kp-ann-list';
      // helper to load and refresh the list
      // NOTE: Do NOT reuse the outer transaction/objectStore here because
      // the outer readonly transaction will become inactive once the event
      // loop yields. Create a fresh transaction each time we need to access
      // the store (fixes TransactionInactiveError when actions run later).
      async function loadAllItems(){
        const t = db.transaction([ANNOUNCEMENTS_STORE], 'readonly');
        const s = t.objectStore(ANNOUNCEMENTS_STORE);
        const rr = s.getAll();
        const all = await new Promise((res, rej) => { rr.onsuccess = () => res(rr.result); rr.onerror = () => rej(rr.error); });
        return all || [];
      }
      async function refreshList(){
        list.innerHTML = '';
        const all = await loadAllItems();
        const sorted2 = (all||[]).slice().sort((a,b)=>{ const ua = a.updatedAt || a.createdAt || ''; const ub = b.updatedAt || b.createdAt || ''; return ub.localeCompare(ua); });
        for(const aa of sorted2){ list.appendChild(buildRow(aa)); }
      }

      // sort by updatedAt desc
      const sorted = (items||[]).slice().sort((a,b)=>{ const ua = a.updatedAt || a.createdAt || ''; const ub = b.updatedAt || b.createdAt || ''; return ub.localeCompare(ua); });

      // helper to build each row
      function buildRow(a){
        const row = document.createElement('div'); row.style.border='1px solid #eee'; row.style.padding='10px'; row.style.borderRadius='8px';
        const head = document.createElement('div'); head.style.display='flex'; head.style.justifyContent='space-between'; head.style.alignItems='center';
    const titleText = extractTitle(a.text || a.content || '');
    // Only append title when present; otherwise leave header empty
    if(titleText){
      const t = document.createElement('div'); t.style.fontWeight='700'; t.innerHTML = renderInlineMarkdown(titleText);
      head.appendChild(t);
    }
    const m = document.createElement('div'); m.style.fontSize='12px'; m.style.color='#666'; m.textContent = (a.pinned ? '📌 ' : '') + (a.updatedAt ? new Date(a.updatedAt).toLocaleString() : (a.createdAt ? new Date(a.createdAt).toLocaleString() : ''));
    head.appendChild(m); row.appendChild(head);
    const body = document.createElement('div'); body.style.marginTop='8px';
    // If the announcement had a leading heading, strip it from the body so
    // the title is shown in the header and the body doesn't duplicate it.
    let bodyMd = a.text || a.content || '';
    if(titleText) bodyMd = stripLeadingHeading(bodyMd);
    body.innerHTML = renderMarkdown(bodyMd);
    row.appendChild(body);
        const actions = document.createElement('div'); actions.style.marginTop='8px'; actions.style.display='flex'; actions.style.gap='8px';
        const edit = document.createElement('button'); edit.className='kp-ann-btn ghost'; edit.textContent='Edit';
        const pin = document.createElement('button'); pin.className='kp-ann-btn ghost'; pin.textContent = a.pinned ? 'Unpin' : 'Pin';
        const del = document.createElement('button'); del.className='kp-ann-btn danger'; del.textContent='Delete';
        actions.appendChild(edit); actions.appendChild(pin); actions.appendChild(del);
        row.appendChild(actions);

        // edit opens an inline editor
        edit.addEventListener('click', ()=>{
          // replace body with textarea + save/cancel
          // hide the row actions while editing to avoid duplicate Unpin/Delete
          actions.style.display = 'none';
          const editorWrap = document.createElement('div'); editorWrap.className='kp-ann-editor';
          const ta = document.createElement('textarea'); ta.style.width='100%'; ta.style.minHeight='120px'; ta.value = a.text || a.content || '';
          const sr = document.createElement('div'); sr.style.display='flex'; sr.style.justifyContent='space-between'; sr.style.gap='8px';
          const leftGroup = document.createElement('div'); leftGroup.style.display='flex'; leftGroup.style.gap='8px';
          const isNew = !a.id;
          // mark temporary new rows so we can prevent duplicate New clicks
          if(isNew) row.dataset.new = '1';
          // For new (unsaved) records we intentionally do NOT show Pin/Delete buttons.
          // For existing records, create unpin/delete buttons.
          let unpinBtn = null;
          let deleteBtn = null;
          if(!isNew){
            unpinBtn = document.createElement('button'); unpinBtn.className='kp-ann-btn ghost'; unpinBtn.textContent = a.pinned ? 'Unpin' : 'Pin';
            deleteBtn = document.createElement('button'); deleteBtn.className='kp-ann-btn danger'; deleteBtn.textContent = 'Delete';
            leftGroup.appendChild(unpinBtn); leftGroup.appendChild(deleteBtn);
          }
          const rightGroup = document.createElement('div'); rightGroup.style.display='flex'; rightGroup.style.gap='8px';
          const save = document.createElement('button'); save.className='kp-ann-btn primary'; save.textContent='Save';
          const cancel = document.createElement('button'); cancel.className='kp-ann-btn ghost'; cancel.textContent='Cancel';
          rightGroup.appendChild(cancel); rightGroup.appendChild(save);
          sr.appendChild(leftGroup); sr.appendChild(rightGroup);
          editorWrap.appendChild(ta); editorWrap.appendChild(sr);
          row.replaceChild(editorWrap, body);

          cancel.addEventListener('click', ()=>{
            // If this is a temporary new row, cancel should discard it entirely.
            if(isNew){ try{ if(row.parentNode) row.parentNode.removeChild(row); }catch(e){}; return; }
            row.replaceChild(body, editorWrap); actions.style.display='flex';
          });
          save.addEventListener('click', async ()=>{
            try{
              const tx2 = db.transaction([ANNOUNCEMENTS_STORE],'readwrite'); const store2 = tx2.objectStore(ANNOUNCEMENTS_STORE);
              const rec = Object.assign({}, a); rec.text = ta.value; rec.updatedAt = new Date().toISOString(); const req2 = store2.put(rec);
              await new Promise((res,rej)=>{ req2.onsuccess=()=>res(req2.result); req2.onerror=()=>rej(req2.error); });
              await new Promise((res,rej)=>{ tx2.oncomplete=()=>res(); tx2.onerror=()=>rej(tx2.error); });
              // update UI
              body.innerHTML = renderMarkdown(rec.text);
              row.replaceChild(body, editorWrap);
              actions.style.display='flex';
              // refresh modal list and main pinned view
              try{ refreshList(); }catch(e){}
              loadAnnouncement();
            }catch(err){ console.error('Save announcement failed', err); alert('Save failed'); }
          });

          // unpin and delete in-editor (only attach handlers if buttons exist)
          if(unpinBtn){
            unpinBtn.addEventListener('click', async ()=>{
              try{
                const tx3 = db.transaction([ANNOUNCEMENTS_STORE],'readwrite'); const store3 = tx3.objectStore(ANNOUNCEMENTS_STORE);
                const rec = Object.assign({}, a); rec.pinned = !rec.pinned; if(rec.pinned) rec.pinnedAt = new Date().toISOString(); else delete rec.pinnedAt; rec.updatedAt = new Date().toISOString();
                const req3 = store3.put(rec);
                await new Promise((res,rej)=>{ req3.onsuccess=()=>res(req3.result); req3.onerror=()=>rej(req3.error); });
                await new Promise((res,rej)=>{ tx3.oncomplete=()=>res(); tx3.onerror=()=>rej(tx3.error); });
                unpinBtn.textContent = rec.pinned ? 'Unpin' : 'Pin'; loadAnnouncement();
              }catch(err){ console.error('Unpin failed', err); alert('Unpin failed'); }
            });
          }

          if(deleteBtn){
            deleteBtn.addEventListener('click', async ()=>{ if(!confirm('Delete this announcement?')) return; try{ const tx4 = db.transaction([ANNOUNCEMENTS_STORE],'readwrite'); const store4 = tx4.objectStore(ANNOUNCEMENTS_STORE); const req4 = store4.delete(a.id); await new Promise((res,rej)=>{ req4.onsuccess=()=>res(); req4.onerror=()=>rej(req4.error); }); await new Promise((res,rej)=>{ tx4.oncomplete=()=>res(); tx4.onerror=()=>rej(tx4.error); }); row.remove(); try{ refreshList(); }catch(e){} loadAnnouncement(); }catch(err){ console.error('Delete failed', err); alert('Delete failed'); } });
          }
        });

        pin.addEventListener('click', async ()=>{
          try{ const tx2 = db.transaction([ANNOUNCEMENTS_STORE],'readwrite'); const store2 = tx2.objectStore(ANNOUNCEMENTS_STORE); const rec = Object.assign({}, a); rec.pinned = !rec.pinned; if(rec.pinned) rec.pinnedAt = new Date().toISOString(); else delete rec.pinnedAt; rec.updatedAt = new Date().toISOString(); const req2 = store2.put(rec); await new Promise((res,rej)=>{ req2.onsuccess=()=>res(req2.result); req2.onerror=()=>rej(req2.error); }); await new Promise((res,rej)=>{ tx2.oncomplete=()=>res(); tx2.onerror=()=>rej(tx2.error); }); // refresh
              // update label
              pin.textContent = rec.pinned ? 'Unpin' : 'Pin';
              try{ refreshList(); }catch(e){}
              loadAnnouncement();
          }catch(err){ console.error('Pin failed', err); alert('Pin failed'); }
        });

        del.addEventListener('click', async ()=>{ if(!confirm('Delete this announcement?')) return; try{ const tx2 = db.transaction([ANNOUNCEMENTS_STORE],'readwrite'); const store2 = tx2.objectStore(ANNOUNCEMENTS_STORE); const req2 = store2.delete(a.id); await new Promise((res,rej)=>{ req2.onsuccess=()=>res(); req2.onerror=()=>rej(req2.error); }); await new Promise((res,rej)=>{ tx2.oncomplete=()=>res(); tx2.onerror=()=>rej(tx2.error); }); row.remove(); loadAnnouncement(); }catch(err){ console.error('Delete failed', err); alert('Delete failed'); } });

        // after removing or changing via del handler above, ensure modal list also refreshed
        // the del handler will call loadAnnouncement(); refreshList will be used elsewhere

        return row;
      }

      for(const a of sorted){ list.appendChild(buildRow(a)); }

      modal.appendChild(list);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      function close(){ try{ if(document.body.contains(overlay)) document.body.removeChild(overlay); }catch(e){} }
      closeBtn.addEventListener('click', close);
      overlay.addEventListener('click', (e)=>{ if(e.target === overlay) close(); });

      // new button
      newBtn.addEventListener('click', ()=>{
        // Prevent creating multiple unsaved new rows. If one exists, focus its textarea.
        const existing = list.querySelector('[data-new="1"]');
        if(existing){ try{ const ta = existing.querySelector('textarea'); if(ta){ ta.focus(); } }catch(e){} return; }
        const newRec = { id: generateId(), text: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pinned: false };
        // open in editor mode appended to top
        const r = buildRow(newRec);
        // insert editor immediately
        list.insertBefore(r, list.firstChild);
        // immediately trigger edit (find the Edit button inside the row)
        const editBtn = Array.from(r.querySelectorAll('button')).find(b=> b.textContent === 'Edit');
        if(editBtn) editBtn.click();
      });

      // focus if requested
      if(focusId){ const el = Array.from(list.children).find(n=>{ const txt = n.querySelector('div') && n.querySelector('div').textContent; return txt && txt.indexOf(String(focusId))>-1; }); }
    }catch(err){ console.error('Open announcements modal failed', err); alert('Failed to open announcements'); }
  }

  async function editAnnouncement(){
    if(!announcementContent) return;
    // If the page includes the inline textarea editor (ToDos.php), use it instead of prompt
    const textarea = document.getElementById('announcementTextarea');
    const editArea = document.getElementById('announcementEditArea');
    const editBtn = document.getElementById('editAnnouncementBtn');
    if(textarea && editArea && editBtn){
      // show editor
      textarea.value = announcementContent.textContent.trim() === '(no announcement)' ? '' : announcementContent.textContent.trim();
      editArea.style.display = '';
      announcementContent.style.display = 'none';
      editBtn.style.display = 'none';

      const saveBtn = document.getElementById('saveAnnouncementBtn');
      const cancelBtn = document.getElementById('cancelAnnouncementBtn');

      saveBtn.onclick = async function(){
        const newText = textarea.value;
        try{
          // ensure store exists
          if(!db.objectStoreNames.contains(ANNOUNCEMENTS_STORE)){
            const newVersion = db.version + 1; db.close();
            await new Promise((resolve,reject)=>{
              const req = indexedDB.open(DB_NAME, newVersion);
              req.onupgradeneeded = (e)=>{ const idb = e.target.result; if(!idb.objectStoreNames.contains(ANNOUNCEMENTS_STORE)) idb.createObjectStore(ANNOUNCEMENTS_STORE, { keyPath: 'id', autoIncrement: true }); };
              req.onsuccess = (e)=>{ db = e.target.result; resolve(db); };
              req.onerror = (e)=> reject(e.target.error);
            });
          }
          const tx = db.transaction([ANNOUNCEMENTS_STORE],'readwrite');
          const store = tx.objectStore(ANNOUNCEMENTS_STORE);
          const allReq = store.getAll();
          const items = await new Promise((res,rej)=>{ allReq.onsuccess=()=>res(allReq.result); allReq.onerror=()=>rej(allReq.error); });
          if(items && items.length>0){
            const rec = items[items.length-1];
            rec.text = newText;
            rec.updatedAt = new Date().toISOString();
            const putReq = store.put(rec);
            await new Promise((res,rej)=>{ putReq.onsuccess=()=>res(putReq.result); putReq.onerror=()=>rej(putReq.error); });
          } else {
            const addReq = store.add({ text: newText, createdAt: new Date().toISOString() });
            await new Promise((res,rej)=>{ addReq.onsuccess=()=>res(addReq.result); addReq.onerror=()=>rej(addReq.error); });
          }
          await new Promise((res,rej)=>{ tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); });
          loadAnnouncement();
        }catch(err){ console.error('Edit announcement failed', err); alert('Save announcement failed'); }
        // hide editor
        editArea.style.display = 'none';
        announcementContent.style.display = '';
        editBtn.style.display = '';
      };

      cancelBtn.onclick = function(){
        editArea.style.display = 'none';
        announcementContent.style.display = '';
        editBtn.style.display = '';
      };

      return;
    }

    // fallback: prompt-based editor (older pages)
    const cur = announcementContent.textContent || '';
    const newText = prompt('Edit announcement', cur==='(no announcement)' ? '' : cur);
    if(newText === null) return;
    try{
      // ensure store exists
      if(!db.objectStoreNames.contains(ANNOUNCEMENTS_STORE)){
        // reopen DB to create the store
        const newVersion = db.version + 1; db.close();
        await new Promise((resolve,reject)=>{
          const req = indexedDB.open(DB_NAME, newVersion);
          req.onupgradeneeded = (e)=>{ const idb = e.target.result; if(!idb.objectStoreNames.contains(ANNOUNCEMENTS_STORE)) idb.createObjectStore(ANNOUNCEMENTS_STORE, { keyPath: 'id', autoIncrement: true }); };
          req.onsuccess = (e)=>{ db = e.target.result; resolve(db); };
          req.onerror = (e)=> reject(e.target.error);
        });
      }
      const tx = db.transaction([ANNOUNCEMENTS_STORE],'readwrite');
      const store = tx.objectStore(ANNOUNCEMENTS_STORE);
      const allReq = store.getAll();
      const items = await new Promise((res,rej)=>{ allReq.onsuccess=()=>res(allReq.result); allReq.onerror=()=>rej(allReq.error); });
      if(items && items.length>0){
        const rec = items[items.length-1];
        rec.text = newText;
        rec.updatedAt = new Date().toISOString();
        const putReq = store.put(rec);
        await new Promise((res,rej)=>{ putReq.onsuccess=()=>res(putReq.result); putReq.onerror=()=>rej(putReq.error); });
      } else {
        const addReq = store.add({ text: newText, createdAt: new Date().toISOString() });
        await new Promise((res,rej)=>{ addReq.onsuccess=()=>res(addReq.result); addReq.onerror=()=>rej(addReq.error); });
      }
      await new Promise((res,rej)=>{ tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); });
      loadAnnouncement();
    }catch(err){ console.error('Edit announcement failed', err); alert('Save announcement failed'); }
  }

  async function editTask(item){
    // open a simple prompt to edit content or tags if allowed
  if(item.status !== null){ alert('Tasks with a status cannot be edited'); return; }
  const newTag = prompt('Edit tag (single: RV, R1/R2, RT — leave empty for none)', item.tag||'');
  if(newTag===null) return;
  const newContent = prompt('Edit task text (leave empty if using KPS reference)', item.content||'');
  const newKps = prompt('Edit referenced KPS id (leave empty for none)', item.kpsId||'');
  if(newContent===null) return;
  item.tag = newTag.trim()||null;
  item.content = newContent.trim()||null;
  item.kpsId = newKps.trim()||null;
    item.updatedAt = new Date().toISOString();
    try{
  const tx = db.transaction([DAILY_STORE],'readwrite');
      const store = tx.objectStore(DAILY_STORE);
      const req = store.put(item);
      await new Promise((res,rej)=>{ req.onsuccess=()=>res(); req.onerror=()=>rej(req.error); });
      renderTasksForDate(item.date);
  }catch(err){ console.error('Update failed',err); alert('Update failed'); }
  }

  async function deleteTask(item){
    if(item.status !== null){ alert('Tasks with status cannot be deleted'); return; }
  if(!confirm('Confirm delete this task?')) return;
    try{
      const tx = db.transaction([DAILY_STORE],'readwrite');
      const store = tx.objectStore(DAILY_STORE);
      const req = store.delete(item.id);
      await new Promise((res,rej)=>{ req.onsuccess=()=>res(); req.onerror=()=>rej(req.error); });
      renderTasksForDate(item.date);
  }catch(err){ console.error('Delete failed',err); alert('Delete failed'); }
  }



  // Ensure modal CSS for the random-task popup has been injected
  function ensureRandomModalStyle(){
    if(document.getElementById('kp-random-modal-style')) return;
    const css = `
    .kp-random-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:9999}
    .kp-random-modal{background:#fff;color:#222;padding:18px;border-radius:12px;max-width:520px;width:90%;box-shadow:0 14px 40px rgba(0,0,0,0.28);transform:translateY(10px) scale(.95);opacity:0;transition:transform 280ms cubic-bezier(.2,.9,.3,1),opacity 220ms ease}
    .kp-random-modal.show{transform:translateY(0) scale(1);opacity:1}
    .kp-random-modal h4{margin:0 0 8px 0;font-size:16px}
    .kp-random-meta{font-size:13px;color:#666;margin-bottom:8px}
  .kp-random-content{font-size:28px;line-height:1.3;color:#111;background:linear-gradient(90deg, rgba(255,255,255,0.0), rgba(250,250,250,0.0));padding:12px;border-radius:8px}
    .kp-random-actions{margin-top:12px;display:flex;gap:8px;justify-content:flex-end}
    .kp-random-close{padding:8px 12px;border-radius:8px;background: #3c9ff0ff;color: #fff;border:none;cursor:pointer}
    .kp-random-open-date{padding:8px 12px;border-radius:8px;background: #b85be0ff;color:#fff;border:none;cursor:pointer}
    .kp-random-open-date[disabled],.kp-random-close[disabled]{opacity:0.5;cursor:default}
    `;
    const s = document.createElement('style'); s.id = 'kp-random-modal-style'; s.textContent = css; document.head.appendChild(s);
  }

  function ensureAnimationStyles(){
    if(document.getElementById('daily-plans-animations')) return;
    // Keep animations snappy and under 0.8s (use ANIM_DUR here)
  const css = `
  /* container adjustments */
  #tasksList{position:relative; min-height: 180px;}
  .kp-anim-old,.kp-anim-new{position:absolute;inset:0;top:0;left:0;right:0;bottom:0;z-index:2}
  .kp-anim-old{transition:transform ${ANIM_DUR}ms cubic-bezier(.22,.9,.3,1),opacity ${Math.floor(ANIM_DUR*0.6)}ms ease}
  .kp-anim-new{transition:transform ${ANIM_DUR}ms cubic-bezier(.22,.9,.3,1),opacity ${Math.floor(ANIM_DUR*0.6)}ms ease}

  /* out -> old slides left */
  .kp-anim-old.out-left{transform:translateX(-100%);opacity:0}
  .kp-anim-old.out-right{transform:translateX(100%);opacity:0}

  /* in -> new starts off-canvas and moves to 0 */
  .kp-anim-new.in-from-right{transform:translateX(100%);opacity:0}
  .kp-anim-new.in-from-left{transform:translateX(-100%);opacity:0}
  .kp-anim-new.in{transform:translateX(0);opacity:1}

  /* subtle flash when content updated */
  .kp-flash{animation:kp-flash ${Math.floor(ANIM_DUR*0.6)}ms ease}
  @keyframes kp-flash{0%{filter:brightness(1.06)}50%{filter:brightness(1)}100%{filter:brightness(1.03)}}

  /* small button hover/active animations */
  button.small{transition:transform 160ms ease, box-shadow 160ms ease}
  button.small:active{transform:scale(0.98)}
  /* addControls slide/fade */
  .add-controls{overflow:hidden;transition:max-height 420ms ease,opacity 360ms ease;padding-top:0;position:relative;z-index:1}
  .add-controls.collapsed{max-height:0;opacity:0;padding-top:0}
  .add-controls.expanded{max-height:800px;opacity:1;padding-top:12px}
  /* Ensure edit/add headers sit above the animated wrappers */
  #editTaskHeader{position:relative;z-index:3}
  #addControls{position:relative;z-index:1}
  `;
    const s = document.createElement('style'); s.id = 'daily-plans-animations'; s.textContent = css; document.head.appendChild(s);
  }

  // Transition-render helper for date changes
  async function transitionToDate(newDateStr, prevDateStr){
    // If animations are disabled by preference, fall back to immediate render
   if(!shouldAnimate()){ await renderTasksForDate(newDateStr); lastRenderedDate = newDateStr; return; }

    // If a transition is already running, queue the latest request and return
    if(isTransitioning){
      // if already queued for same date or date already rendered, ignore
      if(pendingDate === newDateStr || newDateStr === lastRenderedDate) return;
      pendingDate = newDateStr;
      return;
    }
    isTransitioning = true;

    ensureAnimationStyles();

    // preserve container height to avoid layout collapse which can cause overlapping
    try{ const prevH = Math.max(tasksList.getBoundingClientRect().height, tasksList.offsetHeight || 0); if(prevH > 0) tasksList.style.minHeight = prevH + 'px'; }catch(e){}

    // 修正 prev 逻辑，确保 prev 和 newDateStr 不会相等
    let prev = prevDateStr;
    if(!prev) {
      if(lastRenderedDate && lastRenderedDate !== newDateStr) prev = lastRenderedDate;
      else {
        // fallback: 用 newDateStr 的前一天
        const d = new Date(newDateStr); d.setDate(d.getDate()-1); prev = d.toISOString().slice(0,10);
      }
    }
    // 统一日期格式
    const prevDay = new Date(prev); prevDay.setHours(0,0,0,0);
    const newDay = new Date(newDateStr); newDay.setHours(0,0,0,0);
    const cmp = newDay - prevDay;
    let direction = 'none';
    if(cmp > 0) direction = 'left'; else if(cmp < 0) direction = 'right';
    // debug log
    // console.log('transitionToDate:', {prev, newDateStr, cmp, direction});

    // get existing content snapshot
    const existingHTML = tasksList.innerHTML;
    // create old wrapper
    const oldWrap = document.createElement('div'); oldWrap.className = 'kp-anim-old'; oldWrap.innerHTML = existingHTML || '<div style="padding:12px">(loading)</div>';
    // clear the list and append oldWrap
    tasksList.innerHTML = '';
    tasksList.appendChild(oldWrap);

    // set initial state and trigger out animation
    // choose out-left or out-right based on direction
    if(direction === 'left') oldWrap.classList.add('out-left');
    else if(direction === 'right') oldWrap.classList.add('out-right');
    else { /* no sliding: fade out quickly */ oldWrap.style.transition = 'opacity 220ms ease'; oldWrap.style.opacity = '0'; }

    // kick off render for new date in the background
    const renderPromise = renderTasksForDate(newDateStr);
    // Let the out animation start and start rendering
    await new Promise(res=>setTimeout(res, 16));
    await renderPromise;

    // find newly added content (should be the first child that is not oldWrap)
    const children = Array.from(tasksList.children);
    let newChild = children.find(c=> c !== oldWrap) || tasksList.firstElementChild;
    let newWrap = null;
    if(newChild){
      // wrap newChild into a .kp-anim-new container so we can animate from off-canvas
      newWrap = document.createElement('div'); newWrap.className = 'kp-anim-new';
      newWrap.appendChild(newChild);
      tasksList.appendChild(newWrap);

      // set initial position based on direction
      if(direction === 'left') newWrap.classList.add('in-from-right');
      else if(direction === 'right') newWrap.classList.add('in-from-left');
      else { newWrap.style.opacity = '0'; }

      // force reflow then animate in
      requestAnimationFrame(()=>{ newWrap.classList.add('in'); });
    } else {
      // no new child found: just remove oldWrap
      try{ oldWrap.remove(); }catch(e){}
    }

    // keep a brief flash to hint update
    tasksList.classList.add('kp-flash'); setTimeout(()=> tasksList.classList.remove('kp-flash'), 500);

    // lastRenderedDate 应在动画完成后再更新
    (function waitForAnimationFinish(oldEl, newEl){
      const dur = ANIM_DUR;
      let oldDone = !oldEl; // if missing, treat as done
      let newDone = !newEl;
      const onEnd = function(e){
        // only care about transform or opacity transitions
        if(e.propertyName !== 'transform' && e.propertyName !== 'opacity') return;
        if(e.currentTarget === oldEl) oldDone = true;
        if(e.currentTarget === newEl) newDone = true;
        if(oldDone && newDone) finish();
      };
      const cleanupTimer = setTimeout(finish, dur + 220);
      function finish(){
        clearTimeout(cleanupTimer);
        try{ if(oldEl && tasksList.contains(oldEl)) tasksList.removeChild(oldEl); }catch(e){}
        try{ tasksList.style.minHeight = ''; }catch(e){}
        isTransitioning = false;
        if(oldEl) oldEl.removeEventListener('transitionend', onEnd);
        if(newEl) newEl.removeEventListener('transitionend', onEnd);
        // process a pending request if any
        lastRenderedDate = newDateStr;
        if(pendingDate && pendingDate !== lastRenderedDate){ const pd = pendingDate; pendingDate = null; transitionToDate(pd, lastRenderedDate).catch(()=>{}); }
      }
      if(oldEl) oldEl.addEventListener('transitionend', onEnd);
      if(newEl) newEl.addEventListener('transitionend', onEnd);
    })(oldWrap, newWrap);
  }

  // Show a modal with a random unfinished task (status === null). If none on any date, show message.
  async function showRandomUnfinishedTask(){
    ensureRandomModalStyle();
    try{
      const tx = db.transaction([DAILY_STORE],'readonly');
      const store = tx.objectStore(DAILY_STORE);
      const req = store.getAll();
      const all = await new Promise((res,rej)=>{ req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); });
      const unfinished = (all||[]).filter(i=> i.status === null);
  // choose only from the currently selected date (no fallback)
  const selectedDate = planDate && planDate.value ? planDate.value : formatDateLocal(new Date());
  let pool = unfinished.filter(i=> i.date === selectedDate);
      // Build modal with improved actions (close + open-date)
      const overlay = document.createElement('div'); overlay.className = 'kp-random-overlay';
      const modal = document.createElement('div'); modal.className = 'kp-random-modal';
      modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true');
      const title = document.createElement('h4'); title.textContent = 'Random task'; modal.appendChild(title);
      const meta = document.createElement('div'); meta.className = 'kp-random-meta';
      const content = document.createElement('div'); content.className = 'kp-random-content';
      let pick = null;
      if(!pool || pool.length===0){ meta.textContent = ''; content.textContent = 'No unfinished tasks for the selected date.'; }
      else{
        pick = pool[Math.floor(Math.random()*pool.length)];
        const kpName = pick.kpsId ? (kpsCache[pick.kpsId] ? kpsCache[pick.kpsId].name : pick.kpsId) : null;
        meta.textContent = `Date: ${pick.date} • Category: ${pick.category} • Tag: ${pick.tag || '-'}`;
        if(kpName && pick.content){ content.textContent = `[${kpName}] (${pick.content})`; }
        else if(kpName){ content.textContent = `[${kpName}]`; }
        else if(pick.content){ content.textContent = pick.content; }
        else content.textContent = '>>Unnamed task<<';
      }
      modal.appendChild(meta); modal.appendChild(content);
      const actions = document.createElement('div'); actions.className = 'kp-random-actions';
      const close = document.createElement('button'); close.className = 'kp-random-close'; close.textContent = 'Close';

      // remove overlay and cleanup
      function removeOverlay(){
        try{ if(document.body.contains(overlay)) document.body.removeChild(overlay); }catch(e){}
        document.removeEventListener('keydown', onKeyDown);
      }
      close.addEventListener('click', ()=>{ removeOverlay(); });
      actions.appendChild(close);
      modal.appendChild(actions);
      overlay.addEventListener('click', (e)=>{ if(e.target === overlay){ removeOverlay(); } });
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      // close on Escape
      function onKeyDown(e){ if(e.key === 'Escape' || e.key === 'Esc'){ removeOverlay(); } }
      document.addEventListener('keydown', onKeyDown);
      // trigger animate show and focus the primary action
      requestAnimationFrame(()=>{ modal.classList.add('show'); close.focus(); });
    }catch(err){ console.error('Show random task failed', err); alert('Error: '+err.message); }
  }

  // init
(async function(){
    try {
        setDefaultDate();
        updateWeekdayDisplay(planDate.value);

        await openDB();
        await loadAppConfig();
        if (!appConfig) {
            // 如果没有配置，创建一个空配置避免后续错误
            appConfig = { subjects: [] };
        }
        renderCategoryRadios(); // 动态生成学科 radio
        await loadKPs();

        // 监听学科 radio 变化，刷新 KPs 下拉
        document.addEventListener('change', (e) => {
            if (e.target && e.target.name === 'categoryRad') {
                refreshKpsSelectForCategory();
            }
        });

        // 初次渲染任务
        const initialCount = await renderTasksForDate(planDate.value);
        if (initialCount === 0 && addControls && addControls.style.display === 'none') {
            addControls.style.display = 'block';
            if (toggleAddBtn) toggleAddBtn.textContent = 'Close';
        }
        lastRenderedDate = planDate.value;

        // 加载公告和 Flawless
        loadAnnouncement();
        try { await loadFlawlessForDate(planDate.value); } catch (e) {}

        // ==================== 事件绑定 ====================
        addBtn.addEventListener('click', addTask);

        // 动画偏好按钮（三态切换：auto / force / off）
        loadAnimationPreference();
        try {
            const animBtn = document.createElement('button');
            animBtn.id = 'animToggleBtn'; animBtn.type = 'button'; animBtn.className = 'small'; animBtn.style.marginLeft = '8px';
            animBtn.setAttribute('aria-label','Animation preference');
            function updateAnimBtn() {
                if (animationPreference === 'force') {
                    animBtn.textContent = '✅'; animBtn.title = 'Animations: forced (always)'; animBtn.style.background = '#69d26eff'; animBtn.style.color = '#fff';
                } else if (animationPreference === 'off') {
                    animBtn.textContent = '❌'; animBtn.title = 'Animations: off'; animBtn.style.background = '#e24c4cff'; animBtn.style.color = '#fff';
                } else {
                    animBtn.textContent = '◻️'; animBtn.title = 'Animations: device default'; animBtn.style.background = ''; animBtn.style.color = '';
                }
            }
            animBtn.addEventListener('click', () => {
                if (animationPreference === 'auto') animationPreference = 'force';
                else if (animationPreference === 'force') animationPreference = 'off';
                else animationPreference = 'auto';
                saveAnimationPreference();
                updateAnimBtn();
            });
            updateAnimBtn();
            addBtn.insertAdjacentElement('afterend', animBtn);

            // Quick phrases 管理按钮
            const quickBtn = document.createElement('button');
            quickBtn.id = 'quickPhrasesBtn'; quickBtn.type = 'button'; quickBtn.className = 'small'; quickBtn.style.marginLeft = '8px';
            quickBtn.textContent = 'Quick'; quickBtn.title = 'Manage quick phrases';
            animBtn.insertAdjacentElement('afterend', quickBtn);
            quickBtn.addEventListener('click', (e) => { e.preventDefault(); showQuickPhrasesModal(); });

            // 为 textContent 绑定快速短语功能
            attachQuickHandlers(textContent);
        } catch (e) { /* ignore UI creation errors */ }

        // 日期选择器变化
        planDate.addEventListener('change', async () => {
            const prev = lastRenderedDate || planDate.value;
            updateWeekdayDisplay(planDate.value);
            await transitionToDate(planDate.value, prev);
            // 如果新日期没有任务，自动展开添加面板
            if (tasksList.innerHTML.includes('No tasks')) {
                if (addControls && addControls.style.display === 'none') {
                    addControls.style.display = 'block';
                    if (toggleAddBtn) toggleAddBtn.textContent = 'Cancel';
                }
            }
            try { await loadFlawlessForDate(planDate.value); } catch (e) {}
        });

        // 刷新按钮（如果存在）
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadKPs();
                renderTasksForDate(planDate.value);
            });
        }

        // 添加任务面板的切换按钮（带动画）
        if (toggleAddBtn && addControls) {
            addControls.classList.add('add-controls');
            if (addControls.style.display === 'none') {
             //   addControls.classList.add('collapsed');
                addControls.classList.remove('expanded');
            } else {
                addControls.classList.add('expanded');
              //  addControls.classList.remove('collapsed');
            }
            toggleAddBtn.addEventListener('click', () => {
                if (!shouldAnimate()) {
                    if (addControls.style.display === 'none') {
                        addControls.style.display = 'block';
                        toggleAddBtn.textContent = 'Cancel';
                    } else {
                        addControls.style.display = 'none';
                        toggleAddBtn.textContent = 'Add Task';
                    }
                    return;
                }
                ensureAnimationStyles();
                if (addControls.classList.contains('expanded') || addControls.style.display !== 'none') {
                    addControls.classList.remove('expanded');
              //      addControls.classList.add('collapsed');
                    toggleAddBtn.textContent = 'Add Task';
                    setTimeout(() => {
                        try { if (addControls.classList.contains('collapsed')) addControls.style.display = 'none'; } catch (e) {}
                    }, 480);
                } else {
                    addControls.style.display = 'block';
                    requestAnimationFrame(() => {
                        //addControls.classList.remove('collapsed');
                        addControls.classList.add('expanded');
                    });
                    toggleAddBtn.textContent = 'Cancel';
                }
            });
        }

        // 公告编辑按钮（显示全部公告弹窗）
        if (editAnnouncementBtn) {
            editAnnouncementBtn.addEventListener('click', () => showAnnouncementsModal());
        }

        // Custom tag input show/hide handler
        const customTagInput = document.getElementById('customTagInput');
        if (customTagInput && tagRadios) {
            tagRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (radio.value === '' && radio.checked) {
                        customTagInput.style.display = 'block';
                        customTagInput.focus();
                    } else if (radio.checked) {
                        customTagInput.style.display = 'none';
                    }
                });
            });
        }

        // 任务编辑开关按钮及随机任务按钮
        if (toggleEditTasksBtn) {
            toggleEditTasksBtn.addEventListener('click', () => {
                showEditButtons = !showEditButtons;
                toggleEditTasksBtn.textContent = showEditButtons ? 'Done Edits' : 'Edit';
                renderTasksForDate(planDate.value);
            });

            // 随机未完成任务按钮
            try {
                const randomBtn = document.createElement('button');
                randomBtn.id = 'randomTaskBtn'; randomBtn.className = 'small'; randomBtn.style.marginLeft = '8px';
                randomBtn.style.background = '#ac55d2ff'; randomBtn.style.color = '#fff';
                randomBtn.textContent = 'Random';
                randomBtn.title = 'Show a random task that is not completed yet';
                toggleEditTasksBtn.insertAdjacentElement('afterend', randomBtn);
                randomBtn.addEventListener('click', (e) => { e.preventDefault(); showRandomUnfinishedTask(); });
            } catch (e) {}
        }

        // 取消编辑按钮
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => cancelEditing());
        }

        // 前一天 / 后一天按钮
        prevDayBtn.addEventListener('click', async () => {
            const d = new Date(planDate.value);
            d.setDate(d.getDate() - 1);
            const newDate = formatDateLocal(d);
            planDate.value = newDate;
            updateWeekdayDisplay(newDate);
            await transitionToDate(newDate, lastRenderedDate || formatDateLocal(new Date(new Date().setDate(new Date().getDate() + 1))));
            if (tasksList.innerHTML.includes('No tasks')) {
                if (addControls && addControls.style.display === 'none') {
                    addControls.style.display = 'block';
                    if (toggleAddBtn) toggleAddBtn.textContent = 'Cancel';
                }
            }
            try { await loadFlawlessForDate(planDate.value); } catch (e) {}
        });

        nextDayBtn.addEventListener('click', async () => {
            const d = new Date(planDate.value);
            d.setDate(d.getDate() + 1);
            const newDate = formatDateLocal(d);
            planDate.value = newDate;
            updateWeekdayDisplay(newDate);
            await transitionToDate(newDate, lastRenderedDate || formatDateLocal(new Date()));
            if (tasksList.innerHTML.includes('No tasks')) {
                if (addControls && addControls.style.display === 'none') {
                    addControls.style.display = 'block';
                    if (toggleAddBtn) toggleAddBtn.textContent = 'Cancel';
                }
            }
            try { await loadFlawlessForDate(planDate.value); } catch (e) {}
        });

    } catch (err) {
        console.error('Initialization failed', err);
        alert('Initialization failed, check console');
    }
})();

})();
