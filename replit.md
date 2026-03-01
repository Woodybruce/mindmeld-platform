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
- `GET /api/curated-podcasts` - Curated relationship podcasts
- `GET /api/curated-videos` - Curated relationship videos (YouTube)
- `GET /api/curated-quotes` - Inspirational relationship quotes
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
- `useSharedLists` hook is the canonical way to read/write lists; filters out internal lists (names starting with `__`)
- Internal lists: `__ai_preferences__` (AI prefs) — hidden from user list view
- `status` and `createdBy` metadata stored inside `score_data._listMeta` JSONB (no schema changes needed)
- Template lists require partner to add items before going live (`status: "pending_partner"` → `"active"`)
- Shopping list template (`id: "shopping"`) — items have inline Amazon buy button (ExternalLink icon) and "Buy on Amazon" in action menu
- Amazon buy links use search URL format: `amazon.co.uk/s?k=...&tag=woodybruce-21`
- Sex Bucket Challenge uses separate `bucket_list_proposals` table for its proposal flow
- Sex Bucket Game draws from the `sex-bucket-ideas` template list

## Spotify Integration
- Custom OAuth flow using user's own Spotify Developer App (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET env vars)
- `server/spotify.ts` — OAuth token management (auth code exchange, refresh), direct API fetch helper, SDK client
- OAuth routes: `/api/spotify/auth` (redirects to Spotify login), `/api/spotify/callback` (exchanges code for tokens), `/api/spotify/status` (connection check)
- API routes: `/api/spotify/now-playing`, `/api/spotify/search`, `/api/spotify/playlist` (CRUD), `/api/spotify/recently-played`
- Playlist write operations use `spotifyApiFetch()` (direct REST) instead of SDK to avoid 403 issues
- `SpotifyWidget` on Us page (Lists tab) — shows now-playing, shared playlist with search & add
- `SpotifyBoard` on home page — shows now-playing or recently played with in-app playback
- `SpotifyEmbed` component — Spotify embed iframe player for in-app playback (tap play to load)
- In-app playback: Play buttons on tracks in SpotifyBoard, SpotifyWidget, and ChatBubble load Spotify embed player
- If Spotify isn't connected after server restart, SpotifyBoard shows "Connect Spotify" link to `/api/spotify/auth`
- Tokens persisted to Replit KV store + /tmp file; survive server restarts (user only needs to authorize once)
- `SPOTIFY_REDIRECT_URI` env var set per environment (dev/production) to match Spotify Dashboard redirect URIs
- Playlist ID stored in Supabase (`__spotify_playlist__` internal list in `shared_lists` table) so both partners see the same playlist; localStorage used as local cache for instant loading
- Song sharing in chat: `SpotifySongPicker` component in chat attach menu, `spotify` message type renders as embedded player in `ChatBubble`

## Recent Changes
- 2026-03-01: Photo upload fix — server-side upload proxy
  - Root cause: Supabase storage buckets (`couple-photos`, `chat-images`, `voice-notes`) weren't created
  - `ensureStorageBuckets()` runs at server startup — auto-creates any missing storage buckets
  - New `POST /api/upload-photo` endpoint — uploads via service role key (bypasses storage RLS)
  - Headers: `x-user-id` (required), `x-bucket` (default `couple-photos`), `x-caption` (optional)
  - OurPhotos and PhotoChallenge now upload through server endpoint
  - Chat image upload tries server endpoint first, falls back to direct Supabase client upload
- 2026-03-01: Invisible AI — automatic behavioral learning
  - Removed all visible AI buttons: AiSearchBar, "Generate with AI", "Ask AI for suggestions", AI sparkle labels
  - AI now works silently in the background — no user-facing AI branding
  - `fetchUserContext(userId)` gathers behavioral context automatically from 5 data sources:
    1. Manual preferences from Profile page (still editable)
    2. Recent shared lists (names, items, templates)
    3. Recent chat messages (topics/themes)
    4. Mood check-ins (recent moods and notes)
    5. Content likes (articles, products, podcasts liked)
  - Context cached per user for 15 minutes to avoid repeated DB queries
  - All 10 AI endpoints receive personalised context automatically via `callAI()`
  - `apiInvoke` automatically attaches `userId` to all POST requests
  - Dead AI code removed from SharedLists (suggestDreams, suggestTasks, suggestPreviewItems, suggestForBlankList)
