# Us - Couples Relationship App

## Overview
"Us" is a couples relationship app designed to enhance communication, planning, and growth for partners. It provides shared digital spaces and AI-powered features to foster connection and shared experiences. The project aims to offer a comprehensive, engaging platform for couples to manage their relationship effectively.

## User Preferences
I want iterative development.
I want to be asked before you make any major changes.
I do not want the AI to make any changes to the core architectural decisions without my explicit approval.
I prefer to use simple language in explanations and documentation.
I want the agent to prioritize security and data privacy in all implementations.

## System Architecture
The application features a React SPA frontend built with Vite, TailwindCSS, and shadcn/ui components, served by an Express backend running on port 5000. This Express server also handles all API routes, which were ported from Supabase Edge Functions. Supabase acts as the primary external service for authentication, database management, storage, and real-time subscriptions. The architecture includes Drizzle ORM for database interactions and a structured project layout separating server logic, shared schemas, and frontend components.

**Key Features:**
- Partner messaging with push notifications.
- Shared calendar with Outlook sync capabilities.
- Shared lists and bucket lists, including template-based lists and an internal `__ai_preferences__` list.
- Shared saved links (bookmarks) — both partners can save URLs (restaurants, recipes, articles, holidays, etc.) with automatic platform detection (Instagram, YouTube, TikTok, Article, Link), notes, and real-time sync. "You both saved this!" matched-link highlighting when both partners save the same URL. Located in Us → Lists tab → Saved Links section. Data in `shared_links` table, hook in `useSharedLinks.ts`, UI in `LinksAndMedia.tsx`.
- AI-powered suggestions for experiences, products, travel, intimacy, and family tasks ("Discover Together").
- AI-generated feed content.
- Photo sharing and interactive games (Kiss Chase, Truth or Dare, Would You Rather).
- Family quiz and task management.
- Mood check-ins.
- AI-personalised "For You" content (Articles, Podcasts, Videos, Quotes) — uses couple's context to select/generate relevant content. Podcasts use Apple Podcasts exclusively (iTunes Search API for discovery + verification, Apple embed player, Apple Podcasts links). AI dynamically discovers new podcasts beyond the curated catalog based on couple context.
- Spotify integration for shared music experiences and in-app playback.
- Stripe in-app checkout for the Shop section — ALL products are owned inventory purchased via Stripe checkout (Apple Pay, Google Pay, card). Products seeded via `server/seed-stripe-products.ts`, synced to PostgreSQL `stripe` schema via `stripe-replit-sync`. No external buy links.
- AI Product Sourcer: Admin tool at `/admin/products` powered by GPT-5.4 (most advanced OpenAI model) that uses couple context (preferences, moods, liked content, lists) to source real, purchasable products with supplier info, wholesale pricing, margin calculations, sizing, materials, and what's included. `callAI()` accepts optional `options` param for model/temperature overrides; default model is GPT-5.4. Server-side admin auth enforced via `requireAdmin()`. Private message data excluded from AI context. Stripe metadata fields are length-capped at 500 chars.

