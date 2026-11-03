# Blockspace: έλεγχος αγορών Google Play

Ένα μικρό Cloudflare Worker, όπως αυτό της κατάταξης, στη διεύθυνση `pay.stratoshivibes.com`.
Το Google Play edition του παιχνιδιού του στέλνει κάθε αγορά. Το Worker ρωτάει την Google αν η αγορά είναι πραγματική και πληρωμένη και **επιβεβαιώνει (acknowledge)** το Supporter Pack. Αν μια αγορά δεν επιβεβαιωθεί μέσα σε 3 μέρες, η Google κάνει αυτόματα επιστροφή χρημάτων.

Κάνεις τη ρύθμιση **αφού** εγκριθεί ο λογαριασμός Play Console και ανέβει το πρώτο build.

## Προϊόντα στο Play Console

Play Console → η εφαρμογή → **Monetize with Play → Products → In-app products** → **Create product**:

| Product ID | Όνομα | Τιμή |
|---|---|---|
| `supporter_pack` | Supporter Pack | 2,99 € |
| `second_chance_5` | 5 Second Chances | 0,99 € |

Τα Product ID πρέπει να είναι **ακριβώς** αυτά. Μετά πατάς **Activate** σε καθένα.

## 1. Google Cloud: λογαριασμός υπηρεσίας (service account)

1. console.cloud.google.com → φτιάξε project (π.χ. `stratoshivibes-play`).
2. **APIs & Services → Library** → βρες **Google Play Android Developer API** → **Enable**.
3. **IAM & Admin → Service Accounts → Create service account**. Όνομα: `blockspace-pay` → **Done**. Δεν χρειάζονται ρόλοι.
4. Άνοιξε το service account → **Keys → Add key → Create new key → JSON**. Κατεβαίνει ένα αρχείο `.json`. **Μην το μοιραστείς με κανέναν.**
5. Αντέγραψε το email του service account (μοιάζει με `blockspace-pay@...iam.gserviceaccount.com`).

## 2. Play Console: δικαιώματα

Play Console → **Users and permissions → Invite new users** → επικόλλησε το email του service account.
Στην καρτέλα **App permissions** πρόσθεσε το Blockspace με:
- **View financial data, orders and cancellation survey responses**
- **Manage orders and subscriptions**

→ **Invite user**. Μπορεί να χρειαστούν λίγες ώρες μέχρι να ενεργοποιηθεί.

## 3. Cloudflare Worker

1. dash.cloudflare.com → **Workers & Pages → Create → Create Worker**. Όνομα: `blockspace-pay` → **Deploy**.
2. **Edit code** → σβήσε ό,τι υπάρχει → επικόλλησε όλο το [`worker.js`](worker.js) → **Deploy**.
3. **Settings → Variables and Secrets → Add** → Type **Secret**, όνομα `GOOGLE_SA_KEY`, τιμή: **όλο** το περιεχόμενο του αρχείου `.json` → **Deploy**.
4. **Settings → Domains & Routes → Add → Custom domain** → `pay.stratoshivibes.com`.

## 4. Έλεγχος

Άνοιξε `https://pay.stratoshivibes.com/health`. Πρέπει να δεις `{"ok":true,"configured":true}`.

Δοκιμαστικές αγορές: Play Console → **Settings → License testing** → πρόσθεσε το Gmail σου. Με αυτό αγοράζεις στο closed testing χωρίς χρέωση.
