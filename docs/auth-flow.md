# Authentication Flow Document

**Version:** 2.0.0
**Last Updated:** 2026-05-25
**Status:** Final

## Change Log

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-05-25 | 1.0.0 | System | Initial draft |
| 2026-05-25 | 1.1.0 | System | Final — route guard simplified to localStorage check |
| 2026-05-25 | 2.0.0 | System | Final — added initFromStorage boot flow, role resolution, canVerifica, route guard update |

---

## 1. Boot-time Session Restore (InitFromStorage)

On app startup, `src/boot/auth.js` runs `authStore.initFromStorage()` before the app mounts:

```
Boot file              auth.store              localStorage             Directus
  │                       │                       │                       │
  │ initFromStorage()     │                       │                       │
  │─────────────────────> │                       │                       │
  │                       │  get access_token     │                       │
  │                       │  get refresh_token    │                       │
  │                       │──────────────────────│                       │
  │                       │  tokens exist?        │                       │
  │                       │  YES ──────────────────                       │
  │                       │  set state.token      │                       │
  │                       │  set state.refreshToken                       │
  │                       │                       │                       │
  │                       │  fetchUserData()      │                       │
  │                       │───────────────────────│──────────────────────>│
  │                       │                       │  GET /users/me        │
  │                       │                       │<──────────────────────│
  │                       │                       │  GET /items/contatti  │
  │                       │                       │<──────────────────────│
  │                       │                       │  GET /roles/:id       │
  │                       │                       │<──────────────────────│
  │                       │  store user,          │                       │
  │                       │  contatto, role       │                       │
  │                       │  canVerifica=true/false                       │
  │                       │  hasFamiglieAccess=true/false                 │
  │ resolved              │                       │                       │
  │<──────────────────────│                       │                       │
  │ app mounts            │                       │                       │
```

If tokens don't exist in localStorage, the store initializes with `token: null` and `initialized: true` — no API calls are made.

---

## 2. Login Sequence

```
User                  LoginPage              auth.store              Directus
  │                      │                      │                      │
  │  fill email+password │                      │                      │
  │─────────────────────>│                      │                      │
  │                      │  login(email, pass)  │                      │
  │                      │─────────────────────>│                      │
  │                      │                      │  POST /auth/login    │
  │                      │                      │─────────────────────>│
  │                      │                      │                      │
  │                      │                      │  { access_token,     │
  │                      │                      │    refresh_token }   │
  │                      │                      │<─────────────────────│
  │                      │                      │                      │
  │                      │                      │  store in localStorage
  │                      │                      │  store in Pinia state
  │                      │                      │                      │
  │                      │                      │  fetchUserData()     │
  │                      │                      │  → GET /users/me     │
  │                      │                      │  → GET /items/contatti
  │                      │                      │  → resolveUserRole() │
  │                      │                      │  → resolveFamiglieAccess()
  │                      │                      │                      │
  │                      │  if canVerifica      │                      │
  │                      │    → /verifica       │                      │
  │                      │  else                │                      │
  │                      │    → /famiglie       │                      │
  │                      │<─────────────────────│                      │
  │  <redirect>          │                      │                      │
```

---

## 3. Token Refresh Sequence (on 401)

```
Axios interceptor          auth.store           axios (fresh)        Directus
      │                       │                     │                   │
      │  recv 401             │                     │                   │
      │  check isInvalidToken │                     │                   │
      │  set _retry=true      │                     │                   │
      │────────────────────────────────────────────│                   │
      │                       │                     │  POST /auth/refresh
      │                       │                     │  (refresh_token)  │
      │                       │                     │──────────────────>│
      │                       │                     │                   │
      │                       │                     │  new access_token │
      │                       │                     │<──────────────────│
      │                       │                     │                   │
      │  store new token      │                     │                   │
      │  retry original       │                     │                   │
      │  request with         │                     │                   │
      │  new Authorization    │                     │                   │
```

If refresh fails → `clearSessionAndRedirectToLogin()` → localStorage.clear → navigate to `/login`.

---

## 4. Token Storage Strategy

```
localStorage:
  access_token:   string (JWT, expires ~15 min)
  refresh_token:  string (JWT, expires 7 days / 604800s)

Pinia auth.store:
  token: string | null              ← mirrors localStorage
  refreshToken: string | null       ← mirrors localStorage
  user: object | null               ← from GET /users/me
  contatto: object | null           ← from GET /items/contatti
  hasFamiglieAccess: boolean        ← from GET /items/Famiglie_Contatti
  initialized: boolean              ← true after initFromStorage() completes
  loading: boolean
  error: string | null

Getters:
  isAuthenticated     → !!state.token
  roleName            → normalized lowercase role name
  canVerifica         → VERIFICA_ROLE_NAMES or VERIFICA_ROLE_IDS match
  userName            → contatto Nome+Cognome || user.first_name || email
  userId              → state.user?.id
  contattoId          → state.contatto?.id_contatto
```

**Role resolution flow:**
1. JWT payload decoded client-side (`decodeJwtPayload`) to extract `role` ID
2. `resolveUserRole()` calls `authService.getRole(roleId)` to get the full role object with `name`
3. `canVerifica` checks if `roleName` matches `VERIFICA_ROLE_NAMES` or `roleId` matches `VERIFICA_ROLE_IDS`
4. If `directus_roles` table is not readable, `canVerifica` falls back to `VERIFICA_ROLE_IDS` check

**Security notes:**
- localStorage is readable by any JS on the same origin
- XSS protection is essential (sanitize inputs, avoid innerHTML)
- The refresh token has a 7-day TTL; no auto-refresh on tab close
- On logout: both tokens are cleared from localStorage; POST `/auth/logout` invalidates refresh token server-side

---

## 5. Route Guard Logic

```js
// src/router/index.js
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  const isAuthenticated = !!token

  // Logged-in user on public page → redirect to app
  if (isAuthenticated && to.meta.public) {
    const authStore = useAuthStore()
    return next(authStore.canVerifica ? '/verifica' : '/famiglie')
  }

  // Not authenticated on protected page → redirect to login
  if (!isAuthenticated && to.meta.requiresAuth) {
    return next('/login')
  }

  // Non-Verifica user on Verifica page → redirect to famiglie
  if (to.meta.requiredRole) {
    const authStore = useAuthStore()
    if (authStore.initialized && !authStore.canVerifica) {
      return next('/famiglie')
    }
  }

  next()
})
```

Route meta flags:
- `public: true` → `/login` (accessible without auth)
- `requiresAuth: true` → all routes under `AppLayout`
- `requiredRole: 'Verifica'` → `/verifica` (checks canVerifica)

---

## 6. Logout Sequence

```
User → Click Logout (dropdown in AppHeader)
  → auth.store.logout()
    → POST /auth/logout (invalidate refresh token on server)
    → localStorage.removeItem for both tokens
    → Reset all store state (token, user, contatto, etc. → null)
    → Router navigates to /login (via window.location or Vue Router)
```

---

## 7. Password Reset Flow

```
1. User clicks "Password dimenticata?" on LoginPage
2. Enter email → POST /auth/password/request
3. Directus sends email with reset link
4. User clicks link → lands on ResetPassword page
5. Enter new password + confirm → POST /auth/password/reset
   (with reset_token from URL query param)
6. Redirect to /login
```

Requires Directus mail configuration.
