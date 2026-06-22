# Directus Collections — Gestione Pagamenti

## 1. `Associazioni`

| Campo | Tipo | Note |
|---|---|---|
| `id` | Integer (PK, auto-increment) | — |
| `Nome` | String (255) | unique |
| `Budget` | Decimal (10,2) | importo massimo annuale |

**Dati iniziali:**

| Nome | Budget |
|------|--------|
| Sostieni il Sostegno | 26500.00 |
| La Mongolfiera | 191500.00 |

---

## 2. `BatchPagamenti`

| Campo | Tipo | Note |
|---|---|---|
| `id` | UUID (PK) | — |
| `Nome` | String (255), required | es. "Tranche Luglio 2026" |
| `Associazione` | String (Dropdown) | `Sostieni il Sostegno`, `La Mongolfiera` |
| `DataCreazione` | Timestamp | default `$now` |
| `DataInvioTesoriere` | Timestamp | nullable |
| `CreatoDA` | M2O → `directus_users` | required |

---

## 3. `Pagamenti`

| Campo | Tipo | Note |
|---|---|---|
| `id` | Integer (PK, auto-increment) | — |
| `Progetto` | M2O → `Progetti` | required |
| `Famiglia` | M2O → `Famiglie` | required (denormalizzato) |
| `Importo` | Decimal (10,2) | required |
| `Stato` | String (Dropdown) | `proposto`, `in_pagamento`, `pagato`, `fallito`, `annullato` — default `proposto` |
| `Batch` | M2O → `BatchPagamenti` | nullable |
| `IBAN` | String (34) | required (snapshot al momento creazione) |
| `Intestatario` | String (255) | required (snapshot) |
| `DataProposta` | Timestamp | default `$now` |
| `DataPagamento` | Timestamp | nullable |
| `NoteEsito` | Text | nullable |
| `NotificaInviata` | Boolean | default `false` |

### Relazioni

```
Pagamenti.Progetto → Progetti.id_progetto
Pagamenti.Famiglia → Famiglie.id_famiglia
Pagamenti.Batch → BatchPagamenti.id
```

---

## 4. Campi nuovi su `Progetti`

| Campo | Tipo | Note |
|---|---|---|
| `StatoProgetto` | String (Dropdown) | `aperto`, `chiuso` — default `aperto` |
| `MotivoChiusura` | Text | nullable |
| `DataChiusura` | Timestamp | nullable |
| `TotaleVerificato` | Decimal (10,2) | calcolato e salvato dal sistema |
| `TotaleProposto` | Decimal (10,2) | calcolato e salvato |
| `TotaleInPagamento` | Decimal (10,2) | calcolato e salvato |
| `TotalePagato` | Decimal (10,2) | calcolato e salvato |
| `ResiduoAllocato` | Decimal (10,2) | calcolato e salvato |

---

## 5. API Directus per ricreare in produzione

