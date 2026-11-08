/* Kikker Grocery: a shared grocery list. Tap items in the catalog to put them on the list,
   tap them in the store to cross them off, then End trip: crossed-off items come off the list
   and anything you didn't get stays on for next time. */
import { AISLES, STARTER, guessAisle } from './catalog.js';
import { LocalStore, CloudStore, cloudReady, newListId } from './store.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';
const AISLE = Object.fromEntries(AISLES.map(([k, name, icon]) => [k, { name, icon }]));
const APP_URL = 'https://lzpresence.github.io/kikker-grocery/';

/* ---------- per-phone settings ---------- */
const KEY = 'kg.v1';
let P = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
const saveP = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch { /* ignore */ } };

let store = null, items = {}, sync = { mode: 'local' }, tab = 'list', query = '';

function starterItems() {
  const seed = {};
  for (const [aisle, names] of Object.entries(STARTER)) for (const name of names) seed[slug(name)] = { name, aisle, on: false, got: false, n: 0 };
  return seed;
}

/* ---------- actions ---------- */
const findByName = (name) => Object.entries(items).find(([, x]) => x.name.toLowerCase() === name.toLowerCase());
const by = () => (P.name || '').trim().slice(0, 20);

async function addNew(name) {
  name = name.replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!name) return;
  const hit = findByName(name);
  if (hit) { if (!hit[1].on) await toggleOn(hit[0]); else toast(`${hit[1].name} is already on the list`); return; }
  let id = slug(name);
  while (items[id]) id += '-' + Math.random().toString(36).slice(2, 4);
  await store.put(id, { name, aisle: guessAisle(name), on: true, got: false, n: 0, by: by(), note: '' });
  toast(`Added ${name}`);
}
async function toggleOn(id) {
  const x = items[id];
  if (!x) return;
  if (x.on) await store.patch(id, { on: false, got: false });
  else await store.patch(id, { on: true, got: false, by: by() });
}
async function toggleGot(id) { const x = items[id]; if (x) await store.patch(id, { got: !x.got }); }
async function endTrip() {
  const got = Object.entries(items).filter(([, x]) => x.on && x.got);
  const left = Object.values(items).filter((x) => x.on && !x.got).length;
  await store.patchMany(got.map(([id, x]) => [id, { on: false, got: false, n: (x.n || 0) + 1 }]));
  closeSheet();
  toast(left ? `Trip done! ${left} left on the list for next time.` : 'Trip done! The list is clear.');
}

/* ---------- Kikker ---------- */
function kikker(onList, inCart) {
  if (typeof kikkerSvg !== 'function') return '';
  const left = onList - inCart;
  const mood = onList && !left ? 'happy' : onList > 12 ? 'meh' : 'happy';
  return kikkerSvg(new Set(['basket', 'sleeves', 'pants']), { mood });
}
function sayLine(onList, inCart) {
  const left = onList - inCart;
  if (!onList) return 'The list is empty. Tap Add to fill the basket.';
  if (inCart && !left) return 'Everything’s in the cart! Tap End trip when you’re done.';
  if (inCart) return `${left} to go. You’re doing great.`;
  return `${onList} thing${onList === 1 ? '' : 's'} on the list.`;
}

/* ---------- rendering ---------- */
function render() {
  const all = Object.entries(items);
  const onList = all.filter(([, x]) => x.on), inCart = onList.filter(([, x]) => x.got);
  $('kikker').innerHTML = kikker(onList.length, inCart.length);
  $('say').textContent = sayLine(onList.length, inCart.length);
  $('sync').innerHTML = sync.mode === 'local' ? 'This phone only' : sync.offline ? 'Offline · will sync' : sync.error ? 'Sync problem' : '<i></i>Shared · live';
  $('sync').className = `sync ${sync.mode === 'local' || sync.offline || sync.error ? 'warn' : 'ok'}`;
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  for (const v of ['list', 'add', 'share']) $(`view-${v}`).hidden = v !== tab;
  $('countBadge').textContent = onList.length || '';
  if (tab === 'list') renderList(onList, inCart);
  if (tab === 'add') renderAdd(all);
  if (tab === 'share') renderShare();
  $('endbar').hidden = !(tab === 'list' && inCart.length);
  $('endBtn').textContent = `End trip · ${inCart.length} in the cart`;
}

