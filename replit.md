# Us - Couples Relationship App

## Overview
"Us" is a couples relationship app that provides shared spaces for partners to communicate, plan, and grow together. Originally built on Lovable with Supabase backend, now migrated to run on Replit with Express serving the frontend and API routes.

## Architecture
- **Frontend**: React SPA with Vite, TailwindCSS, shadcn/ui components
- **Backend**: Express server (port 5000) serving both the Vite frontend and API routes
- **Database**: Supabase (external) for auth, database, storage, and realtime subscriptions
- **API Routes**: 18 Supabase Edge Functions ported to Express `/api/*` routes in `server/routes.ts`

## Project Structure
```
server/
  index.ts          - Express server entry point
  routes.ts         - All API routes (ported Edge Functions)
  vite.ts           - Vite dev server middleware
  db.ts             - Drizzle ORM database connection
shared/
  schema.ts         - Drizzle schema mirroring Supabase tables
src/
  pages/            - React page components
  components/       - React UI components
  hooks/            - Custom React hooks
  contexts/         - React context providers (AuthContext)
  lib/              - Utility libraries
    api.ts          - apiInvoke helper for calling Express API routes
  integrations/
    supabase/       - Supabase client configuration
```

## Key Features
- Partner messaging (Chat) with push notifications
- Shared calendar with Outlook sync
- Shared lists and bucket lists
- Discover Together (AI-powered suggestions for experiences, products, travel, intimacy)
- Feed content with AI generation
- Photo sharing
- Games (Kiss Chase, Truth or Dare, Would You Rather, etc.)
- Family quiz and task management
- Mood check-ins
- Instagram feed widget
- Substack newsletter feed

## API Routes
All routes are defined in `server/routes.ts`:
- `GET /api/health` - Health check
- `GET /api/search-gifs` - GIPHY search (needs GIPHY_API_KEY)
- `POST /api/send-push-notification` - FCM push notifications (needs FCM_SERVICE_ACCOUNT)
- `POST /api/instagram-oembed` - Instagram embed data (needs META_APP_TOKEN)
- `POST /api/fetch-substack-feed` - Substack RSS fetching
- `POST /api/send-password-reset` - Password reset via Supabase admin
- `POST /api/generate-feed-content` - AI content generation
- `GET /api/suggest-articles` - Curated relationship articles
- `POST /api/suggest-dreams` - AI dream suggestions
- `POST /api/suggest-experiences` - AI date night experiences
- `POST /api/suggest-family-tasks` - AI family task generation
- `POST /api/suggest-intimacy` - AI intimacy product suggestions
- `POST /api/suggest-products` - AI product recommendations
- `POST /api/suggest-tasks` - AI shared list suggestions
- `POST /api/suggest-travel` - AI travel suggestions
- `GET /api/microsoft-auth-url` - Microsoft OAuth URL generation
- `POST /api/microsoft-oauth-callback` - Microsoft OAuth token exchange
- `POST /api/sync-outlook-calendar` - Outlook calendar sync
- `POST /api/inbound-calendar` - ICS calendar forwarding

## Required Environment Variables

### Supabase (Required)
- `VITE_SUPABASE_URL` - Supabase project URL (frontend)
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key (frontend)
- `SUPABASE_URL` - Supabase project URL (backend)
- `SUPABASE_ANON_KEY` - Supabase anon key (backend)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (backend)

### AI Features (Optional)
- `OPENAI_API_KEY` - OpenAI API key for AI-powered suggestions
- `AI_GATEWAY_URL` - Custom AI gateway URL (defaults to OpenAI)
- `AI_MODEL` - AI model to use (defaults to gpt-4o-mini)

### External Services (Optional)
- `GIPHY_API_KEY` - GIPHY API key for GIF search
- `META_APP_TOKEN` - Meta/Facebook app token for Instagram embeds
- `FCM_SERVICE_ACCOUNT` - Firebase Cloud Messaging service account JSON
- `MICROSOFT_CLIENT_ID` - Microsoft OAuth client ID
- `MICROSOFT_CLIENT_SECRET` - Microsoft OAuth client secret
- `SITE_URL` - Public site URL for password reset redirects

## Running the Project
- Development: `npm run dev` (starts Express + Vite on port 5000)
- The workflow "Start application" runs `npm run dev`

## Recent Changes
- 2026-02-22: Migrated from Lovable/Supabase Edge Functions to Replit Express server
  - Created Express server infrastructure
  - Ported 18 Edge Functions to Express API routes
  - Updated frontend to use `/api/*` routes via `apiInvoke` helper
  - Supabase remains as external service for auth, database, storage, and realtime
