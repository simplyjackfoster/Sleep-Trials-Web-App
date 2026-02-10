# Sleep Trials

A competitive sleep tracking web app for friend groups. Submit nightly sleep stats, earn points, and climb the leaderboard.

## Features

- **Groups**: Create or join private groups with a invite code.
- **Sleep Tracking**: Log sleep duration (from Oura, Apple Watch, Garmin, or Manual).
- **Scoring Engine**:
  - **Rank-based**: Points based on daily rank relative to other submitters.
  - **Threshold-based**: Points based on duration buckets (e.g., >7.5h = +3pts).
  - **Streaks**: Bonus points for consistent sleep.
- **Leaderboards**: Daily, Weekly, and All-time stats.
- **Auditable**: All score events are recorded with reasons.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite (Dev) / Postgres (Prod) via Prisma 6
- **Auth**: NextAuth.js (Google & Email)
- **Testing**: Vitest

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Set up Environment Variables:
   Copy `.env.example` to `.env` (or create `.env`):
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="supersecret"
   
   # Google OAuth (Optional for local dev if using Email)
   GOOGLE_CLIENT_ID=""
   GOOGLE_CLIENT_SECRET=""
   
   # Email Provider (Optional)
   EMAIL_SERVER=""
   EMAIL_FROM=""
   ```

3. Initialize Database:
   ```bash
   npx prisma migrate dev --name init
   ```

4. Seed Demo Data (Optional):
   ```bash
   npx prisma db seed
   ```

5. Run Development Server:
   ```bash
   npm run dev
   ```

6. Run Tests:
   ```bash
   npx vitest run
   ```

## Scoring Rules

Groups can convert between two modes:

### Rank-Based
- Users are ranked by sleep duration for the day.
- Rank 1 gets N points (where N is number of submitters).
- Last place gets 1 point.
- Non-submission gets 0 points.

### Threshold-Based
- **< 4.5h**: -1 pt (Penalty)
- **4.5h - 5.5h**: 0 pts
- **5.5h - 6.5h**: +1 pt
- **6.5h - 7.5h**: +2 pts
- **> 7.5h**: +3 pts
- **Daily Winner Bonus**: +1 pt
- **Non-submission**: -1 pt

## Deployment

Deploy to Vercel:

1. Push to GitHub.
2. Import project in Vercel.
3. Set Environment Variables (`DATABASE_URL`, `NEXTAUTH_SECRET`, etc.).
4. For Database, use Vercel Postgres, Neon, or Supabase. Update `DATABASE_URL` accordingly.
5. Build command: `next build` (default).
6. Install command: `npm install` (default).
