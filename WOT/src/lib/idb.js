export const DB_NAME = 'WOT'
export const DB_VERSION = 1

function openDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = req.result
      if (!db.objectStoreNames.contains('mailbox')) db.createObjectStore('mailbox', { keyPath: 'time' })
      if (!db.objectStoreNames.contains('statuses')) db.createObjectStore('statuses', { keyPath: 'key' })
      if (!db.objectStoreNames.contains('MyCollections')) db.createObjectStore('MyCollections', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('MyHouse')) db.createObjectStore('MyHouse', { keyPath: 'floor' })
      if (!db.objectStoreNames.contains('MyObjects')) db.createObjectStore('MyObjects', { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function mailboxAll(){
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction('mailbox','readonly')
    const store = tx.objectStore('mailbox')
    const items = []
    store.openCursor(null, 'prev').onsuccess = (e) => {
      const cur = e.target.result
      if(!cur){ res(items); return }
      items.push(cur.value)
      cur.continue()
    }
    tx.oncomplete = () => {}
    tx.onerror = () => rej(tx.error)
  })
}

export async function mailboxAdd(msg){
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction('mailbox','readwrite')
    const store = tx.objectStore('mailbox')
    const req = store.put(msg)
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

export async function mailboxClear(){
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction('mailbox','readwrite')
    const store = tx.objectStore('mailbox')
    const req = store.clear()
    req.onsuccess = () => res()
    req.onerror = () => rej(req.error)
  })
}

export async function statusesGetAll(){
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction('statuses','readonly')
    const store = tx.objectStore('statuses')
    const items = {}
    store.openCursor().onsuccess = (e)=>{
      const cur = e.target.result
      if(!cur){ res(items); return }
      items[cur.value.key]=cur.value.value
      cur.continue()
    }
    tx.onerror = ()=>rej(tx.error)
  })
}

export async function statusesPut(key, value){
  const db = await openDB()
  return new Promise((res,rej)=>{
    const tx = db.transaction('statuses','readwrite')
    const store = tx.objectStore('statuses')
    const req = store.put({ key, value })
    req.onsuccess = ()=>res(req.result)
    req.onerror = ()=>rej(req.error)
  })
}

export async function collectionsGetAll(){
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction('MyCollections','readonly')
    const store = tx.objectStore('MyCollections')
    const items = []
    store.openCursor().onsuccess = (e) => {
      const cur = e.target.result
      if(!cur){ res(items); return }
      items.push(cur.value)
      cur.continue()
    }
    tx.onerror = ()=>rej(tx.error)
  })
}

export async function collectionsDebugAdd(id, qty=1){
  console.log('collectionsDebugAdd start', id, qty)
  try {
    const r = await collectionsAdd(id, qty)
    console.log('collectionsDebugAdd result', r)
    return r
  } catch (e) {
    console.error('collectionsDebugAdd error', e)
    throw e
  }
}

export async function collectionsGet(id){
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction('MyCollections','readonly')
    const store = tx.objectStore('MyCollections')
    const req = store.get(id)
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

export async function collectionsAdd(id, qty=1){
  console.log('collectionsAdd called', id, qty)
  const db = await openDB()
  return new Promise((res, rej) => {
    try {
      const tx = db.transaction('MyCollections','readwrite')
      const store = tx.objectStore('MyCollections')
      const getReq = store.get(id)
      getReq.onsuccess = () => {
        try {
          const cur = getReq.result || { id, count: 0, fragmentcount: 0 }
          console.log('collectionsAdd got current', cur)
          cur.count = (cur.count || 0) + (qty || 0)
          const putReq = store.put(cur)
          putReq.onsuccess = () => {
            console.log('collectionsAdd put success', putReq.result)
            res(putReq.result)
          }
          putReq.onerror = () => {
            console.error('collectionsAdd put error', putReq.error)
            rej(putReq.error)
          }
        } catch (err) {
          console.error('collectionsAdd onsuccess handler error', err)
          rej(err)
        }
      }
      getReq.onerror = () => {
        console.error('collectionsAdd get error', getReq.error)
        rej(getReq.error)
      }
    } catch (err) {
      console.error('collectionsAdd transaction error', err)
      rej(err)
    }
  })
}

export async function myHouseGet(floor) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction('MyHouse','readonly')
    const store = tx.objectStore('MyHouse')
    const req = store.get(floor)
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

export async function myHouseGetAll() {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction('MyHouse','readonly')
    const store = tx.objectStore('MyHouse')
    const items = []
    store.openCursor().onsuccess = (e) => {
      const cur = e.target.result
      if (!cur) { res(items); return }
      items.push(cur.value)
      cur.continue()
    }
    tx.onerror = () => rej(tx.error)
  })
}

export async function myHousePut(record) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction('MyHouse','readwrite')
    const store = tx.objectStore('MyHouse')
    const req = store.put(record)
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

export async function myObjectsGet(id) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction('MyObjects','readonly')
    const store = tx.objectStore('MyObjects')
    const req = store.get(id)
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

export async function myObjectsGetAll() {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction('MyObjects','readonly')
    const store = tx.objectStore('MyObjects')
    const items = []
    store.openCursor().onsuccess = (e) => {
      const cur = e.target.result
      if (!cur) { res(items); return }
      items.push(cur.value)
      cur.continue()
    }
    tx.onerror = () => rej(tx.error)
  })
}

export async function myObjectsPut(record) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction('MyObjects','readwrite')
    const store = tx.objectStore('MyObjects')
    const req = store.put(record)
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

