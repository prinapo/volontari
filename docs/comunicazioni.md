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
famiglie senza volontario, territorio/associazione.

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