**UI/UX Decisions:**
- Home page uses a unified "Today" card (`TodayCard.tsx`) that combines today's calendar events, weekly tasks with checkboxes, a progress bar, and a "lists" pill — replacing the separate DailyListsWidget, CalendarWidget, and ListsSummaryWidget. The card has three tabs: day name (tasks + events), Calendar (full month/week/day views), and Lists (summary with progress). Calendar expand button navigates to `/us?tab=admin` (OurEvents). Full calendar widget removed from home page.
- The application utilizes TailwindCSS and shadcn/ui components for a consistent and modern aesthetic.
- The "Shop" section (Discover Together) features a luxury editorial aesthetic with a premium layout, hero product cards, and category pills. Product data is in `server/shopProducts.ts` with enhanced fields: multiple images (carousel in modal), sizing info (selectable sizes/shades/volumes), materials, dimensions, what's included, and care instructions. Cache key `discover_catalog_v6`. Balanced catalogue: 30 products, 6 per category (Wellness, Intimacy, Gifts, Date Night, Home). Stripe client and credentials are cached for performance. Shop cache pre-warms on startup and has 2-hour TTL (both server and client). Frontend uses stale-while-revalidate pattern — shows cached data instantly, refreshes in background.
- Product detail modals are designed as bottom-sheet style with smooth tween animations (no spring bounce). Modals include image carousel with navigation dots, size selector, and expandable sections for product details.
- The "For You" section is expanded with dedicated tabs for Articles, Podcasts, Videos, and Quotes.
- Performance optimizations include caching authentication sessions and profile data, lazy-loading heavy widgets and routes (games, admin, quizzes code-split via `React.lazy`), optimizing Outlook sync, server-side AI content caching (2hr TTL), smart Spotify polling (15s when playing, 60s idle), and comprehensive localStorage caching (user-scoped) for calendar events, weekly tasks, shared lists, Spotify tracks, and article OG metadata — enabling instant-load on return visits with background refresh.
- QueryClient defaults: `staleTime=5min`, `gcTime=30min`, `refetchOnWindowFocus=false` to reduce unnecessary refetches.
- Spotify tokens stored in PostgreSQL `app_settings` table for deployment persistence.
- Error boundary (`src/components/ErrorBoundary.tsx`) wraps all routes to prevent white-screen crashes — shows retry UI with the rest of the app intact.
- Dynamic page titles via `usePageTitle` hook — each page sets its own browser tab title (e.g., "Chat — Us").
- Accessibility: aria-labels on all icon-only buttons (AppHeader, BottomNav), `aria-current` on active nav, unread count announced to screen readers, password toggle labeled.
- Muted text contrast improved to meet WCAG AA 4.5:1 ratio.
- SEO: `og:image`, `og:description`, and canonical URL set in `index.html`.
- Database indexes on frequently-queried columns: messages (receiver_id, created_at), shared_lists (user_id), weekly_tasks (user_id, scheduled_date), calendar_events (user_id, start_time), content_likes (user_id, content_id), profiles (partner_id).
- SSRF protection: article-metadata and article-content endpoints validate URLs against localhost, private IPs, and cloud metadata endpoints via `isValidExternalUrl()`.
- API auth hardened: all AI suggestion endpoints now extract userId from the auth token via `extractUserId(req)` instead of trusting `req.body.userId`.

## External Dependencies
- **Supabase:** Used for authentication, database, storage (e.g., `couple-photos`, `chat-images`), and real-time subscriptions.
- **OpenAI API:** Powers AI-driven suggestions and content generation (requires `OPENAI_API_KEY`).
- **GIPHY API:** For GIF search functionality (requires `GIPHY_API_KEY`).
- **Meta/Facebook API:** For Instagram oEmbed data (requires `META_APP_TOKEN`).
- **Microsoft OAuth:** For Outlook calendar integration (requires `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`).
- **Spotify API:** For music integration, including now-playing, search, playlist management, and in-app playback (requires `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`).
- **Firebase Cloud Messaging (FCM):** For native push notifications (requires `FCM_SERVICE_ACCOUNT`).
- **Web Push API:** For browser-based push notifications (requires `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`).
- **Pexels API:** For resolving product images in the "Shop" section (requires `PEXELS_API_KEY`).
- **Stripe:** In-app checkout for the Shop. Uses Replit Stripe connector (OAuth-based). Products created via Stripe API (`server/seed-stripe-products.ts`), synced to PostgreSQL `stripe` schema via `stripe-replit-sync`. Checkout supports Apple Pay, Google Pay, and card. Key files: `server/stripeClient.ts`, `server/webhookHandlers.ts`, `server/seed-stripe-products.ts`. Webhook route registered BEFORE `express.json()` in `server/index.ts`.