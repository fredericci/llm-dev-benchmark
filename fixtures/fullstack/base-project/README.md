# Fullstack App — NestJS + React

A fullstack application with a NestJS backend and Vite React frontend.

## Project Structure

```
backend/           NestJS API server (TypeScript, TypeORM, SQLite)
  src/
    main.ts        Bootstrap (port via env PORT, default 3000)
    app.module.ts  Root module
    app.controller.ts  GET /api/health
    database/
      database.module.ts  TypeORM + SQLite config
      seed.ts             Seeds 20 users on startup
    users/
      user.entity.ts      User entity (id, name, email, password, avatar, role, createdAt)
      users.module.ts
      users.service.ts    findAll, findById, findByEmail
      users.controller.ts GET /api/users

frontend/          React app with Vite (TypeScript, React Router)
  src/
    main.tsx       Entry point
    App.tsx        Router: / (Landing), /login (placeholder)
    pages/
      Landing.tsx  Landing page
    components/
      Header.tsx   Header with logo + nav links
    styles/
      global.css   CSS variables, reset

e2e/               Playwright test specs
```

## Database

- SQLite via TypeORM (file: backend/db.sqlite)
- User entity with bcrypt-hashed passwords
- Seeded with 20 users on startup

### Test Users

| Email | Password | Name | Role |
|-------|----------|------|------|
| admin@example.com | Admin123! | Admin User | admin |
| jane@example.com | Jane123! | Jane Smith | user |

## Commands

```bash
# Install all dependencies
cd backend && npm install
cd ../frontend && npm install

# Start backend (production)
cd backend && npm run build && node dist/main.js

# Start frontend (dev)
cd frontend && npm run dev

# Build frontend
cd frontend && npm run build
```

## API Endpoints

- `GET /api/health` — Health check
- `GET /api/users` — List all users

The backend serves the frontend build from `frontend/dist/` via `@nestjs/serve-static`.
