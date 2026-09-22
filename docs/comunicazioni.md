# Comunicazioni — email verso volontari e famiglie

Modulo di comunicazione interna (email 1-a-1 via **Brevo**) con segmentazione sui
dati Directus e log CRM per contatto/famiglia.

## Architettura

```
Frontend (wizard) ──HTTP──> Directus /communications/send ──HTTP──> Brevo API
                                │
                                ├── legge contatti/Famiglie/Progetti/Giustificativi/Pagamenti
                                └── scrive Comunicazioni + Comunicazioni_Contatti (log CRM)
```

- **Estensione Directus** (endpoint): `directus-extensions/communications/`
  → vedi `README.md` della cartella per env e dettagli API.
- **Collezioni** di log: `Comunicazioni`, `Comunicazioni_Contatti` (DB, non git).
- **Frontend**: pagina "Comunicazioni" (wizard) + invio singolo da scheda +
  storico nelle schede contatto/famiglia.

## Env (compose Directus, dev e prod)

| Variabile             | Descrizione                                                      |
| --------------------- | ---------------------------------------------------------------- |
| `BREVO_API_KEY`       | API key transazionale Brevo                                      |
| `BREVO_SENDER_EMAIL`  | mittente (dominio/sender verificato su Brevo)                    |
| `BREVO_SENDER_NAME`   | nome mittente (opzionale)                                        |
| `COMMS_ALLOWED_ROLES` | UUID dei ruoli abilitati (oltre agli admin), separati da virgola |

## 1. Collezione `Comunicazioni`

| Campo          | Tipo                   | Note                                        |
| -------------- | ---------------------- | ------------------------------------------- |
| `id`           | Integer (PK, auto)     |                                             |
| `Oggetto`      | String (255)           | required                                    |
| `Corpo`        | Text                   | required (testo semplice)                   |
| `DataInvio`    | Timestamp              |                                             |
| `Mittente`     | M2O → `directus_users` | chi ha inviato                              |
| `Tipo`         | String (50)            | `contatti` / `famiglie` / `contatto`        |
| `Filtri`       | JSON                   | segmento usato (audit)                      |
| `NInviati`     | Integer (default `0`)  |                                             |
| `NFalliti`     | Integer (default `0`)  |                                             |
| `Stato`        | String (20)            | `in_invio`/`completato`/`parziale`/`errore` |
| `LinkAllegato` | String (500)           | link accodato nel corpo                     |

## 2. Collezione `Comunicazioni_Contatti` (log per destinatario)

| Campo            | Tipo                  | Note                           |
| ---------------- | --------------------- | ------------------------------ |
| `id`             | Integer (PK, auto)    |                                |
| `Comunicazione`  | M2O → `Comunicazioni` | required                       |
| `Contatto`       | M2O → `contatti`      | nullable                       |
| `Famiglia`       | M2O → `Famiglie`      | nullable (contesto)            |
| `Email`          | String (255)          | snapshot al momento dell'invio |
| `Esito`          | String (20)           | `inviata` / `fallita`          |
| `Errore`         | Text                  | messaggio in caso di fallita   |
| `BrevoMessageId` | String (255)          | id restituito da Brevo         |

Le relazioni M2O generano automaticamente le reverse O2M su `contatti` e
`Famiglie`: da lì la UI mostra lo storico nelle schede.

## 3. Permessi

- Admin: pieno accesso (implicito).
- **Manager**: `read` su `Comunicazioni` e `Comunicazioni_Contatti` (per vedere
  lo storico). La scrittura avviene solo lato server con accountability admin,
  quindi non serve `create` per il manager.
- Volontari: nessun accesso.

Le policy vivono nel DB (non in git): applicarle a mano via UI Admin su dev e prod.

## 4. Deploy dell'estensione

```bash
cd directus-extensions/communications
npm install
npm run build            # produce dist/index.js
```