```bash
# Autenticazione
TOKEN=$(curl -s -X POST https://app.sostienilsostegno.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"..."}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])")

# 1. Collection Pagamenti
curl -s -X POST "https://app.sostienilsostegno.com/collections" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"collection":"Pagamenti","meta":{},"schema":{}}'

curl -s -X POST "https://app.sostienilsostegno.com/fields/Pagamenti" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"field":"Progetto","type":"integer","meta":{"interface":"select-dropdown-m2o","required":true,"width":"half","special":["m2o"]},"schema":{"foreign_key_table":"Progetti","foreign_key_column":"id_progetto"}}'

curl -s -X POST "https://app.sostienilsostegno.com/fields/Pagamenti" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"field":"Famiglia","type":"integer","meta":{"interface":"select-dropdown-m2o","required":true,"width":"half","special":["m2o"]},"schema":{"foreign_key_table":"Famiglie","foreign_key_column":"id_famiglia"}}'

curl -s -X POST "https://app.sostienilsostegno.com/fields/Pagamenti" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"field":"Importo","type":"decimal","meta":{"interface":"input","required":true,"width":"half","options":{"decimals":2}},"schema":{"numeric_precision":10,"numeric_scale":2}}'

curl -s -X POST "https://app.sostienilsostegno.com/fields/Pagamenti" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"field":"Stato","type":"string","meta":{"interface":"select-dropdown","required":true,"width":"half","options":{"choices":[{"text":"Proposto","value":"proposto"},{"text":"In pagamento","value":"in_pagamento"},{"text":"Pagato","value":"pagato"},{"text":"Fallito","value":"fallito"},{"text":"Annullato","value":"annullato"}]}},"schema":{"default_value":"proposto"}}'

curl -s -X POST "https://app.sostienilsostegno.com/fields/Pagamenti" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"field":"Batch","type":"uuid","meta":{"interface":"select-dropdown-m2o","width":"half","special":["m2o"]},"schema":{"foreign_key_table":"BatchPagamenti","foreign_key_column":"id"}}'

curl -s -X POST "https://app.sostienilsostegno.com/fields/Pagamenti" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"field":"IBAN","type":"string","meta":{"interface":"input","required":true,"width":"half","options":{"maxLength":34}},"schema":{"max_length":34}}'

curl -s -X POST "https://app.sostienilsostegno.com/fields/Pagamenti" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"field":"Intestatario","type":"string","meta":{"interface":"input","required":true,"width":"half","options":{"maxLength":255}},"schema":{"max_length":255}}'

curl -s -X POST "https://app.sostienilsostegno.com/fields/Pagamenti" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"field":"DataProposta","type":"timestamp","meta":{"interface":"datetime","required":true,"width":"half"},"schema":{"default_value":"$now"}}'

curl -s -X POST "https://app.sostienilsostegno.com/fields/Pagamenti" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"field":"DataPagamento","type":"timestamp","meta":{"interface":"datetime","width":"half"},"schema":{"is_nullable":true}}'

curl -s -X POST "https://app.sostienilsostegno.com/fields/Pagamenti" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"field":"NoteEsito","type":"text","meta":{"interface":"input-multiline","width":"full"},"schema":{"is_nullable":true}}'

curl -s -X POST "https://app.sostienilsostegno.com/fields/Pagamenti" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"field":"NotificaInviata","type":"boolean","meta":{"interface":"boolean","width":"half"},"schema":{"default_value":false}}'

# 2. Campi su Progetti
for field in '{"field":"StatoProgetto","type":"string","meta":{"interface":"select-dropdown","width":"half","options":{"choices":[{"text":"Aperto","value":"aperto"},{"text":"Chiuso","value":"chiuso"}]}},"schema":{"default_value":"aperto"}}' \
             '{"field":"MotivoChiusura","type":"text","meta":{"interface":"input-multiline","width":"full"},"schema":{"is_nullable":true}}' \
             '{"field":"DataChiusura","type":"timestamp","meta":{"interface":"datetime","width":"half"},"schema":{"is_nullable":true}}' \
             '{"field":"TotaleVerificato","type":"decimal","meta":{"interface":"input","width":"half","options":{"decimals":2}},"schema":{"is_nullable":true,"numeric_precision":10,"numeric_scale":2}}' \
             '{"field":"TotaleProposto","type":"decimal","meta":{"interface":"input","width":"half","options":{"decimals":2}},"schema":{"is_nullable":true,"numeric_precision":10,"numeric_scale":2}}' \
             '{"field":"TotaleInPagamento","type":"decimal","meta":{"interface":"input","width":"half","options":{"decimals":2}},"schema":{"is_nullable":true,"numeric_precision":10,"numeric_scale":2}}' \
             '{"field":"TotalePagato","type":"decimal","meta":{"interface":"input","width":"half","options":{"decimals":2}},"schema":{"is_nullable":true,"numeric_precision":10,"numeric_scale":2}}' \
             '{"field":"ResiduoAllocato","type":"decimal","meta":{"interface":"input","width":"half","options":{"decimals":2}},"schema":{"is_nullable":true,"numeric_precision":10,"numeric_scale":2}}'; do
  curl -s -X POST "https://app.sostienilsostegno.com/fields/Progetti" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "$field"
done

# 3. Dati Associazioni (se non inseriti)
curl -s -X POST "https://app.sostienilsostegno.com/items/Associazioni" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"Nome":"Sostieni il Sostegno","Budget":26500}'

curl -s -X POST "https://app.sostienilsostegno.com/items/Associazioni" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"Nome":"La Mongolfiera","Budget":191500}'
```

---

## 6. Permessi Directus

| Collection | Volontario | Verificatore | Admin |
|---|---|---|---|
| `Associazioni` | Nessuno | Read | Full CRUD |
| `BatchPagamenti` | Nessuno | Read, Create | Full CRUD |
| `Pagamenti` | Nessuno | Read, Create, Update (no Delete) | Full CRUD |
| `Progetti` (nuovi campi) | Read | Read + Update su `StatoProgetto`, `MotivoChiusura`, `DataChiusura` | Full |
