/* Where the list lives.
   - CloudStore: a Firestore list shared by everyone who has its link. Live updates, and it keeps
     working offline in the store (changes sync when the phone reconnects).
   - LocalStore: this phone only, used until Firebase is set up in firebase-config.js.
   Both expose the same small API: subscribe(cb), put(id, data), patch(id, fields), patchMany(list), remove(id).
   An item is { name, aisle, on, got, note, by, n, t }: on = on the list, got = crossed off,
   n = times bought (frequent items float up), t = last change (ms). */
import { FIREBASE_CONFIG } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';
export const cloudReady = !!(FIREBASE_CONFIG && FIREBASE_CONFIG.projectId);

export function newListId() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(b, (x) => (x % 36).toString(36)).join('') + Date.now().toString(36).slice(-4);
}

export class LocalStore {
  constructor(key = 'kg.local') { this.key = key; this.items = {}; this.subs = []; try { this.items = JSON.parse(localStorage.getItem(key)) || {}; } catch { /* empty */ } }
  async open() { this.emit(); return this; }
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.items)); } catch { /* full */ } this.emit(); }
  emit() { const snap = { ...this.items }; this.subs.forEach((cb) => cb(snap, { fromCache: false })); }
  subscribe(cb) { this.subs.push(cb); cb({ ...this.items }, { fromCache: false }); }
  async put(id, data) { this.items[id] = { ...data, t: Date.now() }; this.save(); }
  async patch(id, f) { if (this.items[id]) { Object.assign(this.items[id], f, { t: Date.now() }); this.save(); } }
  async patchMany(list) { list.forEach(([id, f]) => { if (this.items[id]) Object.assign(this.items[id], f, { t: Date.now() }); }); this.save(); }
  async remove(id) { delete this.items[id]; this.save(); }
  async isEmpty() { return !Object.keys(this.items).length; }
}

export class CloudStore {
  constructor(listId) { this.listId = listId; this.items = {}; }
  async open() {
    const [{ initializeApp }, fs] = await Promise.all([import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-firestore.js`)]);
    this.fs = fs;
    const app = initializeApp(FIREBASE_CONFIG);
    let db;
    try { db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) }); } catch { db = fs.getFirestore(app); }
    this.db = db;
    this.col = fs.collection(db, 'lists', this.listId, 'items');
    this.listDoc = fs.doc(db, 'lists', this.listId);
    return this;
  }
  subscribe(cb, onError) {
    this.fs.onSnapshot(this.col, { includeMetadataChanges: true }, (snap) => {
      const items = {};
      snap.forEach((d) => { items[d.id] = d.data(); });
      this.items = items;
      cb(items, { fromCache: snap.metadata.fromCache, pending: snap.metadata.hasPendingWrites });
    }, (e) => onError && onError(e));
  }
  ref(id) { return this.fs.doc(this.col, id); }
  async put(id, data) { await this.fs.setDoc(this.ref(id), { ...data, t: Date.now() }); }
  async patch(id, f) { await this.fs.updateDoc(this.ref(id), { ...f, t: Date.now() }); }
  async patchMany(list) {
    for (let i = 0; i < list.length; i += 400) {
      const b = this.fs.writeBatch(this.db);
      list.slice(i, i + 400).forEach(([id, f]) => b.update(this.ref(id), { ...f, t: Date.now() }));
      await b.commit();
    }
  }
  async remove(id) { await this.fs.deleteDoc(this.ref(id)); }
  async isEmpty() { const s = await this.fs.getDocs(this.fs.query(this.col, this.fs.limit(1))); return s.empty; }
  async create(name, seed) {
    await this.fs.setDoc(this.listDoc, { name, created: Date.now() });
    const ids = Object.keys(seed);
    for (let i = 0; i < ids.length; i += 400) {
      const b = this.fs.writeBatch(this.db);
      ids.slice(i, i + 400).forEach((id) => b.set(this.ref(id), { ...seed[id], t: Date.now() }));
      await b.commit();
    }
  }
}