const byAisle = (list) => {
  const g = {};
  for (const e of list) (g[e[1].aisle in AISLE ? e[1].aisle : 'other'] ||= []).push(e);
  return AISLES.filter(([k]) => g[k]).map(([k]) => [k, g[k].sort((a, b) => a[1].name.localeCompare(b[1].name))]);
};

function row([id, x]) {
  return `<li class="item${x.got ? ' got' : ''}"><button class="tick" data-act="got" data-id="${id}" aria-pressed="${!!x.got}">
      <span class="box" aria-hidden="true">${x.got ? '✓' : ''}</span>
      <span class="txt"><b>${esc(x.name)}</b>${x.note || x.by ? `<small>${esc([x.note, x.by && !x.got ? `added by ${x.by}` : ''].filter(Boolean).join(' · '))}</small>` : ''}</span></button>
    <button class="more" data-act="edit" data-id="${id}" aria-label="Edit ${esc(x.name)}">⋯</button></li>`;
}

function renderList(onList, inCart) {
  const h = [];
  if (sync.mode === 'local') h.push(setupCard());
  const todo = onList.filter(([, x]) => !x.got);
  if (!onList.length) {
    h.push('<div class="empty"><b>Nothing on the list</b><p>Tap things you need on the Add tab, and they show up here for both of you.</p><button class="btn primary" data-act="tab" data-tab="add">Add items</button></div>');
  }
  for (const [k, list] of byAisle(todo)) {
    h.push(`<h2><span>${AISLE[k].icon}</span>${esc(AISLE[k].name)}</h2><ul class="items">${list.map(row).join('')}</ul>`);
  }
  if (inCart.length) {
    h.push(`<h2 class="cart"><span>🧺</span>In the cart <small>${inCart.length}</small></h2><ul class="items">${inCart.sort((a, b) => a[1].name.localeCompare(b[1].name)).map(row).join('')}</ul>`);
  }
  $('view-list').innerHTML = h.join('');
}

function chip([id, x]) {
  return `<button class="chip${x.on ? ' on' : ''}" data-act="toggle" data-id="${id}" aria-pressed="${!!x.on}">${x.on ? '✓ ' : ''}${esc(x.name)}</button>`;
}

function renderAdd(all) {
  const q = query.trim().toLowerCase();
  const h = [];
  if (q) {
    const hits = all.filter(([, x]) => x.name.toLowerCase().includes(q)).sort((a, b) => (b[1].n || 0) - (a[1].n || 0));
    const exact = all.some(([, x]) => x.name.toLowerCase() === q);
    h.push('<div class="chips">');
    if (!exact) h.push(`<button class="chip new" data-act="addNew">+ Add “${esc(query.trim())}” <small>${esc(AISLE[guessAisle(query)].name)}</small></button>`);
    h.push(hits.map(chip).join(''), '</div>');
  } else {
    const freq = all.filter(([, x]) => (x.n || 0) > 0).sort((a, b) => b[1].n - a[1].n || a[1].name.localeCompare(b[1].name)).slice(0, 12);
    if (freq.length) h.push(`<h2><span>⭐</span>Usuals</h2><div class="chips">${freq.map(chip).join('')}</div>`);
    for (const [k, list] of byAisle(all)) h.push(`<h2><span>${AISLE[k].icon}</span>${esc(AISLE[k].name)}</h2><div class="chips">${list.map(chip).join('')}</div>`);
    if (!all.length) h.push('<p class="note">Type above to add your first item.</p>');
  }
  $('addResults').innerHTML = h.join('');
}

function shareLink() { return P.listId ? `${APP_URL}#join=${P.listId}` : ''; }

function setupCard() {
  if (!cloudReady) {
    return '<div class="card warn"><b>Only on this phone for now</b><p>Shared syncing isn’t switched on yet. Your list is saved here and moves over when it is.</p></div>';
  }
  return `<div class="card"><b>Share this list with your family</b><p>Start a shared list and send the link, or open the link someone sent you.</p>
    <div class="row"><button class="btn primary" data-act="createList">Start our shared list</button><button class="btn" data-act="tab" data-tab="share">I have a link</button></div></div>`;
}

