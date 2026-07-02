<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>DailyPlans - MyKPs</title><link rel="shortcut icon" href="MyKPs.ico" type="image/vnd.microsoft.icon">
<link rel="icon" href="MyKPs.ico" type="image/vnd.microsoft.icon">
  <style>body {
    font-family: Arial, sans-serif;
    background: #fff8f0; 
    padding: 12px;
}
.container {
    max-width: 900px;
    margin: 0 auto;
    background: #ffffff;
    padding: 12px;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(255, 140, 0, 0.15); 
}
h1 {
    font-size: 18px;
    text-align: center;
    color: #f47712f5; 
}
.row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin: 8px 0;
}
label {
    min-width: 70px;
    color: #ff8c00; 
}
select, input[type=date], textarea {
    padding: 6px;
    border: 1px solid #ffcc80; /* 橙色边框 */
    border-radius: 4px;
    background: #fff3e0; /* 浅橙色输入框背景 */
}
textarea {
    width: 100%;
    height: 80px;
}
.categories {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}
.cat {
    padding: 6px 8px;
    border: 1px solid #ffcc80; /* 橙色边框 */
    border-radius: 4px;
    cursor: pointer;
    background: #ffe0b2; /* 浅橙色分类背景 */
    color: #e65100; /* 深橙色文字 */
}
.cat.active {
    background: #ff8c00; /* 橙色激活状态 */
    color: #fff;
    border-color: #e65100;
}
.task {
    border: 1px solid #ffcc80; /* 橙色边框 */
    padding: 8px;
    border-radius: 4px;
    margin-bottom: 8px;
    background: #fff3e0; /* 浅橙色任务背景 */
}
.status-red {
    border: 2px solid #e53935;
}
.status-yellow {
    border: 2px solid #fdd835;
}
.status-green {
    border: 2px solid #66bb6a;
}
.task .meta {
    font-size: 12px;
    color: #666;
    margin-bottom: 6px;
}
button {
    padding: 6px 10px;
    border: none;
    background: #ff8c00; /* 橙色按钮 */
    color: #fff;
    border-radius: 4px;
    cursor: pointer;
}
button.ghost {
    background: #ffcc80; /* 浅橙色按钮 */
    color: #e65100;
}
.tags {
    display: flex;
    gap: 6px;
}
.tags label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}
.small {
    font-size: 12px;
    padding: 4px 8px;
}
.status {
    -webkit-user-select: none;
    -moz-user-select: none;
    user-select: none;
}
table.tasks-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
}
table.tasks-table th, table.tasks-table td {
    border: 1px solid #ffcc80;
    padding: 6px;
    vertical-align: top;
}
table.tasks-table th {
    background: #ffe0b2; 
    color: #fe8300;
}








</style>
</head>
<body>
  <div class="container">
  <h1>KPs ~ Plans</h1>
    <div class="row">
        <!--  <label for="planDate">Date</label>-->
  <button id="prevDayBtn" class="small">←</button>
    <input type="date" id="planDate">
    <!-- Weekday display to the right of the date -->
    <span id="weekdayDisplay" class="small" style="margin-left:8px;color:#333;font-weight:600"></span>
  <button id="nextDayBtn" class="small">→</button>
      <div style="margin-left:auto">
  <!--<button id="refreshBtn">Refresh</button>-->
  
   <a href="/MyKPs/task-reminder.php" style="margin-left:8px">[任务提醒]</a>
  <a href="/MyKPs/?kps=1" style="margin-left:8px">[GoToKPs]</a>
    <a href="WR-test/" style="margin-left:8px" target="_blank">[test]</a>
  
      </div>
    </div>
      <div id="todoAnnouncement" style="margin-top:12px;padding:8px;border:1px solid #ddd;border-radius:6px;background:#f9f9f9">
  <strong>Announcement</strong> <button id="editAnnouncementBtn" class="small">All</button>  <button onclick="var el=document.getElementById('announcementContent');el.style.display=el.style.display==='none'?'block':'none'" class="small">收起/展开公告</button>
        <div id="announcementContent" style="margin-top:8px;white-space:pre-wrap;color:#333">Loading...</div>
        <div id="announcementEditArea" style="display:none;margin-top:8px">
          <textarea id="announcementTextarea" style="width:100%;height:80px"></textarea>
          <div style="text-align:right;margin-top:8px">
            <button id="saveAnnouncementBtn" class="small">Save</button>
            <button id="cancelAnnouncementBtn" class="small ghost">Cancel</button>
          </div>
        </div>
       <!-- <div style="text-align:right;margin-top:8px"></div>-->
      </div>


    <div style="border-top:1px solid #eee;padding-top:10px;margin-top:10px">
  <h3>Tasks for the Day <button id="toggleEditTasksBtn" class="small" style="margin-left:8px">Edit</button></h3>
      <div id="tasksList"></div>
    </div>

    <!-- Flawless : one entry per day. Static container so JS can render into it -->
    <div id="flawlessContent" style="margin-top:10px;padding:8px;border:1px dashed #d6f0ff;border-left:6px solid #4fa1f2ff;border-radius:6px;background:#fff">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong>Flawless</strong>
          <div id="flawlessDate" style="font-size:12px;color:#666;margin-top:4px"></div>
        </div>
        <div>
          <button id="editFlawlessBtn" class="small">Edit</button>
        </div>
      </div>
      <div id="flawlessBody" style="margin-top:8px;white-space:pre-wrap;color:#333">Loading...</div>
    </div>
    
    
    
    
        <div style="border-top:1px solid #eee;padding-top:10px;margin-top:10px">
      <!-- Large toggle button to show/hide add task controls -->
      <button id="toggleAddBtn" style="width:100%;padding:8px 8px;font-size:15px;background:#4bdb12;color:#fff;border:none;border-radius:6px;cursor:pointer">Add Task</button>

      <div id="addControls" style="display:none;margin-top:12px">
        <div id="editTaskHeader" style="display:none;margin-bottom:8px">
          <strong>Edit Task</strong>
          <button id="cancelEditBtn" class="small ghost" style="margin-left:8px">Cancel</button>
        </div>
        <div class="row">
          <label>Subject</label>
