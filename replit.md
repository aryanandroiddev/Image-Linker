# PixelDrop

## Overview

PixelDrop is a full-stack image hosting and sharing application built with Expo (React Native) on the frontend and Express.js on the backend. Users can register, log in, upload images, view them in a gallery, share images via unique tokens/links, and manage their profile. The app runs as a mobile-first experience using Expo Router for navigation with tab-based layout, and communicates with a backend API server that handles authentication, image storage, and database operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture (`newArchEnabled: true`)
- **Routing**: Expo Router v6 with file-based routing. The app directory contains:
  - Root-level screens: `index.tsx` (auth redirect), `login.tsx`, `register.tsx`, `forgot-password.tsx`, `image-detail.tsx`
  - Tab navigation under `(tabs)/`: Gallery (`index.tsx`), Upload (`upload.tsx`), Profile (`profile.tsx`)
- **State Management**: React Query (`@tanstack/react-query`) for server state, React Context for auth state (`lib/auth-context.tsx`)
- **Fonts**: Inter font family loaded via `@expo-google-fonts/inter`
- **UI Libraries**: `expo-blur`, `expo-linear-gradient`, `expo-glass-effect`, `expo-haptics`, `expo-image`, `react-native-gesture-handler`, `react-native-keyboard-controller`
- **Image Picking**: `expo-image-picker` for selecting images from device
- **API Communication**: Custom `apiRequest` helper in `lib/query-client.ts` that constructs URLs from `EXPO_PUBLIC_DOMAIN` environment variable and uses `expo/fetch`
- **Typed Routes**: Enabled via `experiments.typedRoutes` in app.json

### Backend (Express.js)

- **Framework**: Express 5 running on Node.js, written in TypeScript
- **Entry Point**: `server/index.ts` — sets up CORS (supporting Replit domains and localhost), serves static files, and registers routes
- **Routes**: `server/routes.ts` — handles auth endpoints (`/api/auth/*`), image CRUD (`/api/images/*`), file uploads
- **Authentication**: Session-based auth using `express-session`. Passwords hashed with `bcryptjs`. Sessions track `userId`. A `requireAuth` middleware guards protected routes
- **File Uploads**: `multer` configured with disk storage, saving to an `uploads/` directory. Files renamed to UUIDs. Limited to 10MB image files
- **Storage Layer**: `server/storage.ts` — implements `IStorage` interface with `DatabaseStorage` class using Drizzle ORM over PostgreSQL (`pg` driver)
- **Demo Data**: The server seeds sample data with a "demo" user on startup

### Database

- **Database**: PostgreSQL, connected via `DATABASE_URL` environment variable
- **ORM**: Drizzle ORM with `drizzle-orm/node-postgres` driver
- **Schema** (`shared/schema.ts`):
  - `users` table: `id` (UUID, auto-generated), `username` (unique), `email` (unique), `password`, `createdAt`
  - `images` table: `id` (UUID, auto-generated), `userId` (FK to users), `title`, `filename`, `shareToken` (unique), `mimeType`, `fileSize`, `createdAt`
- **Validation**: `drizzle-zod` generates Zod schemas (`insertUserSchema`, `insertImageSchema`) from table definitions
- **Migrations**: Drizzle Kit configured in `drizzle.config.ts`, migrations output to `./migrations`. Use `npm run db:push` to push schema changes

### Build & Deployment

- **Development**: Two processes run simultaneously — `expo:dev` (Expo Metro bundler) and `server:dev` (Express via tsx)
- **Production Build**: `expo:static:build` runs a custom build script (`scripts/build.js`) that bundles the Expo web app. `server:build` uses esbuild to bundle the server. `server:prod` runs the production server
- **Replit Integration**: CORS configuration reads `REPLIT_DEV_DOMAIN` and `REPLIT_DOMAINS`. The build script checks `REPLIT_INTERNAL_APP_DOMAIN` for deployment URLs. Express serves a landing page template for non-API web visitors

### Shared Code

The `shared/` directory contains code shared between frontend and backend, primarily the database schema and TypeScript types. Path aliases are configured: `@/*` maps to root, `@shared/*` maps to `./shared/*`.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connected via `DATABASE_URL` environment variable. Required for the application to function

### Key NPM Packages
- **drizzle-orm** + **drizzle-kit**: Database ORM and migration tooling
- **express** + **express-session**: HTTP server and session management
- **bcryptjs**: Password hashing
- **multer**: Multipart file upload handling
- **pg**: PostgreSQL client for Node.js
- **@tanstack/react-query**: Async state management on the client
- **expo** ecosystem: Core mobile framework with numerous plugins (image-picker, haptics, clipboard, etc.)
- **zod** + **drizzle-zod**: Schema validation

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required)
- `EXPO_PUBLIC_DOMAIN`: Domain for the API server, used by the frontend to construct API URLs
- `REPLIT_DEV_DOMAIN`: Set by Replit, used for CORS and Expo configuration
- `REPLIT_DOMAINS`: Set by Replit, comma-separated list of allowed domains
- `REPLIT_INTERNAL_APP_DOMAIN`: Set by Replit during deployment

### File Storage
- Images are stored on disk in the `uploads/` directory (local filesystem, not cloud storage)