Copiare l'intera cartella in `<directus>/extensions/communications/` (incluso
`dist/`) e riavviare il container Directus. Il `dist/` non è versionato.

In dev l'app chiama l'API su `https://development.sostienilsostegno.com` e nginx
proxy-a a Directus solo alcune route: serve aggiungere anche **`location /communications/`**
(come per `/sync/`), altrimenti le chiamate cadono sulla SPA.

## 5. Filtri supportati

Costruiti nel frontend (`src/utils/filtriComunicazioni.js`) e passati
all'endpoint: ruolo (volontario/genitore/referente), referente, stato progetto +
anno bando, giustificativi (nessuno/solo draft/almeno uno inviato), pagamenti,
famiglie senza volontario, territorio/associazione e **"cognome contiene"**
(`cognome`, post-filtro case-insensitive lato endpoint).

## 6. Email primarie (invariante)

Invariante: **esattamente una email `Primary` per contatto**. L'invio sceglie la
primaria e, se i dati sono ambigui, quella con **id minore** (la più vecchia).

**A1 — Default del campo (Directus Studio, replicabile in prod)**

- Settings → Data Model → `email` → campo `Primary` → **Default Value = off**
  (false). Così le nuove email non nascono più primarie.
- Su dev è già applicato (`default_value = false`).

**A2 — Migrazione dati via UI (Admin)**

- Admin → tab **Check** → **"Verifica email primarie"** → **"Correggi tutte"**.
- Mantiene la primaria con id minore, azzera le eccedenti; se un contatto non ha
  primarie, promuove la più vecchia. **Idempotente** (rieseguito: 0 anomalie).
- Usa lo use case `normalizzaEmailPrimarie` (`src/usecases/email.js`); la
  rilevazione pura è in `src/utils/emailPrimarie.js`.

**UI "cambia primaria"**: impostare una email come primaria (Gestione →
ContattoDialog; Impostazioni) rende automaticamente non primarie le altre, via
use case `impostaEmailPrimaria`.

## 7. Relazioni M2O (dev + prod)

Le collezioni log richiedono **4 relazioni M2O registrate** in
`directus_relations`. Se mancano, i campi annidati (`Comunicazione.Oggetto`,
`Comunicazione.Mittente.*`) non si risolvono e lo **storico in app resta vuoto**
(è il bug riscontrato su dev e già corretto):

- `Comunicazioni_Contatti.Comunicazione` → `Comunicazioni`
- `Comunicazioni_Contatti.Contatto` → `contatti` (FK `id_contatto`)
- `Comunicazioni_Contatti.Famiglia` → `Famiglie` (FK `id_famiglia`)
- `Comunicazioni.Mittente` → `directus_users`

**GUI (Directus Studio, da usare in prod)**

1. Settings → Data Model → `Comunicazioni_Contatti`.
2. Campo `Comunicazione` → crea/collega la relazione M2O verso `Comunicazioni`.
3. Idem per `Contatto` → `contatti` e `Famiglia` → `Famiglie`.
4. Su `Comunicazioni`, campo `Mittente` → M2O verso `directus_users`.

**API (usata su dev)**: `POST /relations` con
`{ "collection", "field", "related_collection", "schema": { "on_delete": "SET NULL" } }`.

⚠️ Creare una M2O via `POST /fields` con `special: ['m2o']` **non** registra la
relazione: va creata esplicitamente, altrimenti i campi annidati falliscono.

## 8. Click sull'email

- **Admin/manager**: cliccare un indirizzo apre il **mailer interno**
  (`InviaEmailDialog`), che logga la comunicazione (audience `email`, il contatto
  viene risolto dall'indirizzo).
- **Volontario**: resta il link `mailto:` (scrive dalla propria casella).
- Storia comunicazioni del **contatto**: accordion "Comunicazioni inviate" nella
  scheda contatto (Gestione → Contatti). Storia della **famiglia**: sezione nel
  Dettaglio progetto.
