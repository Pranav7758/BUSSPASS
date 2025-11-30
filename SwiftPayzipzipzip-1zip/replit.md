# SwiftPass - College Bus Transport Management System

## Overview

SwiftPass is a comprehensive college bus transport management system that provides role-based portals for students, drivers, and administrators. The application enables digital QR bus passes, wallet-based payments, real-time bus tracking, and complete fleet management through a clean, professional interface.

**Core Features:**
- Three role-based user portals (Student, Driver, Admin)
- QR-based digital bus pass system
- Wallet management with transaction tracking
- Real-time bus tracking via Google Maps
- Route and bus fleet management
- Analytics and reporting dashboard
- Automatic GPS-based stop detection for hands-free driver operation

**GPS Auto-Tracking System:**
- Uses browser Geolocation API to track driver position
- Automatically marks stops as "arrived" when within 50 meters
- Uses adaptive departure threshold (80m default, adjusts for closely-spaced stops)
- Per-stop manual fallback: shows buttons only for stops without coordinates
- Handles mixed routes (some stops with GPS coords, some without)
- Graceful degradation: falls back to manual buttons when GPS unavailable/denied

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework Stack:**
- React 19 with TypeScript
- Vite as build tool and development server
- React Router (wouter) for client-side routing
- TanStack Query for server state management

**UI System:**
- Tailwind CSS v4 for styling with custom design tokens
- shadcn/ui component library (Radix UI primitives)
- Design system based on modern productivity tools (Linear, Notion)
- Responsive layout with fixed sidebar navigation (240px width)
- Custom color system with neutral base and blue primary (#1976d2)

**State Management:**
- React Context API for authentication state
- TanStack Query for API data caching and synchronization
- Supabase Realtime subscriptions for live updates

**Component Organization:**
- `/client/src/pages/` - Page components organized by role (student/, driver/, admin/)
- `/client/src/components/layout/` - Shared layout components (sidebar, navigation)
- `/client/src/components/ui/` - shadcn/ui component library
- `/client/src/lib/` - Utility functions, auth context, Supabase client

### Backend Architecture

**Server Framework:**
- Express.js REST API server
- TypeScript for type safety
- HTTP server with custom middleware

**API Design:**
- RESTful endpoints under `/api/` prefix
- Request/response logging middleware
- JSON body parsing with raw body preservation
- Database initialization endpoint at `/api/init-database`

**Authentication & Authorization:**
- Supabase Auth handles user authentication (email/password)
- Role-based access control (student, driver, admin)
- Protected routes with role verification
- Session management via Supabase client

**Build System:**
- Separate client and server builds
- ESBuild for server bundling with dependency allowlist
- Vite for client bundling with HMR in development
- Production builds output to `/dist/` directory

### Data Storage

**Database Solution:**
- PostgreSQL via Supabase
- Drizzle ORM for schema management and migrations
- Row Level Security (RLS) policies for data access control

**Schema Structure:**
- `users` - Authentication and role assignment
- `students` - Student profiles with wallet balance and route assignment
- `drivers` - Driver profiles linked to buses
- `buses` - Fleet inventory with route assignments
- `bus_routes` - Route definitions with fare information
- `transactions` - Wallet transaction history
- `trips` - Driver trip logging
- `notifications` - User notification system

**Data Access Patterns:**
- Server uses Supabase Service Role Key for admin operations
- Client uses Supabase Anon Key with RLS enforcement
- Real-time subscriptions for bus location updates

### External Dependencies

**Supabase Platform:**
- PostgreSQL database hosting
- Authentication service (email/password)
- Real-time subscriptions for live data
- File storage for user photos
- Row Level Security for data access control
- Environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Google Maps API:**
- Real-time bus tracking and visualization
- Route mapping and display
- Environment variable: `GOOGLE_MAPS_API_KEY`

**Payment Integration:**
- Razorpay for wallet top-ups (mentioned in design docs but not implemented in current codebase)

**Development Tools:**
- Replit-specific plugins for development environment
- Vite plugins for error overlay and cartographer in development
- TypeScript for static type checking

**Design System:**
- Custom Tailwind configuration with design tokens
- shadcn/ui component library (Radix UI)
- Professional color palette with neutral base (#f5f5f5 background, #1976d2 primary)
- System fonts: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto