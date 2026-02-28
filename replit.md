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
- `GET /api/vapid-public-key` - VAPID public key for web push
- `POST /api/web-push-subscribe` - Register web push subscription
- `POST /api/send-push-notification` - Push notifications (FCM native + Web Push)
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

### Push Notifications
- `VAPID_PUBLIC_KEY` - VAPID public key for Web Push
- `VAPID_PRIVATE_KEY` - VAPID private key for Web Push
- `VITE_VAPID_PUBLIC_KEY` - Same as VAPID_PUBLIC_KEY (exposed to frontend)
- `FCM_SERVICE_ACCOUNT` - Firebase Cloud Messaging service account JSON (native)

### External Services (Optional)
- `GIPHY_API_KEY` - GIPHY API key for GIF search
- `META_APP_TOKEN` - Meta/Facebook app token for Instagram embeds
- `MICROSOFT_CLIENT_ID` - Microsoft OAuth client ID
- `MICROSOFT_CLIENT_SECRET` - Microsoft OAuth client secret
- `SITE_URL` - Public site URL for password reset redirects

## Running the Project
- Development: `npm run dev` (starts Express + Vite on port 5000)
- The workflow "Start application" runs `npm run dev`

## List System
- Lists stored in Supabase `shared_lists` table (not localStorage)
- `useSharedLists` hook is the canonical way to read/write lists
- `status` and `createdBy` metadata stored inside `score_data._listMeta` JSONB (no schema changes needed)
- Template lists require partner to add items before going live (`status: "pending_partner"` → `"active"`)
- Sex Bucket Challenge uses separate `bucket_list_proposals` table for its proposal flow
- Sex Bucket Game draws from the `sex-bucket-ideas` template list

## Spotify Integration
- Replit Spotify connector provides API access (single account, not per-user OAuth)
- `server/spotify.ts` — Spotify client using `@spotify/web-api-ts-sdk`
- API routes: `/api/spotify/now-playing`, `/api/spotify/search`, `/api/spotify/playlist` (CRUD), `/api/spotify/recently-played`
- `SpotifyWidget` on Us page (Lists tab) — shows now-playing, shared playlist with search & add
- Playlist ID stored in `shared_lists` table with `game_type: "spotify_playlist"` (no extra tables needed)
- Song sharing in chat: `SpotifySongPicker` component in chat attach menu, `spotify` message type renders as card in `ChatBubble`

## Recent Changes
- 2026-02-25: Web Push notifications + bug fixes
  - Added Web Push API support (works in browser even when tab is closed)
  - VAPID keys generated and configured for web push
  - Custom push service worker (public/push-sw.js) handles push events and notification clicks
  - send-push-notification route now handles both FCM (native) and Web Push (web) tokens
  - Fixed Kiss Chase: removed chat message, sends push notification only, partner navigation works on tap
  - Fixed push notification tap handler: now navigates to the correct page
  - Fixed shared list partner review: items are now tappable checkboxes instead of dead divs
- 2026-02-23: Partner-must-contribute flow for all template lists
  - Template lists now require both partners to add items before going live
  - Family Quiz list now also requires partner approval before going live
  - AI generate button on all template previews ("Generate more with AI")
  - AI generate button on blank list creation (type topic, tap "Generate with AI")
  - Fixed all quiz/widget pages to save lists to Supabase instead of localStorage
  - Added safe-area-top to all sub-page headers for iPhone notch/Dynamic Island
  - Sex Bucket Game now draws from "Sex Bucket Challenge Ideas" list
- 2026-02-22: Migrated from Lovable/Supabase Edge Functions to Replit Express server
  - Created Express server infrastructure
  - Ported 18 Edge Functions to Express API routes
  - Updated frontend to use `/api/*` routes via `apiInvoke` helper
  - Supabase remains as external service for auth, database, storage, and realtime
