# Directus Extension — Communications

Endpoint Directus per l'invio di **email 1-a-1 via Brevo** verso volontari e
famiglie, con log CRM (`Comunicazioni` + `Comunicazioni_Contatti`).

## Env richieste

| Variabile             | Descrizione                                                      |
| --------------------- | ---------------------------------------------------------------- |
| `BREVO_API_KEY`       | API key transazionale Brevo (`v3/smtp/email`)                    |
| `BREVO_SENDER_EMAIL`  | mittente (deve essere un dominio/sender verificato su Brevo)     |
| `BREVO_SENDER_NAME`   | nome mittente (opzionale)                                        |
| `COMMS_ALLOWED_ROLES` | UUID dei ruoli abilitati (oltre agli admin), separati da virgola |

## Endpoint (montati su `/communications`)

### `GET /communications/ping`

Diagnostica: `{ ok, brevo, sender }` (non espone la chiave).

### `POST /communications/recipients`

Risolve i destinatari da un audience/filtro e ritorna la **lista completa**
(usata dal wizard per la selezione manuale).

```json
{
  "audience": "contatti | famiglie | contatto",
  "filter": { "IsVolontario": { "_eq": true } },
  "filterFamiglia": { "Progetti": { "_some": { "StatoProgetto": { "_eq": "accettato" } } } },
  "ruoli": ["Volontario", "Genitore"],
  "contattoId": 123,
  "cognome": "prin",
  "limit": 1000
}
```

`cognome` (opzionale) è un post-filtro case-insensitive sul cognome dei
destinatari risolti (sottostringa). `limit` (opzionale) tronca la lista
restituita; senza `limit` ritorna tutti i destinatari.

Risposta: `{ "count": 42, "recipients": [ … ], "sample": [ … ] }`
(`count` = totale risolto, `recipients` = lista, eventualmente troncata da `limit`;
`sample` = primi 25, mantenuto per retro-compatibilità con la SPA ≤ 4.0.17).

### `POST /communications/send`

Come `/recipients`, più `subject`, `body`, `link` (opzionale), `tipo`.

In alternativa alla risoluzione da audience/filtro, puoi passare un elenco
esplicito **`recipients`** (gli oggetti restituiti da `/recipients`): se presente
e non vuoto, l'invio avviene **solo** verso quelli (selezione manuale del wizard).

Risposta: `{ comunicazioneId, totale, inviati, falliti, errori: [{ email, message }] }`.

- Il corpo è **testo semplice**: i segnaposto `{nome}`, `{cognome}`, `{famiglia}`,
  `{email}` sono sostituiti per destinatario; i ritorni a capo diventano `<br/>`.
- `link` viene accodato come URL nel corpo.
- Dedup per email; una chiamata Brevo per destinatario (concorrenza 5).
- Ogni invio scrive una riga in `Comunicazioni_Contatti` (esito e message-id).

## Collezioni attese

- `Comunicazioni`: `Oggetto`, `Corpo`, `DataInvio`, `Mittente` (→ directus_users),
  `Tipo`, `Filtri` (JSON), `NInviati`, `NFalliti`, `Stato`, `LinkAllegato`.
- `Comunicazioni_Contatti`: `Comunicazione`, `Contatto`, `Famiglia`, `Email`,
  `Esito`, `Errore`, `BrevoMessageId`.

## Sviluppo e deploy

```bash
npm install        # solo per il build (SDK)
npm run build      # produce dist/index.js
```

Deploy: copiare l'intera cartella (incluso `dist/`) in
`<directus>/extensions/communications/` e riavviare il container Directus.
Il `dist/` non è versionato: va rigenerato con `npm run build`.