function renderShare() {
  const link = shareLink();
  $('view-share').innerHTML = `
    <h2>You</h2>
    <div class="card"><label class="field">Your name <small>shows next to things you add</small><input id="myName" type="text" maxlength="20" value="${esc(P.name || '')}" placeholder="e.g. Dan"></label></div>
    <h2>Shared list</h2>
    ${link ? `<div class="card"><b>Send this link to whoever shops with you</b><p>Anyone with the link can see and change the list, so keep it in the family.</p>
        <input class="linkbox" id="linkBox" readonly value="${esc(link)}">
        <div class="row"><button class="btn primary" data-act="shareLink">Share link</button><button class="btn" data-act="copyLink">Copy</button></div></div>`
      : cloudReady ? `<div class="card"><b>No shared list yet</b><div class="row"><button class="btn primary" data-act="createList">Start our shared list</button></div></div>`
      : '<div class="card warn"><b>Syncing isn’t set up yet</b><p>The list works on this phone. Once sync is switched on, you can share it.</p></div>'}
    ${cloudReady ? `<div class="card"><b>Join a list</b><p>Paste the link you were sent.</p><form class="row" id="joinForm"><input id="joinTxt" type="url" placeholder="https://…#join=…" style="flex:1;min-width:0"><button class="btn">Join</button></form></div>` : ''}
    <h2>On your home screen</h2>
    <div class="card"><p><b>iPhone:</b> open this page in Safari, tap the Share button, then <b>Add to Home Screen</b>.</p>
      <p><b>Android:</b> install the app from <a href="download/">the download page</a>.</p></div>
    <p class="note">Kikker Grocery keeps the list in a private Firebase database. Only people with the link can open it.</p>`;
}

/* ---------- sheets ---------- */
function editSheet(id) {
  const x = items[id];
  if (!x) return;
  $('panel').innerHTML = `<h3>${esc(x.name)}</h3>
    <label class="field">Name<input id="eName" type="text" maxlength="80" value="${esc(x.name)}"></label>
    <label class="field">Note <small>size, brand, how many</small><input id="eNote" type="text" maxlength="120" value="${esc(x.note || '')}" placeholder="e.g. 2 gallons, the organic one"></label>
    <label class="field">Aisle<select id="eAisle">${AISLES.map(([k, n, i]) => `<option value="${k}"${k === x.aisle ? ' selected' : ''}>${i} ${esc(n)}</option>`).join('')}</select></label>
    <div class="row"><button class="btn primary" data-act="saveEdit" data-id="${id}">Save</button>
      ${x.on ? `<button class="btn" data-act="offList" data-id="${id}">Take off the list</button>` : `<button class="btn" data-act="toggle" data-id="${id}">Put on the list</button>`}</div>
    <button class="btn ghost danger" data-act="delete" data-id="${id}">Delete from the catalog</button>`;
  $('sheet').hidden = false;
}
function endSheet() {
  const on = Object.values(items).filter((x) => x.on), got = on.filter((x) => x.got).length, left = on.length - got;
  $('panel').innerHTML = `<h3>Done shopping?</h3>
    <p>${got} crossed-off item${got === 1 ? '' : 's'} come${got === 1 ? 's' : ''} off the list.${left ? ` <b>${left} you didn’t get stay${left === 1 ? 's' : ''} on</b> for next time.` : ''}</p>
    <div class="row"><button class="btn primary" data-act="endTrip">End trip</button><button class="btn" data-act="close">Keep shopping</button></div>`;
  $('sheet').hidden = false;
}
const closeSheet = () => { $('sheet').hidden = true; };

function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => { t.hidden = true; }, 2400); }

