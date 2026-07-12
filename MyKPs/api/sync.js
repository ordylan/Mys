//几个未修复的bug  删除: 同时更新updatedat和deleted=1即可  再设置=1不展示  目前不能删除
//点快了会主键冲突  不影响不修复 因为多执行几次  最终也是同步
//php未判定用户是否存在  但不影响  除非手动删除用户  -- 但是用户令牌在  仍然可以提交数据
//还有  appconfig默认配置覆盖问题...
const consolea = document.getElementById('SyncConsole');
const consoleb = document.getElementById('SyncConsoleSingal');

const DB_NAME = 'MyKPs';
const DB_VERSION = 3;
const TABLES = ['Announcements', 'AppConfig', 'DailyPlans', 'Flawless', 'KPs', 'MyLearningLogs'];
function MSG(...args) {
  const msg = args.map(arg => {
    if (arg === null) return 'null';
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return '';
      }
    }
    return String(arg);
  }).join(' ');
  const line = msg + '<br>';
  if (consolea) {
    consolea.innerHTML += line;
    consolea.scrollTop = consolea.scrollHeight;
  }
  if (consoleb) {
    consoleb.innerHTML = line;
  }

  console.log(msg);
   // requestAnimationFrame(() => {});
}
const ID_FIELD = {
  Announcements: 'id',
  AppConfig: 'id',
  DailyPlans: 'id',
  Flawless: 'id',
  KPs: 'uniqueId',
  MyLearningLogs: 'id'
};

const TIME_FIELD = {
  Announcements: 'updatedAt',
  AppConfig: 'updatedAt',
  DailyPlans: 'statusUpdatedAt',
  Flawless: 'updatedAt',
  KPs: 'updatedAt',
  MyLearningLogs: 'timestamp'
};

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (e) => reject(e.target.error);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      createStoresIfNeeded(db);
    };

    request.onsuccess = (e) => {
      resolve(e.target.result);
    };
  });
}

