# Authentication Flow Document

**Version:** 1.1.0
**Last Updated:** 2026-05-25
**Status:** Final

## Change Log

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-05-25 | 1.0.0 | System | Initial draft |
| 2026-05-25 | 1.1.0 | System | Final — route guard simplified to localStorage check |

---

## 1. Login Sequence

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
  │                      │                      │  GET /users/me       │
  │                      │                      │─────────────────────>│
  │                      │                      │  { data: { id, ... }}│
  │                      │                      │<─────────────────────│
  │                      │                      │                      │
  │                      │  navigate(/famiglie) │                      │
  │                      │<─────────────────────│                      │
  │  <redirect>          │                      │                      │
```

---

## 2. Token Refresh Sequence (on 401)

```
Axios interceptor          auth.store              Directus
      │                       │                      │
      │  recv 401             │                      │
      │──────────────────────>│                      │
      │                       │  POST /auth/refresh  │
      │                       │  (refresh_token)     │
      │                       │─────────────────────>│
      │                       │                      │
      │                       │  new access_token    │
      │                       │<─────────────────────│
      │                       │                      │
      │  retry original       │                      │
      │  request with         │                      │
      │  new token            │                      │
```

If refresh fails → clear localStorage → redirect to `/login`.

---

## 3. Token Storage Strategy

```
localStorage:
  access_token:   string (JWT, expires ~15 min)
  refresh_token:  string (JWT, expires 7 days / 604800s)
  directus_url:   string ("https://app.sostienilsostegno.com")

Pinia auth.store:
  token: string | null          ← mirrors localStorage
  refreshToken: string | null   ← mirrors localStorage
  user: object | null           ← from GET /users/me
  contatto: object | null       ← from GET /items/contatti
  loading: boolean
  error: string | null
```

**Security notes:**
- localStorage is readable by any JS on the same origin
- XSS protection is essential (sanitize inputs, avoid innerHTML)
- The refresh token has a 7-day TTL; no auto-refresh on tab close
- On logout: both tokens are cleared from localStorage

---

## 4. Route Guard Logic

```js
// router/guards.js
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('access_token')
  const isAuthenticated = !!token
  const publicPages = ['/login']

  if (isAuthenticated && to.path === '/login') {
    return next('/famiglie')
  }

  if (!isAuthenticated && !publicPages.includes(to.path)) {
    return next('/login')
  }

  next()
})
```

---

## 5. Logout Sequence

```
User → Click Logout
  → auth.store.logout()
    → POST /auth/logout (invalidate refresh token on server)
    → localStorage.clear()
    → router.push('/login')
    → Reset all store states
```

---

## 6. Password Reset Flow (Future)

```
1. User clicks "Forgot password?" on LoginPage
2. Enter email → POST /auth/password/request
3. Directus sends email with reset link
4. User clicks link → lands on ResetPassword page
5. Enter new password + confirm → POST /auth/password/reset
   (with reset_token from URL query param)
6. Redirect to /login
```

Requires Directus mail configuration (not yet configured).
