# Full-Stack Dashboard Application

A comprehensive dashboard application with meeting management, user administration, analytics, and task tracking.

## Features

- **Authentication**: Register, login, JWT-based sessions
- **Dashboard**: Stats overview, charts, quick metrics
- **Meetings Management**: 
  - Create/edit/delete meetings
  - Meeting briefs (purpose, goals, agenda)
  - Participant management with extraction from content
  - Task tracking with urgent task highlighting
- **Users Management**: Full CRUD with role-based access
- **Analytics**: Charts, activity logs, statistics
- **Settings**: Profile, security, notifications, privacy

## Tech Stack

### Backend
- Node.js + Express.js
- TypeScript
- PostgreSQL
- JWT Authentication
- Helmet, CORS security

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Zustand (state management)
- React Hook Form + Zod (validation)
- Recharts (charts)

## Deployment

### Backend (Railway)
1. Create new Railway project with PostgreSQL
2. Set environment variables: DATABASE_URL, JWT_SECRET, NODE_ENV=production, AUTO_MIGRATE=true, CORS_ORIGIN

### Frontend (Netlify)
1. Connect to GitHub repo
2. Set NEXT_PUBLIC_API_URL to your Railway backend URL
3. Build command: npm run build
4. Publish directory: .next

## Local Development

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend  
cd frontend && npm install && npm run dev
```

## License

MIT