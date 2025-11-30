# SwiftPass - College Bus Transport Management System

## Overview

SwiftPass is a comprehensive college bus transport management system that provides role-based portals for students, drivers, and administrators. The application enables digital QR bus passes, wallet management with transaction tracking, real-time bus tracking via Google Maps, and automated GPS-based stop detection for drivers.

**Core Features:**
- Three role-based user portals (Student, Driver, Admin)
- QR-based digital bus pass system
- Wallet management with transaction tracking
- Real-time bus tracking via Google Maps
- Route and bus fleet management
- Analytics and reporting dashboard
- Automatic GPS-based stop detection for hands-free driver operation

**GPS Auto-Tracking System:**
The application uses the browser Geolocation API to automatically track driver positions and mark stops as "arrived" when within 50 meters. It uses an adaptive departure threshold system (80m default, adjusts for closely-spaced stops) with per-stop manual fallback for stops without GPS coordinates. The system gracefully degrades to manual buttons when GPS is unavailable or denied.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework and Build System:**
- React 19 with TypeScript for type safety
- Vite as the build tool and development server for fast compilation
- Client-side routing using wouter (lightweight React Router alternative)
- TanStack Query for server state management and caching

**Rationale:** React 19 provides modern features with excellent performance, while Vite offers significantly faster build times compared to webpack-based solutions. Wouter reduces bundle size compared to React Router while providing the same routing capabilities needed for the application.

**UI Component System:**
- Tailwind CSS v4 for utility-first styling with custom design tokens
- shadcn/ui component library built on Radix UI primitives
- Custom design system inspired by modern productivity tools (Linear, Notion)
- Fixed sidebar navigation layout (240px width) with responsive design
- Custom color system with neutral base (#f5f5f5 background) and blue primary (#1976d2)

**Rationale:** Tailwind CSS provides rapid development with consistent spacing and colors while maintaining small bundle sizes. shadcn/ui offers accessible, customizable components without the bloat of traditional component libraries. The fixed sidebar pattern improves navigation consistency across the application.

**State Management Strategy:**
- React Context API for global authentication state
- TanStack Query for API data caching, synchronization, and automatic refetching
- Supabase Realtime subscriptions for live updates (bus locations, notifications)

**Rationale:** Context API handles simple global state without additional dependencies. TanStack Query eliminates the need for manual cache management and provides optimistic updates. Supabase Realtime enables real-time features without implementing WebSocket infrastructure.

### Backend Architecture

**Server Framework:**
- Express.js for HTTP server and API routing
- Node.js runtime environment
- Middleware for JSON parsing, URL encoding, and request logging

**Rationale:** Express provides a minimal, flexible framework for API development with extensive middleware ecosystem. The simplicity allows rapid API development without unnecessary abstractions.

**API Design:**
- RESTful API endpoints organized by resource type
- Database initialization endpoint for schema setup
- Service role key usage for admin operations (bypasses Row Level Security)

**Authentication & Authorization:**
- Supabase Auth for user authentication (email/password)
- Role-based access control with three roles: student, driver, admin
- Protected routes with client-side and server-side validation
- Session management handled by Supabase

**Rationale:** Supabase Auth provides production-ready authentication without implementing custom security logic. Role-based access control ensures users only access appropriate features for their role.

### Data Layer

**Database:**
- PostgreSQL via Supabase (managed cloud database)
- Drizzle ORM for type-safe database queries
- Schema definition in shared TypeScript files

**Core Database Tables:**
- `users` - User accounts with roles (student/driver/admin)
- `students` - Student profiles with wallet balance, enrollment details
- `drivers` - Driver profiles with license information
- `buses` - Bus fleet with capacity and route assignments
- `bus_routes` - Route definitions with fares and descriptions
- `route_stops` - Stop locations with GPS coordinates for auto-tracking
- `transactions` - Wallet transaction history
- `trips` - Driver trip records with start/end times

**Rationale:** PostgreSQL provides robust relational data handling with ACID compliance. Drizzle ORM offers type safety without the complexity of heavier ORMs like TypeORM. Supabase handles database provisioning, backups, and scaling.

**Data Access Patterns:**
- Direct Supabase client queries from frontend for reads
- Row Level Security (RLS) policies for data access control
- Server-side service role key for admin operations
- Real-time subscriptions for live data updates

**Rationale:** Client-side queries reduce server load and latency. RLS provides database-level security that can't be bypassed. Service role key enables admin operations that need to bypass RLS constraints.

## External Dependencies

### Third-Party Services

**Supabase (PostgreSQL + Auth + Realtime + Storage):**
- Purpose: Primary backend infrastructure
- Features Used: Database, authentication, real-time subscriptions, file storage
- Configuration: Requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Rationale: Provides complete backend-as-a-service eliminating need for custom server infrastructure

**Google Maps API:**
- Purpose: Bus tracking and route visualization
- Features Used: Map display, marker placement, route rendering
- Configuration: Requires `GOOGLE_MAPS_API_KEY`
- Integration: Loaded via `@googlemaps/js-api-loader` package
- Rationale: Industry-standard mapping solution with comprehensive features and documentation

### Key Dependencies

**UI Components:**
- `@radix-ui/*` - Accessible, unstyled UI primitives (accordion, dialog, dropdown, etc.)
- `tailwindcss` - Utility-first CSS framework
- `class-variance-authority` - Type-safe component variants
- `lucide-react` - Icon library

**State & Data Management:**
- `@tanstack/react-query` - Asynchronous state management
- `@supabase/supabase-js` - Supabase client library
- `react-hook-form` - Form state management
- `zod` - Schema validation

**Database & ORM:**
- `drizzle-orm` - TypeScript ORM
- `@neondatabase/serverless` - Serverless Postgres driver
- `drizzle-kit` - Database migrations toolkit

**Development Tools:**
- `typescript` - Type checking and compilation
- `vite` - Build tool and dev server
- `tsx` - TypeScript execution for Node.js

**Rationale:** Dependencies are chosen to minimize bundle size while maximizing developer experience and type safety. Radix UI provides accessibility without styling constraints. TanStack Query eliminates manual cache management. Drizzle provides type safety without runtime overhead.