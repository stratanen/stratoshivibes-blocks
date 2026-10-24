# StratoshiVibes Blockspace

Neon block puzzle for the Solana Seeker. Drag pieces onto an 8×8 board, clear rows and columns, and every clear reveals part of a picture. Free to play, no wallet connection, no tokens or rewards.

- Play in the browser: https://blockspace.stratoshivibes.com/
- Privacy policy: https://blockspace.stratoshivibes.com/privacy.html
- Terms of use: https://blockspace.stratoshivibes.com/terms.html

## One-time setup

1. **Settings → Pages**: Source "Deploy from a branch", branch `main`, folder `/ (root)`, Save.
2. **Settings → Secrets and variables → Actions → New repository secret**: name `KEYSTORE_PASSWORD`, value the same password used for the Mahjong app. The app is signed with the same StratoshiVibes key (`release.keystore.enc`).

## Build the Android APK

The APK is a Solana Mobile web shell around the hosted game, built by GitHub Actions.

1. Actions → **Build Android APK** → Run workflow.
2. Raise **version_code** by 1 for every new release (1, 2, 3 …).
3. Download the APK from the finished run's Artifacts, or from the Releases page.

Every future update must be signed with this same key, so keep a backup of the keystore and its password outside GitHub.

## Add a reveal picture

1. Save the picture as a square image (1024×1024 or larger) in `art/`, e.g. `art/level-03.webp`.
2. Add its path to the `LEVELS` list at the top of the script in `index.html`.
3. Add the same path to the `CORE` list in `sw.js` and raise the cache name (`sv-blocks-v1` → `sv-blocks-v2`) so phones pick up the change.

Pictures play in the order of the list and start again after the last one.

## Change a tile

Tile images live in `tiles/` (square, 512×512 recommended). Replace a file with the same name, then raise the cache name in `sw.js`.