function createStoresIfNeeded(db) {
  if (!db.objectStoreNames.contains('KPs')) {
    const store = db.createObjectStore('KPs', { keyPath: 'uniqueId' });
    store.createIndex('subject', 'subject');
  }
  if (!db.objectStoreNames.contains('AppConfig')) {
    db.createObjectStore('AppConfig', { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains('DailyPlans')) {
    const store = db.createObjectStore('DailyPlans', { keyPath: 'id', autoIncrement: true });
    store.createIndex('date', 'date', { unique: false });
  }
  if (!db.objectStoreNames.contains('Announcements')) {
    const store = db.createObjectStore('Announcements', { keyPath: 'id', autoIncrement: true });
    store.createIndex('pinnedAt', 'pinnedAt', { unique: false });
  }
  if (!db.objectStoreNames.contains('Flawless')) {
    const store = db.createObjectStore('Flawless', { keyPath: 'id', autoIncrement: true });
    store.createIndex('date', 'date', { unique: true });
  }
  if (!db.objectStoreNames.contains('MyLearningLogs')) {
    const store = db.createObjectStore('MyLearningLogs', { keyPath: 'id' });
    store.createIndex('KPsId', 'KPsId');
    store.createIndex('timestamp', 'timestamp');
  }
}

function getAllRecords(db, table) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(table, 'readonly');
    const req = tx.objectStore(table).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function putRecords(db, table, records) {
  return new Promise((resolve, reject) => {
    if (!records.length) { resolve(); return; }
    const tx = db.transaction(table, 'readwrite');
    const store = tx.objectStore(table);
    let done = 0;
    records.forEach(rec => {
      const req = store.put(rec);
      req.onsuccess = () => { if (++done === records.length) resolve(); };
      req.onerror = () => reject(req.error);
    });
    tx.onerror = () => reject(tx.error);
  });
}

function getRecordTime(rec, table) {
  const field = TIME_FIELD[table] || 'updatedAt';
  const val = rec[field];
  if (val === undefined || val === null) return Date.now();
  const ts = new Date(val).getTime();
  return isNaN(ts) ? Date.now() : ts;
}

function apiRequest(url, data) {
  const token = localStorage.getItem('ON_MyKPs_Token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'KaoYanBiSheng ' + token;
  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  })
  .then(res => {
    if (!res.ok) {
      return res.text().then(text => {
        throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
      });
    }
    return res.json();
  })
  .then(json => {
    if (json && json.error) {
      throw new Error(json.error);
    }
    return json;
  });
}

async function sync() {
 // consolea.innerHTML = '';
  //consoleb.innerHTML = '';
  const token = localStorage.getItem('ON_MyKPs_Token');
  if (!token) {
    MSG('登录后才能同步 go to <a href="/MyKPs/api/DoLogin.html">Login</a> ');
  //  setTimeout(() => {
   //   consolea.style.display = 'none';
  //  }, 1000);
    return;
  }

  let db;
  try {
    db = await openDB();
  } catch (e) {
    MSG('打开数据库失败:', e);
    throw e;
  }

  const nowISO = new Date().toISOString();
  
  //不需要了  旧数据迁移用  先留着
/*  let fixedCount = 0;
  for (const table of TABLES) {
    const records = await getAllRecords(db, table);
    const idField = ID_FIELD[table];
    const timeField = TIME_FIELD[table];
    const toFix = records.filter(r => r[idField] != null && (r[timeField] == null || new Date(r[timeField]).getTime() === 0));
    if (toFix.length) {
      toFix.forEach(r => { r[timeField] = nowISO; });
      await putRecords(db, table, toFix);
      MSG(`${table}: 修补 ${toFix.length} 条记录`);
      fixedCount += toFix.length;
    }
  }
  if (fixedCount) MSG(`共修补 ${fixedCount} 条记录`);
*/

  const localData = {};
  let totalLocal = 0;
  for (const table of TABLES) {
    localData[table] = await getAllRecords(db, table);
    const count = localData[table].length;
    totalLocal += count;
  }
  MSG(`总计 ${totalLocal} 条记录`);

  let idTimeResult;
  try {
    idTimeResult = await apiRequest('/MyKPs/api/get.php', { tables: TABLES });
   //MSG('[API] 服务器摘要获取成功');
  } catch (e) {
    MSG('Go to <a href="/MyKPs/api/DoLogin.html">Login</a>;获取服务器数据失败:', e.message);
    //return;
    throw e;
  }

  const TIME_TOLERANCE = 0; //数据库升级后不要了
  const downloadIds = {};
  const uploadRecords = {};
  let totalDownload = 0, totalUpload = 0;

  for (const table of TABLES) {
    const local = localData[table] || [];
    const serverSummary = idTimeResult[table] || [];
    const idField = ID_FIELD[table];
    const timeField = TIME_FIELD[table];

    const validLocal = local.filter(r => r[idField] != null);
    const validServer = serverSummary.filter(item => item[idField] != null && item[timeField] != null);

    const localMap = new Map(validLocal.map(r => [r[idField], r]));
    const serverMap = new Map(validServer.map(item => [item[idField], item[timeField]]));

    const toDownload = [];
    const toUpload = [];

   // MSG(`${table}: 本地 ${validLocal.length} 条, 服务器 ${validServer.length} 条`);

    for (const [id, serverTime] of serverMap) {
      const localRec = localMap.get(id);
      if (!localRec) {
    //    MSG(`拉取数据: ID ${id}`);
        toDownload.push(id);
      } else {
        const localTs = getRecordTime(localRec, table);
        const serverTs = new Date(serverTime).getTime();
        const diff = serverTs - localTs;
        if (diff > TIME_TOLERANCE) {
      //    MSG(`更新本地数据: ID ${id}`);
          toDownload.push(id);
        } else if (diff < -TIME_TOLERANCE) {
        //  MSG(`更新云数据: ID ${id}`);
          toUpload.push(localRec);
        }
      }
    }

    for (const [id, localRec] of localMap) {
      if (!serverMap.has(id)) {
    //   MSG(`准备上传数据: ID ${id}`);
        toUpload.push(localRec);
      }
    }

    if (toDownload.length) { downloadIds[table] = toDownload; totalDownload += toDownload.length; }
    if (toUpload.length) { uploadRecords[table] = toUpload; totalUpload += toUpload.length; }
  }

  
  let aa= `准备下载: ${totalDownload} 条, 上传: ${totalUpload} 条`;
  MSG(aa);
  // 4. 下载
  let downloaded = {};
  if (totalDownload > 0) {
    try {
      downloaded = await apiRequest('/MyKPs/api/fetch.php', { tables: downloadIds });
      MSG('下载成功!');
      const nowISO2 = new Date().toISOString();
      for (const table of TABLES) {
        (downloaded[table] || []).forEach(rec => {
          if (!rec[TIME_FIELD[table]]) rec[TIME_FIELD[table]] = nowISO2;
        });
      }
    } catch (e) {
      console.error('下载失败:', e.message);
      throw e;
    }
  }

  // 5. 上传
  if (totalUpload > 0) {
    try {
      const uploadResult = await apiRequest('/MyKPs/api/post.php', { tables: uploadRecords });
      MSG('上传:', uploadResult);

      if (uploadResult.results) {
        let ins = 0, upd = 0, skip = 0;
        for (const [t, results] of Object.entries(uploadResult.results)) {
          const inserted = results.filter(r => r.s === 'inserted').length;
          const updated  = results.filter(r => r.s === 'updated').length;
          const skipped  = results.filter(r => r.s === 'skip').length;
          ins += inserted; upd += updated; skip += skipped;
         // MSG(`${t}: 插入 ${inserted}, 更新 ${updated}, 跳过 ${skipped}`);
        }
        MSG(`云端更新总计: 插入 ${ins}, 更新 ${upd}, 跳过 ${skip}`);
  } } catch (e) {   // ← 加上 catch
    MSG('上传失败:', e.message);
    console.error(e);
  }
} 
    
    
  if (Object.keys(downloaded).some(k => (downloaded[k] || []).length)) {
    for (const table of TABLES) {
      const records = downloaded[table] || [];
      if (records.length) {
        await putRecords(db, table, records);
        //MSG(`${table}: 写入 ${records.length} 条`);
      }
    }
  }
    
  MSG('同步完成');
  return { aa,downloaded, uploaded: uploadRecords };
    }

window.sync = sync;