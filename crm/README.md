# Eon CRM

Independent foundation for the Eon CRM. Task 01 provides the application shell and primary navigation only; CRM data and workflows are intentionally not implemented yet.

## Requirements

- Node.js 22.23.2 (`.nvmrc` is included)
- npm 10.9.x

## Installation

```bash
nvm use
npm ci
```

## Database

Copy `.env.example` to `.env.local` and set `DATABASE_URL` to the PostgreSQL
connection string. Do not commit `.env.local`.

```bash
npm run db:migrate
npm run test:db
```

## Local development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root route redirects to `/companies`.

## Validation

```bash
npm run test
npm run test:db
npm run lint
npm run typecheck
npm run format:check
npm run build
```

Run `npm run test:watch` during development and `npm run format` to apply formatting.
