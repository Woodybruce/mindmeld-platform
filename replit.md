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
- AI-powered suggestions for experiences, products, travel, intimacy, and family tasks ("Discover Together").
- AI-generated feed content.
- Photo sharing and interactive games (Kiss Chase, Truth or Dare, Would You Rather).
- Family quiz and task management.
- Mood check-ins.
- AI-personalised "For You" content (Articles, Podcasts, Videos, Quotes) — uses couple's context to select/generate relevant content.
- Spotify integration for shared music experiences and in-app playback.
- Stripe in-app checkout for the Shop section (products managed via Stripe Dashboard, synced to PostgreSQL `stripe` schema).
- AI Product Sourcer: Admin tool at `/admin/products` that uses couple context (preferences, moods, liked content, lists) to recommend real, sourceable products with supplier info, wholesale pricing, and margin calculations. Server-side admin auth enforced via `requireAdmin()`. Private message data excluded from AI context.

**UI/UX Decisions:**
- The application utilizes TailwindCSS and shadcn/ui components for a consistent and modern aesthetic.
- The "Shop" section (Discover Together) features a luxury editorial aesthetic with a premium layout, hero product cards, and category pills.
- Product detail modals are designed as bottom-sheet style with spring animations.
- The "For You" section is expanded with dedicated tabs for Articles, Podcasts, Videos, and Quotes.
- Performance optimizations include caching authentication sessions and profile data, lazy-loading heavy widgets, optimizing Outlook sync, server-side AI content caching (2hr TTL), and smart Spotify polling (15s when playing, 60s idle).
- Spotify tokens stored in PostgreSQL `app_settings` table for deployment persistence.

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
- **Stripe:** In-app checkout for the Shop. Uses Replit Stripe connector (OAuth-based). Products/prices managed in Stripe Dashboard, synced to PostgreSQL `stripe` schema via `stripe-replit-sync`. Key files: `server/stripeClient.ts`, `server/webhookHandlers.ts`, `server/seed-stripe-products.ts`. Webhook route registered BEFORE `express.json()` in `server/index.ts`.