/* ---------- events ---------- */
document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-act],[data-tab]');
  if (!t) { if (e.target === $('sheet')) closeSheet(); return; }
  if (t.classList.contains('tab')) { setTab(t.dataset.tab); return; }
  const id = t.dataset.id;
  try {
    switch (t.dataset.act) {
      case 'tab': setTab(t.dataset.tab); break;
      case 'got': await toggleGot(id); break;
      case 'toggle': await toggleOn(id); if (!$('sheet').hidden) closeSheet(); break;
      case 'offList': await store.patch(id, { on: false, got: false }); closeSheet(); break;
      case 'addNew': await addNew(query); query = ''; $('q').value = ''; render(); $('q').focus(); break;
      case 'edit': editSheet(id); break;
      case 'saveEdit': {
        const name = $('eName').value.replace(/\s+/g, ' ').trim().slice(0, 80);
        if (!name) { toast('Give it a name'); break; }
        await store.patch(id, { name, note: $('eNote').value.trim().slice(0, 120), aisle: $('eAisle').value });
        closeSheet(); break;
      }
      case 'delete': await store.remove(id); closeSheet(); toast('Deleted'); break;
      case 'end': endSheet(); break;
      case 'endTrip': await endTrip(); break;
      case 'close': closeSheet(); break;
      case 'createList': await createList(); break;
      case 'copyLink': try { await navigator.clipboard.writeText(shareLink()); toast('Link copied'); } catch { $('linkBox').select(); toast('Select the link and copy it'); } break;
      case 'shareLink':
        if (navigator.share) { try { await navigator.share({ title: 'Our Kikker grocery list', text: 'Join our grocery list:', url: shareLink() }); } catch { /* cancelled */ } } else { try { await navigator.clipboard.writeText(shareLink()); toast('Link copied'); } catch { $('linkBox').select(); } }
        break;
      default: break;
    }
  } catch (err) { console.error(err); toast('That didn’t save. Check your connection.'); }
});
document.addEventListener('input', (e) => { if (e.target.id === 'q') { query = e.target.value; renderAdd(Object.entries(items)); } });
document.addEventListener('change', (e) => { if (e.target.id === 'myName') { P.name = e.target.value.trim().slice(0, 20); saveP(); toast('Saved'); } });
document.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (e.target.id === 'addForm') {
    const q = query.trim();
    if (!q) return;
    const hits = Object.entries(items).filter(([, x]) => x.name.toLowerCase() === q.toLowerCase());
    if (hits.length) await toggleOn(hits[0][0]); else await addNew(q);
    query = ''; $('q').value = ''; render();
  }
  if (e.target.id === 'joinForm') {
    const m = $('joinTxt').value.match(/join=([a-z0-9]{20,40})/i);
    if (!m) { toast('That link doesn’t look right'); return; }
    await joinList(m[1]);
  }
});

function setTab(name) { tab = name; window.scrollTo(0, 0); render(); if (name === 'add' && matchMedia('(pointer:fine)').matches) $('q').focus(); }

/* ---------- connecting ---------- */
async function connect() {
  if (cloudReady && P.listId) {
    store = await new CloudStore(P.listId).open();
    sync = { mode: 'cloud', offline: !navigator.onLine };
    store.subscribe((it, meta) => { items = it; sync.offline = meta.fromCache && !navigator.onLine; sync.error = false; render(); },
      (err) => { console.error(err); sync.error = true; render(); toast('Can’t reach the shared list right now'); });
  } else {
    store = await new LocalStore().open();
    sync = { mode: 'local' };
    if (await store.isEmpty()) for (const [id, x] of Object.entries(starterItems())) store.items[id] = x;
    store.save();
    store.subscribe((it) => { items = it; render(); });
  }
}
async function createList() {
  if (!cloudReady) return;
  const id = newListId();
  const cloud = await new CloudStore(id).open();
  const local = new LocalStore();
  const seed = Object.keys(local.items).length ? local.items : starterItems();
  await cloud.create('Our groceries', seed);
  P.listId = id; saveP();
  await connect();
  setTab('share');
  toast('Shared list ready. Send the link!');
}
async function joinList(id) {
  if (!cloudReady) { toast('Syncing isn’t set up yet'); return; }
  P.listId = id; saveP();
  await connect();
  setTab('list');
  toast('Joined the shared list');
}
window.addEventListener('online', () => { sync.offline = false; render(); });
window.addEventListener('offline', () => { if (sync.mode === 'cloud') { sync.offline = true; render(); } });

(async function start() {
  const m = location.hash.match(/join=([a-z0-9]{20,40})/i);
  if (m) history.replaceState(null, '', location.pathname + location.search);
  if (m && cloudReady) { P.listId = m[1]; saveP(); }
  try { await connect(); } catch (err) { console.error(err); toast('Couldn’t open the list'); }
  if (m && cloudReady) toast('Joined the shared list');
  render();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
