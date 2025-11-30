import type { Express } from "express";
import { createServer, type Server } from "http";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase credentials");
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/init-database", async (req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'driver', 'admin')),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS bus_routes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          route_name TEXT NOT NULL,
          route_number TEXT NOT NULL UNIQUE,
          description TEXT,
          daily_fare NUMERIC NOT NULL DEFAULT 60,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS buses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          bus_number TEXT NOT NULL UNIQUE,
          capacity INTEGER NOT NULL DEFAULT 50,
          route_id UUID REFERENCES bus_routes(id) ON DELETE SET NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

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

        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT DEFAULT 'system' CHECK (type IN ('recharge', 'deduction', 'low_balance', 'scan', 'system')),
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      const { error: tableError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      
      if (tableError) {
        console.log("Note: Tables may already exist or RPC not available, checking directly...");
      }

      const { data: existingRoutes } = await supabase.from('bus_routes').select('id').limit(1);
      
      if (!existingRoutes || existingRoutes.length === 0) {
        const { error: routeError } = await supabase.from('bus_routes').insert([
          { route_name: 'Downtown - Campus Main Gate', route_number: 'R1', daily_fare: 60, description: 'Via City Center' },
          { route_name: 'North Suburb - Campus', route_number: 'R2', daily_fare: 50, description: 'Via Highway 101' },
          { route_name: 'East District - Campus', route_number: 'R3', daily_fare: 70, description: 'Via Industrial Area' },
          { route_name: 'West Town - Campus', route_number: 'R4', daily_fare: 55, description: 'Via Market Area' },
        ]);
        
        if (routeError) {
          console.log("Routes insert error:", routeError.message);
        }
      }

      const { data: existingBuses } = await supabase.from('buses').select('id').limit(1);
      
      if (!existingBuses || existingBuses.length === 0) {
        const { data: routes } = await supabase.from('bus_routes').select('id, route_number').order('route_number');
        
        if (routes && routes.length > 0) {
          const busesToInsert = [
            { bus_number: 'BUS-001', capacity: 45, route_id: routes[0]?.id, is_active: true },
            { bus_number: 'BUS-002', capacity: 50, route_id: routes[1]?.id, is_active: true },
            { bus_number: 'BUS-003', capacity: 40, route_id: routes[2]?.id, is_active: true },
            { bus_number: 'BUS-004', capacity: 55, route_id: routes[3]?.id, is_active: true },
          ];
          
          const { error: busError } = await supabase.from('buses').insert(busesToInsert);
          if (busError) {
            console.log("Buses insert error:", busError.message);
          }
        }
      }

      res.json({ success: true, message: "Database initialized successfully" });
    } catch (error: any) {
      console.error("Database init error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/create-admin", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const supabase = getSupabaseAdmin();

      // First check if user already exists in auth
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingAuthUser = existingUsers?.users?.find(u => u.email === email);

      let userId: string;

      if (existingAuthUser) {
        // User exists in auth, check if they exist in our users table
        userId = existingAuthUser.id;
        const { data: existingDbUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .single();

        if (existingDbUser) {
          return res.json({ success: true, message: "Admin account already exists" });
        }
      } else {
        // Create new auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Failed to create user");
        userId = authData.user.id;
      }

      // Insert into users table
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          role: 'admin',
        });

      if (userError) throw userError;

      res.json({ success: true, message: "Admin account created" });
    } catch (error: any) {
      console.error("Create admin error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/create-driver", async (req, res) => {
    try {
      const { email, password, full_name, phone, license_number, bus_id, is_active } = req.body;
      
      if (!email || !password || !full_name || !phone || !license_number) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const supabase = getSupabaseAdmin();

      // Create auth user with email confirmed (no verification needed)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Create user record with driver role
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          role: 'driver',
        });

      if (userError) throw userError;

      // Create driver profile
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .insert({
          user_id: authData.user.id,
          full_name,
          phone,
          license_number,
          bus_id: bus_id || null,
          is_active: is_active !== undefined ? is_active : true,
        })
        .select()
        .single();

      if (driverError) throw driverError;

      res.json({ success: true, driver: driverData });
    } catch (error: any) {
      console.error("Create driver error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Cleanup endpoint to remove orphaned users
  app.post("/api/cleanup-user", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email required" });
      }

      const supabase = getSupabaseAdmin();

      // Find user in database
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (userData) {
        // Delete related records first (students, drivers)
        await supabase.from('students').delete().eq('user_id', userData.id);
        await supabase.from('drivers').delete().eq('user_id', userData.id);
        
        // Delete user record
        await supabase.from('users').delete().eq('id', userData.id);
      }

      // Also try to delete from auth if exists
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUser = authUsers?.users?.find(u => u.email === email);
      if (authUser) {
        await supabase.auth.admin.deleteUser(authUser.id);
      }

      res.json({ success: true, message: `Cleaned up user: ${email}` });
    } catch (error: any) {
      console.error("Cleanup error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/auth/signup-student", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const supabase = getSupabaseAdmin();

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          role: 'student',
        });

      if (userError) throw userError;

      res.json({ success: true, userId: authData.user.id });
    } catch (error: any) {
      console.error("Student signup error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return httpServer;
}
