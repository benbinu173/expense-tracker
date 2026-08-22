# Finance Tracker

A personal finance tracker: log income and expenses, see the balance and a category
breakdown for a chosen week, month, or year.

- **What it does and what it deliberately doesn't** — [SPEC.md](SPEC.md)
- **Stack, conventions, and build order** — [CLAUDE.md](CLAUDE.md)

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase project URL and publishable key
npm run dev
```

Then open http://localhost:3000.

The publishable key (`sb_publishable_…`) is safe in a `NEXT_PUBLIC_` variable — row level
security is what protects the data. Never add a secret or `service_role` key.

Note: `npm run typecheck` needs a `build` or `dev` run first, because Next generates the
`PageProps` / `LayoutProps` route types into `.next/types`.

## Scripts

| command             | what it does               |
| ------------------- | -------------------------- |
| `npm run dev`       | dev server (Turbopack)     |
| `npm run build`     | production build           |
| `npm run start`     | serve the production build |
| `npm run lint`      | ESLint                     |
| `npm run typecheck` | `tsc --noEmit`             |
| `npm run format`    | Prettier write             |
