<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Next NTT</title>
        <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            background: #f8f8f8;
            color: #111;
            padding: 20px;
            max-width: 1000px;
            margin: 0 auto;
        }

        /* ===== 标题 ===== */
        h1 {
            font-size: 28px;
            font-weight: 600;
            margin: 0 0 8px 0;
            padding-bottom: 6px;
            border-bottom: 2px solid #aaa;
        }
        h2 {
            font-size: 20px;
            font-weight: 600;
            margin: 24px 0 10px 0;
        }
        h3 {
            font-size: 17px;
            font-weight: 600;
            margin: 12px 0 6px 0;
        }

        /* ===== 当前计时器卡片 ===== */
        #currentTimer {
            border: 1px solid #888;
            padding: 14px 18px;
            margin-bottom: 20px;
            background: #fff;
        }
        #currentTimer h3 {
            margin-top: 0;
            margin-bottom: 6px;
        }
        #timerDisplay {
            font-size: 20px;
            font-weight: 500;
            padding: 6px 0 10px 0;
            font-family: 'Courier New', monospace;
            letter-spacing: 0.5px;
            min-height: 2.2em;
        }

        /* ===== 按钮通用 ===== */
        button {
            font-size: 15px;
            padding: 4px 14px;
            border: 1px solid #666;
            background: #eaeaea;
            color: #111;
            cursor: pointer;
            border-radius: 0;
            margin: 2px 4px 2px 0;
            line-height: 1.8;
        }
        button:hover {
            background: #d0d0d0;
        }
        button:active {
            background: #b8b8b8;
        }

        /* ===== 任务列表 ===== */
        #taskList {
            border: 1px solid #888;
            background: #fff;
            padding: 12px 16px;
            min-height: 60px;
            margin-bottom: 16px;
        }
        #taskList ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        #taskList li {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px 12px;
            padding: 6px 0;
            border-bottom: 1px solid #ddd;
        }
        #taskList li:last-child {
            border-bottom: none;
        }
        #taskList li button {
            flex-shrink: 0;
        }

        /* ===== 头部按钮组 ===== */
        .action-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 8px 0 14px 0;
        }

        /* ===== 模态框 ===== */
        #modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.45);
            z-index: 1000;
        }
        #modal > div {
            background: #fff;
            margin: 40px auto;
            padding: 20px 24px;
            width: 90%;
            max-width: 700px;
            max-height: 80%;
            overflow: auto;
            border: 1px solid #222;
        }
        #modalClose {
            float: right;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            padding: 0 6px;
            border: 1px solid #888;
            background: #eee;
            line-height: 1.6;
            margin-top: -4px;
        }
        #modalClose:hover {
            background: #ccc;
        }

        /* ===== 模态框内容 ===== */
        #modalContent h2 {
            margin-top: 0;
            border-bottom: 1px solid #aaa;
            padding-bottom: 4px;
        }
        #modalContent h3 {
            margin: 14px 0 4px 0;
            font-size: 16px;
        }
        #modalContent ul {
            list-style: none;
            padding: 0;
            margin: 0 0 12px 0;
        }
        #modalContent li {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px 12px;
            padding: 4px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        #modalContent li:last-child {
            border-bottom: none;
        }
        #modalContent li button {
            flex-shrink: 0;
        }
        .text-muted {
            color: #555;
            font-size: 14px;
        }
        hr {
            border: none;
            border-top: 1px solid #ccc;
            margin: 16px 0;
}
#stopBtn {
font-size: 2.456rem;
padding: 0.8rem 2rem;
border-width: 2px;
}
    </style>
    
</head>
<body>
    <h1>Next New-TimeTable</h1>
