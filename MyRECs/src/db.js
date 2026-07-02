import { openDB } from 'idb'

const DB_NAME = 'MyRECs'
const STORE = 'RECs'
const DB_VERSION = 1

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE)) {
      db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
    }
  }
})

export async function addMany(entries) {
  const db = await dbPromise
  const tx = db.transaction(STORE, 'readwrite')
  for (const e of entries) {
    await tx.store.add(e)
  }
  await tx.done
}

export async function getAll() {
  const db = await dbPromise
  return db.getAll(STORE)
}

export async function getRec(id) {
  const db = await dbPromise
  return db.get(STORE, id)
}

export async function updateRec(rec) {
  const db = await dbPromise
  // Ensure we put a plain, structured-cloneable object (avoid Vue proxies)
  const plain = { id: rec.id, recs: rec.recs, sub: rec.sub }
  return db.put(STORE, plain)
}

export async function deleteRec(id) {
  const db = await dbPromise
  return db.delete(STORE, id)
}

export async function clearAll() {
  const db = await dbPromise
  return db.clear(STORE)
}

export async function exportJSON() {
  const all = await getAll()
  return JSON.stringify({ db: DB_NAME, store: STORE, rows: all }, null, 2)
}

export async function importJSON(json) {
  const parsed = typeof json === 'string' ? JSON.parse(json) : json
  if (!parsed.rows || !Array.isArray(parsed.rows)) throw new Error('Invalid import format')
  const db = await dbPromise
  const tx = db.transaction(STORE, 'readwrite')
  for (const r of parsed.rows) {
    // ensure id not duplicated; use add/put -> put will accept id
    await tx.store.put(r)
  }
  await tx.done
}
