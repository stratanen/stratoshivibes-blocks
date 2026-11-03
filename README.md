# Blockspace

Neon block puzzle for the Solana Seeker. Drag pieces onto an 8×8 board, clear rows and columns, and every clear reveals part of a picture. Free to play, no ads. Connecting a wallet is optional (it unlocks Vol.1 Degens holder pictures), and an optional Shop sells in-game extras for SKR, SOL or USDC. No tokens or real-money rewards.

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

## Build for Google Play (AAB)

The Google Play edition is a Trusted Web Activity (built with Bubblewrap) that opens the game with `?edition=play`. There is no wallet connection and no Seeker Perks; the Shop sells the Supporter Pack and packs of 5 Second Chances through Google Play Billing. Package name: `com.stratoshivibes.blockspace`, so it can be installed next to the dApp Store version.

1. Actions → **Build Google Play bundle (AAB)** → Run workflow.
2. Raise **version_code** by 1 for every upload to Google Play (its numbering is separate from the dApp Store APK).
3. Download the `.aab` from the finished run's Artifacts (or the pre-release on the Releases page) and upload it in Play Console.

The bundle is signed with the same StratoshiVibes key, used as the Play upload key.

- **Purchase checks:** a Cloudflare Worker at `pay.stratoshivibes.com` checks every purchase with Google and acknowledges the Supporter Pack. Setup: [`play-billing/README.md`](play-billing/README.md).
- **Digital Asset Links:** `.well-known/assetlinks.json` must list the SHA-256 of the upload key and of the **Play app signing key** (Play Console → Test and release → App integrity). Without it, the app shows a browser address bar and purchases do not work.

## Add a reveal picture

1. Save the picture as a square image (1024×1024 or larger) in `art/`, e.g. `art/level-03.webp`.
2. Add its path to the `LEVELS` list at the top of the script in `index.html`.
3. Add the same path to the `CORE` list in `sw.js` and raise the cache name (`sv-blocks-v1` → `sv-blocks-v2`) so phones pick up the change.

Pictures play in the order of the list and start again after the last one.

## Change a tile

Tile images live in `tiles/` (square, 512×512 recommended). Replace a file with the same name, then raise the cache name in `sw.js`.