<div class="tags" id="categoryRadios"> </div>
        </div>

        <div class="row">
          <label>Tag</label>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div class="tags">
              <label><input type="radio" name="tagRad" value="RV" class="tagRad" checked> RV</label>
              <label><input type="radio" name="tagRad" value="R1/R2" class="tagRad"> R1/R2</label>
              <label><input type="radio" name="tagRad" value="RT" class="tagRad"> RT</label>
              <label><input type="radio" name="tagRad" value="Temp" class="tagRad"> (Temp)</label>
              <label><input type="radio" name="tagRad" value="" class="tagRad"> Custom</label>
            </div>
            <input type="text" id="customTagInput" placeholder="Enter custom tag..." style="padding:6px;border:1px solid #ffcc80;border-radius:4px;background:#fff3e0;display:none;">
          </div>
        </div>

        <div class="row">
          <label>Content</label>
          <div style="display:flex;flex-direction:column;gap:8px;flex:1">
            <select id="kpsSelect"><option>Loading KPS...</option></select>
            <textarea id="textContent" placeholder="Enter task text (required if no KPS selected)"></textarea>
          </div>
        </div>

        <div class="row">
          <label></label>
          <button id="addBtn">Save Task</button>
        </div>
      </div>

      <!-- Announcement area specific to ToDos page -->

    </div>
  </div>
<!--<input type="checkbox" id="aaaaaa"> 自动跳转桌面版-->
  <script>
  (function checkDbBeforeLoad() {
    const DB_NAME = 'MyKPs';
    const REQUIRED_VERSION = 3;
    const openReq = indexedDB.open(DB_NAME, REQUIRED_VERSION);

    openReq.onsuccess = function(e) {
      const db = e.target.result;
      let isValid = true;
      if (db.version !== REQUIRED_VERSION) {
        isValid = false;
      } else {
        // 检查必要的对象存储是否存在
        const requiredStores = ['KPs', 'MyLearningLogs', 'AppConfig'];
        for (let store of requiredStores) {
          if (!db.objectStoreNames.contains(store)) {
            isValid = false;
            break;
          }
        }
      }
      db.close();

      if (!isValid) {
        alert('数据库版本不正确或缺少必要存储，请先访问 KPs 主页面 (index.html) 完成初始化！');
        // 禁用页面主要功能（可选）
        const container = document.querySelector('.container');
        if (container) {
          const errorDiv = document.createElement('div');
          errorDiv.style.color = 'red';
          errorDiv.style.padding = '20px';
          errorDiv.style.border = '1px solid red';
          errorDiv.style.marginTop = '20px';
          errorDiv.innerHTML = '<strong>错误：数据库未初始化。</strong> 请先打开 <a href="/MyKPs/">KPs 主页面</a> 完成设置后再使用此页面。';
          container.prepend(errorDiv);
        }
        // 抛出全局标志，让 daily-plans.js 跳过执行
        window.__kpDbInvalid = true;
      } else {
        window.__kpDbInvalid = false;
      }
    };

    openReq.onerror = function(e) {
      console.error('打开数据库失败', e);
      alert('无法连接数据库，请确保已通过 KPs 主页面初始化数据！');
      window.__kpDbInvalid = true;
    };
  })();
</script>
  <script src="daily-plans.js"></script>
    <script src="landscape.js"></script>
    <script>
                       if ('serviceWorker' in navigator) {
                    window.addEventListener('load', () => {
                        navigator.serviceWorker.register('/MyKPs/kps-sw.js')
                            .then(registration => {
                                console.log('SW registered: ', registration);
                            })
                            .catch(registrationError => {
                                console.log('SW registration failed: ', registrationError);
                            });
                    });
                }
                </script>
              <script>
/*


       window.onload = function() {
            const isChecked = localStorage.getItem('ON_KPs_Offline_1') === 'true';
            if(isChecked) {
open('kmlive://KPs/', '_self');

        setTimeout(function() {
            open('ToDos.php', '_self').close();
        }, 1000)
               
            }
        };

        // 监听勾选变化
        document.getElementById('aaaaaa').addEventListener('change', function() {
            if(this.checked) {
                localStorage.setItem('ON_KPs_Offline_1', 'true');
open('kmlive://KPs/', '_self');

        setTimeout(function() {
            open("ToDos.php", '_self').close();
        }, 1000)
            } else {
                localStorage.removeItem('autoCloseChecked');
            }
        });
*/
</script>
</body>
</html>

