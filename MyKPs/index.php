<?php
if (!isset($_GET['kps'])) {
    /*
    header('Location: ToDos.php', true, 302);
    exit;
    */
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
    echo '<title>MyKPs — landing</title>';
    echo '<link rel="shortcut icon" href="MyKPs.ico" type="image/vnd.microsoft.icon">
<link rel="icon" href="MyKPs.ico" type="image/vnd.microsoft.icon">
<style>body{font-family:Arial,Helvetica,sans-serif;background:#f5f5f5;padding:24px} .box{max-width:800px;margin:0 auto;background:#fff;padding:18px;border-radius:8px} a{color:#1976D2}</style>';
    echo '</head><body><div class="box"><h1>MyKPs</h1><p>Prefer the Tasks view? Click below:</p>';
    echo '<p><a href="ToDos.php">Open Tasks (ToDos.php)</a></p>';
    echo '<p>Or open KPs view directly: <a href="?kps=1">Open KPs</a></p>';
    echo '<p>If you expected an automatic redirect but see this page, try a hard reload (Ctrl+F5) or clear site data. Service worker caching may be active.</p>';
    echo '<script>if(window.location.search.indexOf("kps")===-1){window.location.href="ToDos.php";}</script>';
    echo '</div></body></html>';
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link rel="manifest" href="/MyKPs/manifest.json">
    <link rel="shortcut icon" href="MyKPs.ico" type="image/vnd.microsoft.icon">
    <link rel="icon" href="MyKPs.ico" type="image/vnd.microsoft.icon">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KPs Do</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 14px; margin: 15px; background-color: #f5f5f5; }
        .container { max-width: 1000px; margin: 0 auto; background-color: #fff; padding: 15px; border-radius: 6px; box-shadow: 0 1px 5px rgba(0,0,0,0.1); }
        h1 { text-align: center; color: #333; font-size: 1.5em; margin-top: 10px; margin-bottom: 15px; }
        .button-group { text-align: center; margin-bottom: 15px; }
        button { padding: 6px 12px; font-size: 14px; margin: 0 5px; background-color: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer; }
        button:hover { background-color: #45a049; }
        #importBtn { background-color: #FF9800; } #importBtn:hover { background-color: #F57C00; }
        #exportBtn { background-color: #2196F3; } #exportBtn:hover { background-color: #1976D2; }
        #cleara { background-color: red; }
        #viewLogBtn { background-color: #9c27b0; } #viewLogBtn:hover { background-color: #7b1fa2; }
        #manageBtn { background-color: #673AB7; } #manageBtn:hover { background-color: #512DA8; }
        #fileInput { display: none; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 6px 5px; text-align: left; vertical-align: top; word-wrap: break-word; }
        th { background-color: #e0e0e0; font-weight: bold; text-align: center; font-size: 0.9em; }
        tr:nth-child(even) { background-color: #f9f9f9; }

        .topic-item { position: relative; cursor: pointer; user-select: none; padding: 4px 5px; margin-bottom: 3px; border-radius: 3px; transition: background-color 0.15s; background-color: #ffffff; border: 1px solid transparent; font-size: 0.9em; }
        .topic-item:last-child { margin-bottom: 0; }
        .topic-item:hover { border: 1px solid #90a4ae; background-color: #eceff1 !important; }
        .click-info { font-size: 0.75em; color: #78909c; display: inline-block; margin-left: 6px; }
        .click-count::before { content: "("; } .click-count::after { content: ")"; }

        .item-block-base, .urgent-item, .all-item { display: inline-block; margin-right: 10px; margin-bottom: 5px; padding: 3px 7px; border-radius: 3px; font-size: 0.85em; border: 1px solid; }
        .urgent-item { background-color: #ffebee; border-color: #ffcdd2; color: #c62828; }
        .all-item { background-color: #ffffff; border-color: #ccc; color: #333; }
        .status-default { background-color: #ffcdd2; border-color: #ef9a9a; color: #b71c1c; }
        .status-green { background-color: #c8e6c9; border-color: #a5d6a7; color: #2e7d32; }
        .status-yellow { background-color: #fff9c4; border-color: #fff59d; color: #f9a825; }
        .status-red { background-color: #ffebee; border-color: #ffcdd2; color: #c62828; }

        /* 拖拽样式 */
        .dragging { opacity: 0.5; }
        .drag-over { border: 2px dashed #673AB7 !important; }

        #logModal, #cloudModal, #manageModal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4); }
        .modal-content, .cloud-modal-content {     display: flex;
    flex-direction: column;
    max-height: 80vh;background-color: #fefefe; margin: 5% auto; padding: 15px; border: 1px solid #888; width: 80%; max-width: 800px; max-height: 80vh; overflow-y: auto; border-radius: 5px; position: relative; }
        .close { color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer; }
        .close:hover, .close:focus { color: black; }
        .manage-subject { border: 1px solid #ccc; margin: 10px 0; padding: 10px; background: #fafafa; }
        .manage-topic { display: flex; align-items: center; gap: 5px; margin: 4px 0; padding: 4px; background: #fff; border: 1px solid #eee; cursor: grab; }
        .manage-topic.dragging { opacity: 0.4; }
        .manage-subject-header { display: flex; align-items: center; gap: 10px; cursor: grab; }
        .manage-subject-header.dragging { opacity: 0.4; }
        .manage-subject .topicsList { display: none; }
        .manage-subject.expanded .topicsList { display: block; }
        .manage-modal-footer { left: 0; right: 0; bottom: 0; padding: 10px; background: #fefefe; border-top: 1px solid #ddd; display: flex; justify-content: center; gap: 10px; z-index: 2; margin-top: auto; }
     #subjectList {
    flex: 1;           
    overflow-y: auto;   
    padding-bottom: 0;  
}
    </style>
</head>
<body>
<div class="container">
    <h1>KPs Do</h1>
    <div id="announcement" style="margin-bottom:15px;padding:10px;border:1px solid #ccc;border-radius:5px;background-color:#f0f8ff;text-align:center;font-size:14px;">
        <strong>Announcement</strong><br>
        Hi there!  <hr>
        <a href="ToDos.php">[任务表]</a> <a href="weekly-report.html" target="_blank">[学习周报]</a>
    </div>

    <div id="urgentSection">
        <h3>
            <span id="sectionTitle">To Deal with:</span>
            <span>
                <button id="showAllBtn" style="font-size:0.8em;padding:2px 6px;display:none;">Switch to All</button>
                <button id="showUrgentBtn" style="font-size:0.8em;padding:2px 6px;display:none;">Back</button>
            </span>
        </h3>
        <div id="urgentList"></div>
    </div>

    <div class="button-group">
        <button id="viewLogBtn">Log</button>
        <button id="cloudBtn">Cloud(old)</button>
        <button id="manageBtn">Manage Subjects</button>
        <input type="file" id="fileInput" accept=".json">
    </div>

    <table id="knowledgeTable"><thead></thead><tbody></tbody></table>

    <button id="initButton">(Re)Start</button>
    <button id="exportBtn">Export</button>
    <button id="importBtn">Import</button>
    <button id="cleara">CLEAR the DATA</button>
</div>

<!-- 日志弹窗 -->
<div id="logModal"><div class="modal-content">
    <span class="close">&times;</span><h2>Logs</h2><div id="logContent"></div>
</div></div>

<!-- 云存档弹窗-旧版全量同步 -->
<div id="cloudModal"><div class="cloud-modal-content">
    <span class="close" id="cloudClose">&times;</span><h2>Cloud Archive</h2>
    <div class="password-section">
        <label>Password: <input type="password" id="cloudPassword"></label>
    </div>
    <div class="comparison-section">
        <h3>Log Comparison</h3>
        <div style="display:flex; gap:20px;">
            <div style="flex:1"><h4>Local</h4><div id="localLogs"></div></div>
            <div style="flex:1"><h4>Server</h4><div id="serverLogs"></div></div>
        </div>
        <div style="text-align:center;margin:15px 0;">
            <button id="uploadBtn">↑Upload</button>
            <button id="downloadBtn">↓Download</button>
        </div>
    </div>
</div></div>

<!-- 管理弹窗 -->
<div id="manageModal"><div class="modal-content">
    <div style="display:flex;align-items:center;justify-content:flex-start;gap:10px;margin-bottom:8px;">
        <h2 style="margin:0;">Manage Subjects & Topics (Drag to reorder) 【应该没问题了修了好几次!!】</h2>
    </div>
    <button id="addSubjectBtn">+ Add Subject</button>
    <div id="subjectList"></div>
    <div class="manage-modal-footer">
        <button id="manageCloseFooter">Close</button>
        <button id="saveConfigBtn">Save & Apply</button>
    </div>
</div></div>

<button id="installButton" style="display:none;">PWA</button>

<script>
(function() {
    const ID_EPOCH = new Date('2016-06-01T00:00:00Z').getTime();
    let lastId = 0; // 用于防重

    function generateId() {
        const now = Date.now();
        let id = Math.floor((now - ID_EPOCH) / 100); 
        if (id <= lastId) {
            id = lastId + 1;
        }
        lastId = id;
        return id;
    }

    // 批量生成时调用，确保连续不重复
    function generateBatchIds(count) {
        const ids = [];
        let base = lastId;
        const now = Date.now();
        let timeId = Math.floor((now - ID_EPOCH) / 100);
        if (timeId <= base) base = timeId;
        else base = timeId;
        for (let i = 0; i < count; i++) {
            let newId = base + i;
            if (newId <= lastId) newId = lastId + 1 + i;
            ids.push(newId);
        }
        lastId = Math.max(lastId, ...ids);
        return ids;
    }

    const DB_NAME = 'MyKPs';
    const KPS_STORE = 'KPs';
    const LOGS_STORE = 'MyLearningLogs';
    const CONFIG_STORE = 'AppConfig';
    const DB_VERSION = 3;
    let db;
    let appConfig = null;

    function getDefaultConfig() {
        return {
            id: 'main',
            subjects: [
                   {
                    key: 'mysubject', displayName: 'My Subject',
                    kps: [
                        { id: 3167646856, name: 'MyFirstKPs' },
                        { id: 3167646857, name: 'MySecondKPs' }
                    ]
                }
            ]
        };
    }

    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = (e) => reject(e.target.error);
            request.onsuccess = (e) => {
                db = e.target.result;
                resolve(db);
            };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(KPS_STORE)) {
                    const store = db.createObjectStore(KPS_STORE, { keyPath: 'uniqueId' });
                    store.createIndex('subject', 'subject');
                    store.createIndex('KPsIndex', 'KPsIndex');
                }
                if (!db.objectStoreNames.contains(CONFIG_STORE)) {
                    db.createObjectStore(CONFIG_STORE, { keyPath: 'id' });
                }
  
    if (!db.objectStoreNames.contains('DailyPlans')) {
        const dailyStore = db.createObjectStore('DailyPlans', { keyPath: 'id', autoIncrement: true });
        dailyStore.createIndex('date', 'date', { unique: false });
    }

    if (!db.objectStoreNames.contains('Announcements')) {
        const annStore = db.createObjectStore('Announcements', { keyPath: 'id', autoIncrement: true });
        annStore.createIndex('pinnedAt', 'pinnedAt', { unique: false });
    }

    if (!db.objectStoreNames.contains('Flawless')) {
        const flawlessStore = db.createObjectStore('Flawless', { keyPath: 'id', autoIncrement: true });
        flawlessStore.createIndex('date', 'date', { unique: true });
    }

                const logStore = db.createObjectStore(LOGS_STORE, { keyPath: 'id' });
                logStore.createIndex('KPsId', 'KPsId');
                logStore.createIndex('timestamp', 'timestamp');
            };
        });
    }

    async function getConfig() {
        const tx = db.transaction([CONFIG_STORE], 'readonly');
        const store = tx.objectStore(CONFIG_STORE);
        const config = await new Promise((res, rej) => {
            const req = store.get('main');
            req.onsuccess = () => res(req.result);
            req.onerror = rej;
        });
        if (!config) {
            const defaultCfg = getDefaultConfig();
            const writeTx = db.transaction([CONFIG_STORE], 'readwrite');
            writeTx.objectStore(CONFIG_STORE).add(defaultCfg);
            await writeTx.complete;
            return defaultCfg;
        }
        return config;
    }

    async function getAllTopics() {
        const tx = db.transaction([KPS_STORE], 'readonly');
        const store = tx.objectStore(KPS_STORE);
        return new Promise((res, rej) => {
            const req = store.getAll();
            req.onsuccess = () => res(req.result);
            req.onerror = rej;
        });
    }

    async function renderTableAndUrgent() {
        if (!appConfig) appConfig = await getConfig();
        const allTopics = await getAllTopics();
        const topicsMap = {};
        allTopics.forEach(t => topicsMap[t.uniqueId] = t);

        const thead = document.querySelector('#knowledgeTable thead');
        thead.innerHTML = '<tr>' + appConfig.subjects.map(s => `<th>${s.displayName}</th>`).join('') + '</tr>';

        const maxRows = Math.max(...appConfig.subjects.map(s => s.kps.length));
        const tbody = document.querySelector('#knowledgeTable tbody');
        tbody.innerHTML = '';

        const now = new Date();
        const urgentTopics = [];

        for (let row = 0; row < maxRows; row++) {
            const tr = document.createElement('tr');
            appConfig.subjects.forEach(subj => {
                const td = document.createElement('td');
                const def = subj.kps[row];
                if (def) {
                    const data = topicsMap[def.id] || {
                        uniqueId: def.id,
                        subject: subj.key,
                        name: def.name,
                        clickCount: 0,
                        lastClicked: new Date(0).toISOString()
                    };
                    const div = document.createElement('div');
                    div.className = 'topic-item';
                    div.dataset.uniqueId = data.uniqueId;
                    const status = getStatusClass(data.lastClicked, now);
                    div.classList.add(status);
                    div.innerHTML = `<span class="topic-name">${data.name}</span><span class="click-info"><span class="click-count">${data.clickCount||0}</span></span>`;
                    div.addEventListener('click', () => handleClick(data.uniqueId, data.name));
                    td.appendChild(div);
                    if (status === 'status-red' || status === 'status-default') {
                        urgentTopics.push({
                            uniqueId: data.uniqueId,
                            name: data.name,
                            subject: subj.key,
                            lastClicked: new Date(data.lastClicked),
                            clickCount: data.clickCount || 0
                        });
                    }
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        }

        const urgentDiv = document.getElementById('urgentList');
        urgentDiv.innerHTML = '';
        if (urgentTopics.length) {
            urgentTopics.sort((a,b) => a.lastClicked - b.lastClicked || b.clickCount - a.clickCount);
            const grouped = {};
            urgentTopics.forEach(t => {
                if (!grouped[t.subject]) grouped[t.subject] = [];
                grouped[t.subject].push(t);
            });
            for (const [subjKey, topics] of Object.entries(grouped)) {
                const subjCfg = appConfig.subjects.find(s => s.key === subjKey);
                const header = document.createElement('div');
                header.textContent = subjCfg ? subjCfg.displayName : subjKey;
                header.style.fontWeight = 'bold';
                urgentDiv.appendChild(header);
                const listDiv = document.createElement('div');
                topics.forEach(t => {
                    const span = document.createElement('span');
                    span.className = 'urgent-item';
                    span.textContent = `${t.name} (${t.clickCount})`;
                    listDiv.appendChild(span);
                });
                urgentDiv.appendChild(listDiv);
            }
        } else {
            urgentDiv.textContent = 'All KPs is DONE !!';
        }
    }

    function getStatusClass(lastClickedISO, now) {
        if (!lastClickedISO || new Date(lastClickedISO).getTime() === 0) return 'status-default';
        const diff = Math.abs(now - new Date(lastClickedISO));
        const days = Math.floor(diff / 86400000);
        if (days < 5) return 'status-green';
        if (days < 7) return 'status-yellow';
        return 'status-red';
    }

    async function displayAllTopicsView() {
        document.getElementById('sectionTitle').textContent = 'All KPs:';
        document.getElementById('showAllBtn').style.display = 'none';
        document.getElementById('showUrgentBtn').style.display = 'inline-block';
        if (!appConfig) appConfig = await getConfig();
        const allTopics = await getAllTopics();
        const topicsMap = {};
        allTopics.forEach(t => topicsMap[t.uniqueId] = t);

        const urgentDiv = document.getElementById('urgentList');
        urgentDiv.innerHTML = '';
        for (const subj of appConfig.subjects) {
            const header = document.createElement('div');
            header.textContent = subj.displayName;
            header.style.fontWeight = 'bold';
            urgentDiv.appendChild(header);
            const listDiv = document.createElement('div');
            subj.kps.forEach(def => {
                const t = topicsMap[def.id] || { clickCount: 0, name: def.name };
                const span = document.createElement('span');
                span.className = 'all-item';
                const status = getStatusClass(t.lastClicked, new Date());
                span.classList.add(status);
                span.innerHTML = `<span class="topic-name">${t.name}</span> <span class="click-count">${t.clickCount||0}</span>`;
                listDiv.appendChild(span);
            });
            urgentDiv.appendChild(listDiv);
        }
    }

    function displayUrgentTopics() {
        document.getElementById('sectionTitle').textContent = 'To Deal with:';
        document.getElementById('showAllBtn').style.display = 'inline-block';
        document.getElementById('showUrgentBtn').style.display = 'none';
        renderTableAndUrgent();
    }

    async function handleClick(uniqueId, KPsName) {
        if (!confirm(`Light up ${KPsName}?`)) return;
        const tx = db.transaction([KPS_STORE, LOGS_STORE], 'readwrite');
        const topicStore = tx.objectStore(KPS_STORE);
        const logStore = tx.objectStore(LOGS_STORE);
        const topic = await new Promise((res, rej) => {
            const req = topicStore.get(uniqueId);
            req.onsuccess = () => res(req.result);
            req.onerror = rej;
        });
        if (topic) {
            topic.clickCount = (topic.clickCount || 0) + 1;
            topic.lastClicked = new Date().toISOString();
            topicStore.put(topic);
            const logEntry = {
                id: generateId(),
                KPsId: uniqueId,
                KPsName,
                timestamp: new Date().toISOString()
            };
            logStore.add(logEntry);
            await tx.complete;
            displayUrgentTopics();
        } else {
            console.error('Topic not found:', uniqueId);
        }
    }

    // ================= 管理界面（拖拽） =================
    let editingConfig = null;
function syncEditingConfigFromDOM() {
    const subjDivs = document.querySelectorAll('#subjectList .manage-subject');
    subjDivs.forEach((div, i) => {
        const keyInput = div.querySelector('.subjKey');
        const displayInput = div.querySelector('.subjDisplay');
        if (keyInput) editingConfig.subjects[i].key = keyInput.value.trim();
        if (displayInput) editingConfig.subjects[i].displayName = displayInput.value.trim();

        const topicDivs = div.querySelectorAll('.manage-topic');
        editingConfig.subjects[i].kps = [];
        topicDivs.forEach(tDiv => {
            const nameInput = tDiv.querySelector('.topicName');
            const idSpan = tDiv.querySelector('.topicIdDisplay');
            if (idSpan && nameInput) {
                editingConfig.subjects[i].kps.push({
                    id: Number(idSpan.textContent.trim()),
                    name: nameInput.value.trim()
                });
            }
        });
    });
}
    function openManageModal() {
        editingConfig = JSON.parse(JSON.stringify(appConfig));
        renderManageUI();
        document.getElementById('manageModal').style.display = 'block';
    }

    function renderManageUI() {
        const container = document.getElementById('subjectList');
        // Store expanded states before re-rendering
        const expandedStates = {};
        container.querySelectorAll('.manage-subject').forEach((div, idx) => {
            if (div.classList.contains('expanded')) {
                expandedStates[idx] = true;
            }
        });
        
        container.innerHTML = '';
        editingConfig.subjects.forEach((subj, sIdx) => {
            const div = document.createElement('div');
            div.className = 'manage-subject';
            div.dataset.subjectIndex = sIdx;
            // Restore expanded state if it was previously expanded
            if (expandedStates[sIdx]) {
                div.classList.add('expanded');
            }
            div.innerHTML = `
                <div class="manage-subject-header" draggable="true">
                    <span class="drag-handle">☰</span>
                    <button class="toggleTopics" style="width:60px;margin-left:6px;">DoKPs</button>
                    <input class="subjKey" value="${subj.key}" style="width:100px;margin-left:6px;" placeholder="Key">
                    <input class="subjDisplay" value="${subj.displayName}" style="width:100px;" placeholder="Display">
                    <button class="deleteSubj">Delete</button>
                </div>
                <div class="topicsList" style="margin-top:8px;">
                    ${subj.kps.map((t, tIdx) => `
                        <div class="manage-topic" draggable="true" data-topic-index="${tIdx}">
                            <span class="drag-handle">☰</span>
                            <span class="topicIdDisplay" style="width:120px;">${t.id}</span>
                            <input class="topicName" value="${t.name}" style="width:150px;">
                            <button class="deleteTopic">Del</button>
                        </div>
                    `).join('')}
                    <button class="addTopic" style="margin-top:5px;">+ KPs</button>
                </div>
            `;

            // 学科头拖拽事件
            const header = div.querySelector('.manage-subject-header');
            header.addEventListener('dragstart', handleSubjectDragStart);
            header.addEventListener('dragover', (e) => e.preventDefault());
            header.addEventListener('drop', handleSubjectDrop);

            // 展开/折叠切换
            const toggleBtn = div.querySelector('.toggleTopics');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    div.classList.toggle('expanded');
                    toggleBtn.textContent = div.classList.contains('expanded') ? 'Hide' : 'DoKPs';
                });
            }

            // 知识点拖拽事件
            div.querySelectorAll('.manage-topic').forEach(topicDiv => {
                topicDiv.addEventListener('dragstart', handleTopicDragStart);
                topicDiv.addEventListener('dragover', (e) => e.preventDefault());
                topicDiv.addEventListener('drop', handleTopicDrop);
            });

            // 删除学科
            div.querySelector('.deleteSubj').onclick = () => {
                if (confirm('Delete this subject?')) {
                    syncEditingConfigFromDOM();
                    editingConfig.subjects.splice(sIdx, 1);
                    renderManageUI();
                }
            };

            // 添加知识点
            div.querySelector('.addTopic').onclick = () => {
                const newTopic = {
                    id: generateId(),
                    name: 'New KPs'
                };
                syncEditingConfigFromDOM();
                subj.kps.push(newTopic);
                renderManageUI();
            };

            // 删除知识点
            div.querySelectorAll('.deleteTopic').forEach(btn => {
                btn.onclick = function() {
                    const topicDiv = this.closest('.manage-topic');
                    const tIdx = parseInt(topicDiv.dataset.topicIndex);
                    syncEditingConfigFromDOM();
                    subj.kps.splice(tIdx, 1);
                    renderManageUI();
                };
            });

            container.appendChild(div);
        });
    }

    // 学科拖拽
    let draggedSubjectIndex = null;
    function handleSubjectDragStart(e) {syncEditingConfigFromDOM();
        draggedSubjectIndex = parseInt(this.closest('.manage-subject').dataset.subjectIndex);
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
    }
    function handleSubjectDrop(e) {
        e.preventDefault();
        this.classList.remove('dragging');
        const targetIndex = parseInt(this.closest('.manage-subject').dataset.subjectIndex);
        if (draggedSubjectIndex !== null && draggedSubjectIndex !== targetIndex) {
            const moved = editingConfig.subjects.splice(draggedSubjectIndex, 1)[0];
            editingConfig.subjects.splice(targetIndex, 0, moved);
            renderManageUI();
        }
        draggedSubjectIndex = null;
    }

    // 知识点拖拽
    let draggedTopicInfo = null;
function handleTopicDragStart(e) {syncEditingConfigFromDOM();
    const topicDiv = e.target.closest('.manage-topic'); // 总是拿到 .manage-topic
    if (!topicDiv) return; // 安全兜底

    const subjectDiv = topicDiv.closest('.manage-subject');
    draggedTopicInfo = {
        subjectIndex: parseInt(subjectDiv.dataset.subjectIndex),
        KPsIndex: parseInt(topicDiv.dataset.topicIndex)
    };
    topicDiv.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
}
   function handleTopicDrop(e) {
    e.preventDefault();
    const topicDiv = this;
    const targetSubjectIndex = parseInt(topicDiv.closest('.manage-subject').dataset.subjectIndex);
    const targetTopicIndex = parseInt(topicDiv.dataset.topicIndex);

    console.log('=== drop 开始 ===');
    console.log('draggedTopicInfo:', draggedTopicInfo);
    console.log('目标位置:', { targetSubjectIndex, targetTopicIndex });

    if (!draggedTopicInfo) {
        console.warn('draggedTopicInfo 为 null，终止');
        return;
    }

    if (draggedTopicInfo.subjectIndex === targetSubjectIndex &&
        draggedTopicInfo.KPsIndex === targetTopicIndex) {
        console.log('源位置与目标相同，无需移动');
        return;
    }

    const sourceSubj = editingConfig.subjects[draggedTopicInfo.subjectIndex];
    const movedTopic = sourceSubj.kps.splice(draggedTopicInfo.KPsIndex, 1)[0];
    const targetSubj = editingConfig.subjects[targetSubjectIndex];
    targetSubj.kps.splice(targetTopicIndex, 0, movedTopic);

    console.log('移动后的 subjects:',
        editingConfig.subjects.map(s => s.kps.map(t => t.id)));

    // 关键：重新渲染管理界面
    renderManageUI();

    // 清空拖拽信息
    draggedTopicInfo = null;
    console.log('=== drop 结束 ===');
}
    // 新增学科
    document.getElementById('addSubjectBtn').onclick = () => {
        const newSubj = {
            key: `${generateId()}`,
            displayName: 'New',
            kps: []
        };
        syncEditingConfigFromDOM();
        editingConfig.subjects.push(newSubj);
        renderManageUI();
    };

    // 保存配置
    document.getElementById('saveConfigBtn').onclick = async () => {
        // 从 UI 更新 editingConfig
        const subjDivs = document.querySelectorAll('#subjectList .manage-subject');
        subjDivs.forEach((div, i) => {
            const keyInput = div.querySelector('.subjKey');
            const displayInput = div.querySelector('.subjDisplay');
            if (keyInput) editingConfig.subjects[i].key = keyInput.value.trim();
            if (displayInput) editingConfig.subjects[i].displayName = displayInput.value.trim();

            const topicDivs = div.querySelectorAll('.manage-topic');
            editingConfig.subjects[i].kps = [];
            topicDivs.forEach(tDiv => {
                const nameInput = tDiv.querySelector('.topicName');
                const idSpan = tDiv.querySelector('.topicIdDisplay');
                if (idSpan && nameInput) {
                    editingConfig.subjects[i].kps.push({
                        id: Number(idSpan.textContent.trim()),
                        name: nameInput.value.trim()
                    });
                }
            });
        });

        // 验证ID唯一性
        const allIds = editingConfig.subjects.flatMap(s => s.kps.map(t => t.id));
        if (new Set(allIds).size !== allIds.length) {
            alert('Duplicate topic IDs detected! Please check.');
            return;
        }

        // 保存配置
        const tx = db.transaction([CONFIG_STORE], 'readwrite');
        tx.objectStore(CONFIG_STORE).put(editingConfig);
        await tx.complete;

        // 同步 topics 存储
        const topicTx = db.transaction([KPS_STORE], 'readwrite');
        const store = topicTx.objectStore(KPS_STORE);
        const existingTopics = await new Promise(res => {
            const req = store.getAll();
            req.onsuccess = () => res(req.result);
        });
        const existingMap = {};
        existingTopics.forEach(t => existingMap[t.uniqueId] = t);

        for (const subj of editingConfig.subjects) {
            for (const def of subj.kps) {
                if (existingMap[def.id]) {
                    if (existingMap[def.id].name !== def.name) {
                        existingMap[def.id].name = def.name;
                        store.put(existingMap[def.id]);
                    }
                } else {
                    store.put({
                        uniqueId: Number(def.id),
                        subject: subj.key,
                        name: def.name,
                        clickCount: 0,
                        lastClicked: new Date(0).toISOString()
                    });
                }
            }
        }
        await topicTx.complete;

        appConfig = editingConfig;
        displayUrgentTopics();
        document.getElementById('manageModal').style.display = 'none';
    };

    async function resetAndInit() {
        if (!confirm('Reset ALL data?')) return;
        const tx = db.transaction([KPS_STORE, LOGS_STORE, CONFIG_STORE], 'readwrite');
        tx.objectStore(KPS_STORE).clear();
        tx.objectStore(LOGS_STORE).clear();
        tx.objectStore(CONFIG_STORE).clear();
        await tx.complete;

        const defaultCfg = getDefaultConfig();
        const writeTx = db.transaction([CONFIG_STORE, KPS_STORE], 'readwrite');
        writeTx.objectStore(CONFIG_STORE).add(defaultCfg);
        for (const subj of defaultCfg.subjects) {
            for (const def of subj.kps) {
                writeTx.objectStore(KPS_STORE).add({
                    uniqueId: def.id,
                    subject: subj.key,
                    name: def.name,
                    clickCount: 0,
                    lastClicked: new Date(0).toISOString()
                });
            }
        }
        await writeTx.complete;
        appConfig = defaultCfg;
        displayUrgentTopics();
    }

    async function exportData() {
        const storeNames = Array.from(db.objectStoreNames);
        const payload = { stores: {} };
        for (const s of storeNames) {
            const tx = db.transaction([s], 'readonly');
            const items = await new Promise(res => {
                const req = tx.objectStore(s).getAll();
                req.onsuccess = () => res(req.result);
            });
            payload.stores[s] = items;
        }
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `MyKPs_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
    }

    function importData(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async function(ev) {
            try {
                const json = JSON.parse(ev.target.result);
                if (!json.stores) { alert('Invalid file'); return; }
                if (!confirm('Overwrite all data?')) return;
                if (db) { db.close(); db = null; }
                await new Promise((res, rej) => {
                    const req = indexedDB.deleteDatabase(DB_NAME);
                    req.onsuccess = res; req.onerror = rej;
                    req.onblocked = () => alert('Please close other tabs');
                });
               const openReq = indexedDB.open(DB_NAME, DB_VERSION);
                openReq.onupgradeneeded = (e) => {
                    const idb = e.target.result;
                    if (!idb.objectStoreNames.contains(KPS_STORE)) {
                        const os = idb.createObjectStore(KPS_STORE, { keyPath: 'uniqueId' });
                        os.createIndex('subject', 'subject');
                    }
                    if (!idb.objectStoreNames.contains(LOGS_STORE)) {
                        const os = idb.createObjectStore(LOGS_STORE, { keyPath: 'id' });
                        os.createIndex('KPsId', 'KPsId');
                        os.createIndex('timestamp', 'timestamp');
                    }
                    if (!idb.objectStoreNames.contains(CONFIG_STORE)) {
                        idb.createObjectStore(CONFIG_STORE, { keyPath: 'id' });
                    }
                    if (!idb.objectStoreNames.contains('DailyPlans')) {
                        const dailyStore = idb.createObjectStore('DailyPlans', { keyPath: 'id', autoIncrement: true });
                        dailyStore.createIndex('date', 'date', { unique: false });
                    }
                    if (!idb.objectStoreNames.contains('Announcements')) {
                        const annStore = idb.createObjectStore('Announcements', { keyPath: 'id', autoIncrement: true });
                        annStore.createIndex('pinnedAt', 'pinnedAt', { unique: false });
                    }
                    if (!idb.objectStoreNames.contains('Flawless')) {
                        const flawlessStore = idb.createObjectStore('Flawless', { keyPath: 'id', autoIncrement: true });
                        flawlessStore.createIndex('date', 'date', { unique: true });
                    }
                };
                openReq.onsuccess = async (e) => {
                    const newDb = e.target.result;
                    for (const s of Object.keys(json.stores)) {
                        if (!newDb.objectStoreNames.contains(s)) continue;
                        const tx = newDb.transaction([s], 'readwrite');
                        for (const item of json.stores[s]) {
                            tx.objectStore(s).put(item);
                        }
                        await tx.complete;
                    }
                    alert('Import complete');
                    location.reload();
                };
            } catch (err) { alert('Import failed'); console.error(err); }
        };
        reader.readAsText(file);
        document.getElementById('fileInput').value = '';
    }

    async function viewLogs() {
        document.getElementById('logModal').style.display = 'block';
        const tx = db.transaction([LOGS_STORE], 'readonly');
        const store = tx.objectStore(LOGS_STORE);
        const index = store.index('timestamp');
        const logs = [];
        index.openCursor(null, 'prev').onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) { logs.push(cursor.value); cursor.continue(); }
            else {
                let html = '<table><tr><th>ID</th><th>KPs</th><th>Time</th></tr>';
                logs.forEach(l => html += `<tr><td>${l.id}</td><td>${l.KPsName}</td><td>${new Date(l.timestamp).toLocaleString()}</td></tr>`);
                html += '</table>';
                document.getElementById('logContent').innerHTML = logs.length ? html : '<p>No logs</p>';
            }
        };
    }

    async function getLocalLogs() {
        const tx = db.transaction([LOGS_STORE], 'readonly');
        const store = tx.objectStore(LOGS_STORE);
        const index = store.index('timestamp');
        return new Promise((resolve, reject) => {
            const logs = [];
            index.openCursor(null, 'prev').onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) { 
                    logs.push(cursor.value); 
                    cursor.continue(); 
                } else {
                    resolve(logs);
                }
            };
            index.openCursor(null, 'prev').onerror = () => reject(index.error);
        });
    }

    async function getAllStoresData() {
        const storeNames = Array.from(db.objectStoreNames);
        const payload = { stores: {} };
        for (const s of storeNames) {
            const tx = db.transaction([s], 'readonly');
            const items = await new Promise((res, rej) => {
                const req = tx.objectStore(s).getAll();
                req.onsuccess = () => res(req.result);
                req.onerror = () => rej(req.error);
            });
            payload.stores[s] = items;
        }
        return payload;
    }

    async function uploadToCloud() {
        let password = document.getElementById('cloudPassword').value;
        
        // Auto-load password from localStorage if empty
        if (!password) {
            const savedPassword = localStorage.getItem('ON_MyKPs_PWD_old');
            if (savedPassword) {
                password = savedPassword;
                document.getElementById('cloudPassword').value = password;
            }
        }
        
        if (!password) {
            alert('Please enter password');
            return;
        }

        try {
            // Show loading state
            const uploadBtn = document.getElementById('uploadBtn');
            const originalText = uploadBtn.textContent;
            uploadBtn.textContent = 'Uploading...';
            uploadBtn.disabled = true;

            // Get all data from IndexedDB
            const data = await getAllStoresData();

            // Upload to server
            const response = await fetch('CloudKPs.php/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `GaoKaoBiSheng ${password}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed');
            }

            // Save password to localStorage
            localStorage.setItem('ON_MyKPs_PWD_old', password);

            alert('Upload successful!');
            console.log('Upload result:', result);

            // Refresh server logs display
            await loadServerLogs(password);

        } catch (error) {
            console.error('Upload error:', error);
            alert(`Upload failed: ${error.message}`);
        } finally {
            const uploadBtn = document.getElementById('uploadBtn');
            uploadBtn.textContent = '↑Upload';
            uploadBtn.disabled = false;
        }
    }

    async function downloadFromCloud() {
        let password = document.getElementById('cloudPassword').value;
        
        // Auto-load password from localStorage if empty
        if (!password) {
            const savedPassword = localStorage.getItem('ON_MyKPs_PWD_old');
            if (savedPassword) {
                password = savedPassword;
                document.getElementById('cloudPassword').value = password;
            }
        }
        
        if (!password) {
            alert('Please enter password');
            return;
        }

        if (!confirm('Download will overwrite all local data. Continue?')) {
            return;
        }

        try {
            // Show loading state
            const downloadBtn = document.getElementById('downloadBtn');
            const originalText = downloadBtn.textContent;
            downloadBtn.textContent = 'Downloading...';
            downloadBtn.disabled = true;

            // Download from server
            const response = await fetch('CloudKPs.php/download', {
                method: 'GET',
                headers: {
                    'Authorization': `GaoKaoBiSheng ${password}`
                }
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Download failed');
            }

            const data = await response.json();

            // Close current database
            if (db) {
                db.close();
                db = null;
            }

            // Delete and recreate database
            await new Promise((res, rej) => {
                const req = indexedDB.deleteDatabase(DB_NAME);
                req.onsuccess = res;
                req.onerror = rej;
                req.onblocked = () => alert('Please close other tabs using this app');
            });

            // Reopen database with schema
            const openReq = indexedDB.open(DB_NAME, DB_VERSION);
            openReq.onupgradeneeded = (e) => {
                const idb = e.target.result;
                if (!idb.objectStoreNames.contains(KPS_STORE)) {
                    const os = idb.createObjectStore(KPS_STORE, { keyPath: 'uniqueId' });
                    os.createIndex('subject', 'subject');
                }
                if (!idb.objectStoreNames.contains(LOGS_STORE)) {
                    const os = idb.createObjectStore(LOGS_STORE, { keyPath: 'id' });
                    os.createIndex('KPsId', 'KPsId');
                    os.createIndex('timestamp', 'timestamp');
                }
                if (!idb.objectStoreNames.contains(CONFIG_STORE)) {
                    idb.createObjectStore(CONFIG_STORE, { keyPath: 'id' });
                }
                if (!idb.objectStoreNames.contains('DailyPlans')) {
                    const dailyStore = idb.createObjectStore('DailyPlans', { keyPath: 'id', autoIncrement: true });
                    dailyStore.createIndex('date', 'date', { unique: false });
                }
                if (!idb.objectStoreNames.contains('Announcements')) {
                    const annStore = idb.createObjectStore('Announcements', { keyPath: 'id', autoIncrement: true });
                    annStore.createIndex('pinnedAt', 'pinnedAt', { unique: false });
                }
                if (!idb.objectStoreNames.contains('Flawless')) {
                    const flawlessStore = idb.createObjectStore('Flawless', { keyPath: 'id', autoIncrement: true });
                    flawlessStore.createIndex('date', 'date', { unique: true });
                }
            };

            await new Promise((res, rej) => {
                openReq.onsuccess = res;
                openReq.onerror = rej;
            });

            db = openReq.result;

            // Import downloaded data
            if (data.stores) {
                for (const storeName of Object.keys(data.stores)) {
                    if (!db.objectStoreNames.contains(storeName)) continue;
                    
                    const tx = db.transaction([storeName], 'readwrite');
                    const store = tx.objectStore(storeName);
                    
                    for (const item of data.stores[storeName]) {
                        store.put(item);
                    }
                    
                    await new Promise((res, rej) => {
                        tx.oncomplete = res;
                        tx.onerror = rej;
                    });
                }
            }

            // Save password to localStorage
            localStorage.setItem('ON_MyKPs_PWD_old', password);

            alert('Download and import successful! Page will reload.');
            location.reload();

        } catch (error) {
            console.error('Download error:', error);
            alert(`Download failed: ${error.message}`);
        } finally {
            const downloadBtn = document.getElementById('downloadBtn');
            downloadBtn.textContent = '↓Download';
            downloadBtn.disabled = false;
        }
    }

    async function loadServerLogs(password) {
        if (!password) {
            password = document.getElementById('cloudPassword').value;
        }
        
        // Auto-load password from localStorage if still empty
        if (!password) {
            const savedPassword = localStorage.getItem('ON_MyKPs_PWD_old');
            if (savedPassword) {
                password = savedPassword;
                document.getElementById('cloudPassword').value = password;
            }
        }
        
        if (!password) {
            document.getElementById('serverLogs').innerHTML = '<p>Please enter password</p>';
            return;
        }

        try {
            const response = await fetch('CloudKPs.php/logs', {
                method: 'GET',
                headers: {
                    'Authorization': `GaoKaoBiSheng ${password}`
                }
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to load server logs');
            }

            const logs = await response.json();
            
            let html = '<table><tr><th>ID</th><th>KPs</th><th>Time</th></tr>';
            if (logs && logs.length > 0) {
                logs.forEach(l => {
                    html += `<tr><td>${l.id || 'N/A'}</td><td>${l.KPsName || l.name || 'N/A'}</td><td>${l.timestamp ? new Date(l.timestamp).toLocaleString() : 'N/A'}</td></tr>`;
                });
            } else {
                html += '<tr><td colspan="3">No logs on server</td></tr>';
            }
            html += '</table>';
            
            document.getElementById('serverLogs').innerHTML = html;

        } catch (error) {
            console.error('Load server logs error:', error);
            document.getElementById('serverLogs').innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
        }
    }

    async function loadLocalLogsDisplay() {
        try {
            const logs = await getLocalLogs();
            let html = '<table><tr><th>ID</th><th>KPs</th><th>Time</th></tr>';
            if (logs && logs.length > 0) {
                logs.slice(0, 10).forEach(l => {
                    html += `<tr><td>${l.id}</td><td>${l.KPsName}</td><td>${new Date(l.timestamp).toLocaleString()}</td></tr>`;
                });
            } else {
                html += '<tr><td colspan="3">No local logs</td></tr>';
            }
            html += '</table>';
            document.getElementById('localLogs').innerHTML = html;
        } catch (error) {
            console.error('Load local logs error:', error);
            document.getElementById('localLogs').innerHTML = '<p style="color:red;">Error loading logs</p>';
        }
    }

    window.onload = async function() {
        await openDB();
        appConfig = await getConfig();
        await displayUrgentTopics();

        document.getElementById('showAllBtn').addEventListener('click', displayAllTopicsView);
        document.getElementById('showUrgentBtn').addEventListener('click', displayUrgentTopics);
        document.getElementById('initButton').addEventListener('click', resetAndInit);
        document.getElementById('exportBtn').addEventListener('click', exportData);
        document.getElementById('importBtn').addEventListener('click', () => document.getElementById('fileInput').click());
        document.getElementById('fileInput').addEventListener('change', importData);
        document.getElementById('viewLogBtn').addEventListener('click', viewLogs);
        document.getElementById('manageBtn').addEventListener('click', openManageModal);
        document.getElementById('cleara').addEventListener('click', resetAndInit);

     document.querySelectorAll('.close').forEach(el => {
            el.addEventListener('click', function(e) {
                const modal = this.closest('#logModal, #cloudModal, #manageModal');
                if (modal) modal.style.display = 'none';
            });
        });
        
        // Also handle manageCloseFooter button
        const manageCloseFooter = document.getElementById('manageCloseFooter');
        if (manageCloseFooter) {
            manageCloseFooter.addEventListener('click', function() {
                document.getElementById('manageModal').style.display = 'none';
            });
        }
        
        // disable overlay click-to-close: ignore clicks on modal overlays
        window.addEventListener('click', (e) => {
            // Intentionally left blank to prevent closing modals by clicking the overlay.
        });

        // PWA 安装
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            document.getElementById('installButton').style.display = 'inline-block';
        });
        document.getElementById('installButton').addEventListener('click', () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(() => deferredPrompt = null);
            }
        });

        // 云存档按钮事件
        document.getElementById('cloudBtn').addEventListener('click', async () => {
            document.getElementById('cloudModal').style.display = 'block';
            
            // Auto-load password from localStorage
            const savedPassword = localStorage.getItem('ON_MyKPs_PWD_old');
            if (savedPassword) {
                document.getElementById('cloudPassword').value = savedPassword;
            }
            
            // Load local logs
            await loadLocalLogsDisplay();
            
            // Try to load server logs if password exists
            const password = document.getElementById('cloudPassword').value;
            if (password) {
                await loadServerLogs(password);
            }
        });

        // Cloud upload/download buttons
        document.getElementById('uploadBtn').addEventListener('click', uploadToCloud);
        document.getElementById('downloadBtn').addEventListener('click', downloadFromCloud);

        // Password change - reload server logs and save to localStorage
        document.getElementById('cloudPassword').addEventListener('change', async (e) => {
            const password = e.target.value;
            if (password) {
                // Save password to localStorage
                localStorage.setItem('ON_MyKPs_PWD_old', password);
                await loadServerLogs(password);
            }
        });
    };
})();
</script>
</body>
</html>