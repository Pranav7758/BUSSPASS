-- Route Stops Table (ordered stops for each route)
CREATE TABLE IF NOT EXISTS route_stops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
  stop_name VARCHAR(255) NOT NULL,
  sequence INTEGER NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active Trips Table (tracks current trip for a bus)
CREATE TABLE IF NOT EXISTS active_trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  current_stop_sequence INTEGER DEFAULT 0
);

-- Trip Stop Events Table (tracks bus progress through stops)
CREATE TABLE IF NOT EXISTS trip_stop_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES active_trips(id) ON DELETE CASCADE,
  route_stop_id UUID NOT NULL REFERENCES route_stops(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'arrived', 'departed')),
  arrived_at TIMESTAMP WITH TIME ZONE,
  departed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_route_stops_route_id ON route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_sequence ON route_stops(route_id, sequence);
CREATE INDEX IF NOT EXISTS idx_active_trips_bus_id ON active_trips(bus_id);
CREATE INDEX IF NOT EXISTS idx_active_trips_route_id ON active_trips(route_id);
CREATE INDEX IF NOT EXISTS idx_active_trips_active ON active_trips(is_active);
CREATE INDEX IF NOT EXISTS idx_trip_stop_events_trip_id ON trip_stop_events(trip_id);

-- Enable Row Level Security
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_stop_events ENABLE ROW LEVEL SECURITY;

-- Policies for route_stops (read for all, write requires checking user role)
-- Note: In production, add proper role checks via a users table join
CREATE POLICY "Allow read access to route_stops" ON route_stops
  FOR SELECT USING (true);

CREATE POLICY "Allow insert to route_stops" ON route_stops
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow update to route_stops" ON route_stops
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow delete from route_stops" ON route_stops
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Policies for active_trips (read for all, drivers can manage their trips)
CREATE POLICY "Allow read access to active_trips" ON active_trips
  FOR SELECT USING (true);

CREATE POLICY "Allow drivers to insert trips" ON active_trips
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow drivers to update their trips" ON active_trips
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Policies for trip_stop_events (read for all, drivers can manage events)
CREATE POLICY "Allow read access to trip_stop_events" ON trip_stop_events
  FOR SELECT USING (true);

CREATE POLICY "Allow insert to trip_stop_events" ON trip_stop_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow update to trip_stop_events" ON trip_stop_events
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Enable real-time for trip_stop_events
ALTER PUBLICATION supabase_realtime ADD TABLE trip_stop_events;
ALTER PUBLICATION supabase_realtime ADD TABLE active_trips;

-- Sample stops for existing routes (you can customize these)
-- INSERT INTO route_stops (route_id, stop_name, sequence) VALUES
-- ('your-route-id', 'Main Gate', 1),
-- ('your-route-id', 'Library', 2),
-- ('your-route-id', 'Hostel Block A', 3),
-- ('your-route-id', 'Sports Complex', 4),
-- ('your-route-id', 'Engineering Block', 5),
-- ('your-route-id', 'Admin Building', 6);
