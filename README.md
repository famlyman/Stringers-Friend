# Stringer's Friend

A React PWA for tennis stringers to manage customers, racquets, stringing jobs, and inventory.

## Features

- Shop management for stringers
- Customer & racquet tracking with QR codes
- Stringing job status tracking
- Inventory management
- Push notifications via Supabase

## Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS + React Router
- **Backend**: Express + Supabase Edge Functions
- **Auth**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Notifications**: Supabase Realtime

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a Supabase project at [supabase.com](https://supabase.com)

3. Copy `.env.example` to `.env.local` and fill in your credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_GEMINI_API_KEY=your-gemini-key
   ```

4. Run the database schema:
   - Open Supabase SQL Editor
   - Paste the contents of `supabase/schema.sql` and run

5. Run the app:
   ```bash
   npm run dev
   ```

## Supabase Edge Functions

Notifications are handled by Edge Functions:
- `supabase/functions/send-notification/index.ts`

Deploy with:
```bash
supabase functions deploy send-notification
```

## Scripts

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - TypeScript check