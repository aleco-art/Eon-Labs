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

No environment variables are required for this foundation. Future variables must be documented in `.env.example` without committing secrets.

## Local development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root route redirects to `/companies`.

## Validation

```bash
npm run test
npm run lint
npm run typecheck
npm run format:check
npm run build
```

Run `npm run test:watch` during development and `npm run format` to apply formatting.