<a href="ToDos.php" style="margin-left:8px" >[ToDos]</a><a href="/MyKPs/?kps=1" style="margin-left:8px" >[KPs]</a><a href="WR-test/" target="_blank" style="margin-left:8px" >[test]</a>
    <div id="currentTimer" style="border:1px solid #ccc; padding:10px; margin-bottom:20px;">
        <h3>CurrentTask</h3>
        <div id="timerDisplay"></div>
        <button id="stopBtn" style="display:none;">STOP!!</button>
    </div>

    <h2>MyToDosToday:</h2>
    <div id="taskList"></div>

    <button id="showAllKPSBtn">Others KPs</button>
    <button id="showStatsBtn">Learning totals</button>

    <div id="modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5);">
        <div style="background:#fff; margin:50px auto; padding:20px; width:80%; max-width:600px; max-height:80%; overflow:auto;">
            <span id="modalClose" style="float:right; cursor:pointer;">Close</span>
            <div id="modalContent"></div>
        </div>
    </div>

    <script>
        const API_BASE = 'api/NNTT_api.php?proj=MyKPs';
        let currentTimer = null;

        function apiRequest(url, options = {}) {
            const token = localStorage.getItem('ON_MyKPs_Token');
            const headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };
            if (token) {
                headers['Authorization'] = 'KaoYanBiSheng ' + token;
            }
            return fetch(url, {
                ...options,
                headers: headers
            }).then(res => {
                if (!res.ok) {
                    return res.text().then(text => {
                        throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
                    });
                }
                return res.json();
            }).then(json => {
                if (json && json.error) throw new Error(json.error);
                return json;
            });
        }

        async function loadTasks() {
            const tasks = await apiRequest(`${API_BASE}&action=getTasks`);
            const container = document.getElementById('taskList');
            container.innerHTML = '';
            if (tasks.length === 0) {
                container.textContent = 'No Tasks Left Today';
                return;
            }
            const ul = document.createElement('ul');
            tasks.forEach(task => {
                const li = document.createElement('li');
                const subjectDisplay = task.displayName || task.subjectKey || '';
                const kpsName = task.kpsName || 'Unknown';
                li.textContent = `${subjectDisplay} - ${kpsName} : ${task.content || ''} (${task.tag || ''})`;
                const startBtn = document.createElement('button');
                startBtn.textContent = 'Start!';
                startBtn.dataset.taskId = task.taskId;
                startBtn.addEventListener('click', () => startTimer({ kpsId: task.kpsId }));
                li.appendChild(startBtn);
                ul.appendChild(li);
            });
            container.appendChild(ul);
        }

        async function startTimer(params) {
            const data = await apiRequest(`${API_BASE}&action=start`, {
                method: 'POST',
                body: JSON.stringify(params)
            });
            if (data.error) {
                alert('开始计时失败: ' + data.error);
                return;
            }
            startLocalTimer(data.timerId, data.startTime);
        }

        function startLocalTimer(timerId, startTimeStr) {
            if (currentTimer) {
                clearInterval(currentTimer.intervalId);
                currentTimer = null;
            }
            const startTime = new Date(startTimeStr);
            currentTimer = { timerId, startTime };

            apiRequest(`${API_BASE}&action=getCurrentTimer`)
                .then(data => {
                    if (data) {
                        currentTimer.kpsName = data.kpsName || 'Unknown';
                        currentTimer.displayName = data.displayName || data.subjectKey || '';
                        updateTimerDisplay();
                        document.getElementById('stopBtn').style.display = 'inline-block';
                        if (currentTimer.intervalId) clearInterval(currentTimer.intervalId);
                        currentTimer.intervalId = setInterval(updateTimerDisplay, 1000);
                    }
                })
                .catch(err => console.error(err));
        }

        function updateTimerDisplay() {
            if (!currentTimer) return;
            const now = new Date();
            const diff = Math.floor((now - currentTimer.startTime) / 1000);
            const h = String(Math.floor(diff / 3600)).padStart(2, '0');
            const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
            const s = String(diff % 60).padStart(2, '0');
            const subject = currentTimer.displayName || '';
            const kps = currentTimer.kpsName || '';
            document.getElementById('timerDisplay').textContent =
                `Now learning: ${subject} - ${kps}  ${h}:${m}:${s}`;
        }

        async function stopTimerAction() {
            if (!currentTimer) return;
            const data = await apiRequest(`${API_BASE}&action=stop`, {
                method: 'POST',
                body: JSON.stringify({ timerId: currentTimer.timerId })
            });
            if (data.error) {
                alert('Error: ' + data.error);
                return;
            }
            clearInterval(currentTimer.intervalId);
            currentTimer = null;
            document.getElementById('timerDisplay').textContent = '';
            document.getElementById('stopBtn').style.display = 'none';
            loadTasks();
            alert(`Finished!  ${data.duration}s, Total ${data.totalTime} s!`);
        }

        async function restoreCurrentTimer() {
            const data = await apiRequest(`${API_BASE}&action=getCurrentTimer`);
            if (data && data.id) {
                startLocalTimer(data.id, data.start_time);
            }
        }

        async function showAllKPS() {
            const data = await apiRequest(`${API_BASE}&action=getAllKPS`);
            const modalContent = document.getElementById('modalContent');
            modalContent.innerHTML = '<h2>All KPs</h2>';
            data.forEach(subject => {
                const div = document.createElement('div');
                div.innerHTML = `<h3>${subject.displayName}</h3>`;
                const ul = document.createElement('ul');
                subject.kps.forEach(kps => {
                    const li = document.createElement('li');
                    li.textContent = `${kps.name} (${kps.clickCount})`;
                    const startBtn = document.createElement('button');
                    startBtn.textContent = 'Start!!';
                    startBtn.dataset.kpsId = kps.uniqueId;
                    startBtn.addEventListener('click', () => {
                        startTimer({ kpsId: kps.uniqueId });
                        closeModal();
                    });
                    li.appendChild(startBtn);
                    ul.appendChild(li);
                });
                div.appendChild(ul);
                modalContent.appendChild(div);
            });
            document.getElementById('modal').style.display = 'block';
        }

        async function showStats() {
            const data = await apiRequest(`${API_BASE}&action=getStats`);
            const modalContent = document.getElementById('modalContent');
            modalContent.innerHTML = `<h2>NNTT (All Time: ${formatTime(data.totalSeconds)})</h2>`;
            data.subjects.forEach(subj => {
                const div = document.createElement('div');
                div.innerHTML = `<h3>${subj.displayName} (${formatTime(subj.totalSeconds)})</h3>`;
                const ul = document.createElement('ul');
                subj.kps.forEach(kps => {
                    const li = document.createElement('li');
                    li.textContent = `${kps.name}: ${formatTime(kps.time)}`;
                    ul.appendChild(li);
                });
                div.appendChild(ul);
                modalContent.appendChild(div);
            });
            document.getElementById('modal').style.display = 'block';
        }

        function formatTime(seconds) {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            return `${h}h ${m}m ${s}s`;
        }

        function closeModal() {
            document.getElementById('modal').style.display = 'none';
        }

        document.getElementById('stopBtn').addEventListener('click', stopTimerAction);
        document.getElementById('showAllKPSBtn').addEventListener('click', showAllKPS);
        document.getElementById('showStatsBtn').addEventListener('click', showStats);
        document.getElementById('modalClose').addEventListener('click', closeModal);
        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeModal();
        });

        window.onload = function() {
            loadTasks();
            restoreCurrentTimer();
        };
    </script>
</body>
</html>