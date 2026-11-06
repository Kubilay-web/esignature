# İmzala — Frontend (Vue 3)

Vue 3 + TypeScript + Vite single-page app for the İmzala e-signature backend (`../backend`).

| | |
| --- | --- |
| UI | Vue 3 (`<script setup>`, Composition API), Tailwind CSS 4 |
| State | Pinia — `auth` (logged-in user), `preferences` (language, theme) |
| Routing | Vue Router — route `meta.auth` / `meta.guest` checked in one `beforeEach` guard |
| HTTP | axios instance (`src/lib/api.ts`): sends the httpOnly cookie, `Accept-Language`, turns errors into `ApiError` |
| Tests | Vitest + Vue Testing Library + axios-mock-adapter |

## Run

```bash
npm install
# create .env with: VITE_API_URL=http://localhost:3001/api
npm run dev              # http://localhost:3000
```

The backend only accepts requests from `FRONTEND_URL` (`http://localhost:3000`), so the dev server uses port 3000.

| Command | |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Type-check (`vue-tsc`) + production build into `dist/` |
| `npm test` | Unit/component tests |

## Structure

```
src/
├── main.ts               app + Pinia + router
├── App.vue               navbar + <RouterView>
├── router/index.ts       routes and the auth guard
├── stores/               auth.ts, preferences.ts (Pinia)
├── lib/                  api.ts (axios), i18n.ts (TR/EN), types.ts
├── components/
│   ├── ui/               BaseInput, BaseButton, BaseCard, BaseAlert, StatusBadge, PageShell...
│   ├── DocumentForm.vue  create / edit (PDF upload, ordered signers)
│   ├── SignPanel.vue     screen signature, mobile (OTP) signature, reject
│   ├── SignaturePad.vue  canvas (mouse, touch, pen)
│   └── PdfViewer.vue     PDF fetched with the cookie, shown from a blob: URL
└── views/                Login, Register, Documents, NewDocument, DocumentDetail, EditDocument, Audit, Profile
```

## Notes

- Pages are lazy-loaded (`() => import(...)`), so each page is its own small chunk.
- The saved theme is applied by a tiny inline script in `index.html` before Vue starts, so dark mode never flashes white.
- Language switching is instant: every text comes from `t()` in `useI18n()`, which reads the Pinia store.
