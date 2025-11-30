# SwiftPass - College Bus Transport Management System

## Overview
SwiftPass is a comprehensive college bus transport management system with three role-based portals:
- **Student Portal**: Digital QR bus pass, wallet management, bus tracking
- **Driver Portal**: QR scanning, trip management, student list
- **Admin Portal**: Full system management with analytics

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS + shadcn/ui
- **Maps**: Google Maps API
- **Auth**: Supabase Auth

## Environment Variables Required
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key (for frontend)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for backend only)
- `GOOGLE_MAPS_API_KEY` - Google Maps API key

## Project Structure
```
swiftpass/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── layout/     # Sidebar, navigation
│   │   │   └── ui/         # shadcn/ui components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities, auth context
│   │   └── pages/          # Page components
│   │       ├── admin/      # Admin portal pages
│   │       ├── driver/     # Driver portal pages
│   │       └── student/    # Student portal pages
│   └── public/             # Static assets
├── server/                 # Express backend
│   ├── routes.ts           # API endpoints
│   └── index.ts            # Server entry point
├── shared/                 # Shared types/schemas
└── supabase-tables.sql     # Database schema
```

## Database Tables
- `users` - User accounts with roles (student/driver/admin)
- `students` - Student profiles with wallet balance
- `drivers` - Driver profiles
- `buses` - Bus fleet
- `bus_routes` - Route definitions with fares
- `transactions` - Wallet transactions
- `scan_logs` - QR scan history
- `bus_locations` - Real-time bus GPS data
- `notifications` - User notifications

## Key Features
1. **QR Digital Pass**: Students get a QR code that drivers scan
2. **Wallet System**: Mock Razorpay for recharges, auto fare deduction
3. **Train-Like Bus Tracking**: Stop-by-stop progress tracking (like RailYatri)
   - Admin manages route stops with sequence ordering
   - Real-time stop status updates via Supabase subscriptions
   - Visual timeline with color-coded stop states (green=departed, blue=arrived, yellow=next)
4. **Role-Based Access**: Three separate portals with different capabilities
5. **Daily Scan Limit**: 2 scans per day (morning + evening)

## Setup Instructions

### 1. Supabase Setup
The database tables need to be created in Supabase. Run this in the Supabase SQL Editor:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'driver', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bus routes table
CREATE TABLE IF NOT EXISTS bus_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_name TEXT NOT NULL,
  route_number TEXT NOT NULL UNIQUE,
  description TEXT,
  daily_fare NUMERIC NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Buses table
CREATE TABLE IF NOT EXISTS buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_number TEXT NOT NULL UNIQUE,
  capacity INTEGER NOT NULL DEFAULT 50,
  route_id UUID REFERENCES bus_routes(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  enrollment_no TEXT NOT NULL UNIQUE,
  course TEXT NOT NULL,
  department TEXT NOT NULL,
  phone TEXT NOT NULL,
  photo_url TEXT,
  bus_route_id UUID REFERENCES bus_routes(id) ON DELETE SET NULL,
  wallet_balance NUMERIC DEFAULT 0,
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  license_number TEXT NOT NULL UNIQUE,
  photo_url TEXT,
  bus_id UUID REFERENCES buses(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('recharge', 'deduction', 'admin_adjustment')),
  currency TEXT DEFAULT 'INR',
  payment_gateway TEXT,
  payment_id TEXT,
  order_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scan logs table
CREATE TABLE IF NOT EXISTS scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
  scan_timestamp TIMESTAMPTZ DEFAULT NOW(),
  scan_status TEXT DEFAULT 'success' CHECK (scan_status IN ('success', 'insufficient_balance', 'limit_exceeded', 'blocked')),
  fare_deducted NUMERIC DEFAULT 0,
  balance_after_scan NUMERIC NOT NULL
);

-- Bus locations table
CREATE TABLE IF NOT EXISTS bus_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system' CHECK (type IN ('recharge', 'deduction', 'low_balance', 'scan', 'system')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all for authenticated users" ON users FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON students FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON drivers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON buses FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON bus_routes FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON transactions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON scan_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON bus_locations FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON notifications FOR ALL TO authenticated USING (true);

-- Sample data
INSERT INTO bus_routes (route_name, route_number, daily_fare, description) VALUES
  ('Downtown - Campus Main Gate', 'R1', 60, 'Via City Center'),
  ('North Suburb - Campus', 'R2', 50, 'Via Highway 101'),
  ('East District - Campus', 'R3', 70, 'Via Industrial Area'),
  ('West Town - Campus', 'R4', 55, 'Via Market Area');
```

### 2. Create Admin Account
After setting up the database, create an admin account by calling the API:
```bash
curl -X POST http://localhost:5000/api/create-admin \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}'
```

## Running the Application
The application runs on port 5000 with `npm run dev`.

## User Preferences
- Blue theme (#1976d2)
- Clean, professional design
- Mobile-responsive layout
- No manual SQL required - all automated

## Recent Changes
- **November 30, 2025**: Added GPS Test Mode for driver dashboard
  - **Test Mode Toggle**: Drivers can enable "Test Mode" to simulate GPS without physically traveling
  - **Simulate Arrive Button**: Click to simulate arriving at a stop (uses stop's coordinates)
  - **Simulate Depart Button**: Click to simulate departing from current stop
  - Useful for testing the automatic GPS tracking system without leaving your desk
- **November 30, 2025**: Added train-like location tracking feature (similar to RailYatri's "Where's my train")
  - **Admin Route Stops Management** (`/admin/route-stops`): Manage stops for each route with add/edit/delete/reorder functionality
  - **Enhanced Student Track Bus** (`/student/track-bus`): Visual timeline with real-time stop status updates
  - Students joining mid-trip now see current stop progress
  - Added validation for latitude/longitude coordinates
  - Improved error handling and logging for all Supabase operations
- **November 30, 2025**: Fixed auth context session restoration issue
- Initial setup of all three portals
- QR code generation and scanning
- Mock Razorpay wallet recharges
- Role-based authentication

## GPS Auto-Tracking System
The system uses coordinates to automatically detect when a bus arrives at or departs from stops:
- **Arrival Radius**: 50 meters - Bus is marked "arrived" when within 50m of a stop
- **Departure Radius**: 80 meters - Bus is marked "departed" when it moves 80m away
- **Sequential Order**: Stops are processed in order (must depart from stop 1 before arriving at stop 2)
- **Manual Override**: Drivers can still manually update stops if GPS fails

## New Database Tables Required
Run the SQL in `supabase-tables.sql` to add the stop tracking tables:
- `route_stops` - Ordered stops for each route (stop_name, sequence, lat/lng)
- `active_trips` - Current active trip tracking (bus_id, is_active)
- `trip_stop_events` - Bus progress through stops (trip_id, route_stop_id, status, arrived_at, departed_at)