- 2026-02-28: For You section expanded with 4 content tabs
  - Articles tab: relationship reads + saved links (existing, now tabbed)
  - Podcasts tab: curated Spotify relationship podcasts with inline embed player
  - Videos tab: curated YouTube relationship videos with inline playback
  - Quotes tab: inspirational relationship quotes with gradient cards
  - New API routes: `/api/curated-podcasts`, `/api/curated-videos`, `/api/curated-quotes`
  - Each tab has its own caching, like/heart support, and refresh
- 2026-03-01: Shop redesign — luxury editorial aesthetic
  - `DiscoverTogether.tsx` rewritten with premium layout: hero product card (4:5 ratio) + 2-column grid
  - Category pills (text-only, no icons): Our Picks, For You, Date Night, Gifts, Wellness, Intimacy, Games, Home
  - Product detail modal: bottom-sheet style with spring animation, full product info, features grid
  - `isLuxuryBrand()` updated to include Space NK, LELO, Lovehoney alongside CdM, AP, goop, Sophie & Olivia
  - `getBuyLabel()` returns brand-specific "Shop X" labels for all luxury brands
  - Server: `normalizeShopCategory()` maps niche categories (Massage→Wellness, Lingerie→Intimacy, Fragrance→Gifts, etc.) to tab-compatible categories
  - Server: product data now passes through `longDescription`, `features[]`, `imageKeyword` from `LUXURY_INTIMACY_PRODUCTS` instead of generating inline
  - `LUXURY_INTIMACY_PRODUCTS`: 25 items across 7 brands (7 CdM, 4 AP, 5 goop, 3 Space NK, 3 Sophie & Olivia, 2 LELO, 1 Lovehoney) with rich descriptions and features
  - Product images sourced from: Coco de Mer Shopify CDN, Sophie & Olivia Shopify CDN, Cult Beauty/LookFantastic THG CDN (`static.thcdn.com`), Milk Makeup Shopify CDN, Amazon CDN, local files (`public/products/`), Pexels API fallback
  - `resolveProductImage()` + in-memory `imageCache`: server auto-fetches Pexels images for any product without a hardcoded `imageUrl`
- 2026-02-28: Discover Together — unified shopping widget on home page
  - `DiscoverTogether` component (`src/components/DiscoverTogether.tsx`) is the unified product browser
  - "Our Picks" tab: curated luxury products via `GET /api/shop/curated`
  - AI-powered tabs: For You, Date Night, Gifts, Wellness, Intimacy, Games, Home via `POST /api/shop/generate`
  - Real product images via Pexels API (`PEXELS_API_KEY` env var) with gradient fallbacks
  - Buy button uses `document.createElement('a')` for reliable webview link opening
  - Brand-styled buy buttons: black for luxury brands, primary for Amazon
  - `LUXURY_INTIMACY_PRODUCTS` in `server/routes.ts`: 25 products (8 CdM + 6 AP + 5 goop + 6 Sophie & Olivia)
  - All Amazon product links use search URLs (`/s?k=...&tag=woodybruce-21`)
  - 30-minute client-side cache per category
  - Like/heart support with partner mutual like indicators
  - Separate `/shop` route removed — everything lives on home page
- 2026-02-28: Outlook calendar auto-sync with shared events
  - `useOutlookAutoSync` hook runs on home page load, syncs every 15 minutes
  - Automatically fetches Outlook calendar events and imports new ones
  - Shared events (where partner is invited) are automatically added to partner's calendar too (source: "outlook-shared")
  - Increased Express JSON body limit to 5MB to handle large calendar payloads
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
