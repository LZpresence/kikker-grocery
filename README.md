# Kikker Grocery

A shared grocery list with Kikker the frog. Tap things you need on **Add**, cross them off on **List**
while you shop, then **End trip**: what you got comes off the list, what you didn't stays on for next time.
Everyone with the list's link sees changes live, and it keeps working with no signal in the store.

- Web app (Android, iPhone, desktop): https://lzpresence.github.io/kikker-grocery/
- Android app: https://lzpresence.github.io/kikker-grocery/download/ (built by GitHub Actions on each push to `android/`)
- iPhone: open the web app in Safari > Share > Add to Home Screen.

## How it's built
- Static web app (`index.html`, `app.js`, `store.js`, `catalog.js`, `kikker.js`) on GitHub Pages.
- Sync: Firebase Cloud Firestore, called straight from the browser. `firebase-config.js` holds the
  project's public web config. Until it's filled in, the app works on one phone with local storage.
- Access: `firestore.rules`. A list is only reachable with its long random ID (in the share link);
  nobody can browse lists. Paste the rules into Firebase console > Firestore > Rules.
- Android: a small WebView wrapper in `android/`, signed with a key the first CI run creates.

## Data
`lists/{listId}` and `lists/{listId}/items/{itemId}`, where an item is
`{ name, aisle, on, got, note, by, n, t }` (on the list, crossed off, note, who added it,
times bought, last change).
