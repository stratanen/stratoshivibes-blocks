# Blockspace leaderboard server

Ένα Cloudflare Worker με μια βάση D1. Δωρεάν στο free plan του Cloudflare.
Το παιχνίδι δείχνει το κουμπί «Κατάταξη» μόνο όταν το `https://lb.stratoshivibes.com/health` απαντάει.

## Εγκατάσταση (μία φορά, περίπου 10 λεπτά)

### 1. Βάση δεδομένων (D1)
1. dash.cloudflare.com → **Storage & Databases** → **D1 SQL Database** → **Create**.
2. Όνομα: `blockspace-leaderboard` → **Create**.
3. Άνοιξε τη βάση → καρτέλα **Console**.
4. Επικόλλησε όλο το περιεχόμενο του [`schema.sql`](schema.sql) (κουμπί **Raw**, μετά επιλογή όλων και αντιγραφή) → **Execute**.

### 2. Worker
1. **Workers & Pages** → **Create** → **Create Worker** (Hello World).
2. Όνομα: `blockspace-leaderboard` → **Deploy**.
3. **Edit code** → σβήσε ό,τι υπάρχει → επικόλλησε όλο το [`worker.js`](worker.js) → **Deploy**.

### 3. Σύνδεση Worker και βάσης
1. Στο Worker → **Settings** → **Bindings** → **Add** → **D1 database**.
2. Variable name: `DB` (ακριβώς έτσι, κεφαλαία).
3. D1 database: `blockspace-leaderboard` → **Save** / **Deploy**.

### 4. Διεύθυνση
1. Στο Worker → **Settings** → **Domains & Routes** → **Add** → **Custom domain**.
2. Γράψε `lb.stratoshivibes.com` → **Add domain**. Το Cloudflare φτιάχνει μόνο του την εγγραφή DNS.

### 5. Έλεγχος
Άνοιξε στον browser το `https://lb.stratoshivibes.com/health`.
Πρέπει να δεις κάτι σαν `{"ok":true,"week":"2026-W44"}`.

Μετά κλείσε και άνοιξε το παιχνίδι δύο φορές: στην αρχική εμφανίζεται το κουμπί **Κατάταξη**.

## Χρήσιμα

- **Σβήσιμο σκορ** (π.χ. ύποπτο): στη βάση → Console:
  `DELETE FROM scores WHERE addr = 'ΔΙΕΥΘΥΝΣΗ';`
- **Όριο σκορ ανά παρτίδα:** `MAX_SCORE` στην αρχή του `worker.js` (τώρα 5.000.000).
- Η εβδομαδιαία κατάταξη αλλάζει κάθε Δευτέρα 00:00 UTC (03:00 ώρα Ελλάδας το καλοκαίρι, 02:00 τον χειμώνα).
- Η σύνδεση στην κατάταξη είναι **υπογραφή μηνύματος**, όχι συναλλαγή. Ο server ελέγχει την υπογραφή (ed25519) πριν δεχτεί σκορ από μια διεύθυνση.
