# VytalWatch Development Guide

## Project Structure
- `vitalwatch-backend/` — NestJS API server (TypeScript)
- `vitalwatch-frontend/` — Next.js 14 frontend (TypeScript, Tailwind CSS)

## Quick Start
```bash
# Backend
cd vitalwatch-backend && cp .env.example .env && npm install && npm run start:dev

# Frontend
cd vitalwatch-frontend && cp .env.example .env.local && npm install && npm run dev
```

## Key Commands
### Backend
- `npm run start:dev` — Start dev server (port 3001)
- `npm run test` — Run unit tests
- `npm run test:e2e` — Run E2E tests
- `npm run lint` — Lint code
- `npm run build` — Build for production
- `npm run migration:run` — Run database migrations
- `npm run migration:generate` — Generate migration from entity changes

### Frontend
- `npm run dev` — Start dev server (port 3000)
- `npm run test` — Run Jest tests
- `npm run lint` — Lint code
- `npm run build` — Build for production

## Architecture
- **Auth**: JWT access + refresh tokens with rotation, bcrypt passwords, account lockout
- **Database**: PostgreSQL via TypeORM, Redis for caching/sessions, InfluxDB for time-series vitals
- **Real-time**: WebSocket gateway for live vital updates, WebRTC for video calls
- **AI**: OpenAI + Grok integration for patient insights, rule-based fallback
- **Billing**: Stripe integration, CPT code support, subscription management
- **Monitoring**: Winston structured logging, Sentry error tracking

## API Documentation
Available at `/api/docs` (Swagger UI) when backend is running.

## Environment
Copy `.env.example` files and configure. Required: PostgreSQL, Redis. Optional: InfluxDB, Stripe, OpenAI.

## Testing
- Backend: Jest + Supertest (88 E2E tests across 5 suites)
- Frontend: Jest + React Testing Library
- Run `npm test` in each directory

## Docker
```bash
docker-compose up        # Development
docker-compose -f docker-compose.prod.yml up  # Production
```
