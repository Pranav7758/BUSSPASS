import { z } from "zod";

// User roles
export type UserRole = "student" | "driver" | "admin";

// User interface (from Supabase Auth)
export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

// Student interface
export interface Student {
  id: string;
  user_id: string;
  full_name: string;
  enrollment_no: string;
  course: string;
  department: string;
  phone: string;
  photo_url: string | null;
  bus_route_id: string | null;
  wallet_balance: number;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

// Driver interface
export interface Driver {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  license_number: string;
  photo_url: string | null;
  bus_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Bus Route interface
export interface BusRoute {
  id: string;
  route_name: string;
  route_number: string;
  description: string | null;
  daily_fare: number;
  created_at: string;
}

// Bus interface
export interface Bus {
  id: string;
  bus_number: string;
  capacity: number;
  route_id: string | null;
  is_active: boolean;
  created_at: string;
}

// Bus Location interface
export interface BusLocation {
  id: string;
  bus_id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  timestamp: string;
  is_active: boolean;
}

// Route Stop interface (ordered stops for each route)
export interface RouteStop {
  id: string;
  route_id: string;
  stop_name: string;
  sequence: number;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

// Trip Stop Event status types
export type TripStopStatus = "pending" | "arrived" | "departed";

// Trip Stop Event interface (tracks bus progress through stops)
export interface TripStopEvent {
  id: string;
  trip_id: string;
  route_stop_id: string;
  status: TripStopStatus;
  arrived_at: string | null;
  departed_at: string | null;
  created_at: string;
}

// Active Trip interface (tracks current trip for a bus)
export interface ActiveTrip {
  id: string;
  bus_id: string;
  driver_id: string;
  route_id: string;
  started_at: string;
  ended_at: string | null;
  is_active: boolean;
  current_stop_sequence: number;
}

// Extended types for stop tracking
export interface RouteStopWithStatus extends RouteStop {
  status: TripStopStatus;
  arrived_at: string | null;
  departed_at: string | null;
}

export interface ActiveTripWithDetails extends ActiveTrip {
  route?: BusRoute;
  bus?: Bus;
  driver?: Driver;
  stops?: RouteStopWithStatus[];
}

// Transaction types
export type TransactionType = "recharge" | "deduction" | "admin_adjustment";
export type TransactionStatus = "pending" | "success" | "failed";

// Transaction interface
export interface Transaction {
  id: string;
  student_id: string;
  amount: number;
  transaction_type: TransactionType;
  currency: string;
  payment_gateway: string | null;
  payment_id: string | null;
  order_id: string | null;
  status: TransactionStatus;
  balance_before: number;
  balance_after: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Scan status types
export type ScanStatus = "success" | "insufficient_balance" | "limit_exceeded" | "blocked";

// Scan Log interface
export interface ScanLog {
  id: string;
  student_id: string;
  driver_id: string;
  bus_id: string;
  scan_timestamp: string;
  scan_status: ScanStatus;
  fare_deducted: number;
  balance_after_scan: number;
}

// Notification types
export type NotificationType = "recharge" | "deduction" | "low_balance" | "scan" | "system";

// Notification interface
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

// Insert schemas for forms
export const insertStudentSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  enrollment_no: z.string().min(1, "Enrollment number is required"),
  course: z.string().min(1, "Course is required"),
  department: z.string().min(1, "Department is required"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  bus_route_id: z.string().optional(),
});

export const insertDriverSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  license_number: z.string().min(1, "License number is required"),
  bus_id: z.string().optional(),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const insertBusRouteSchema = z.object({
  route_name: z.string().min(1, "Route name is required"),
  route_number: z.string().min(1, "Route number is required"),
  description: z.string().optional(),
  daily_fare: z.number().min(1, "Daily fare must be at least 1"),
});

export const insertBusSchema = z.object({
  bus_number: z.string().min(1, "Bus number is required"),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  route_id: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const rechargeSchema = z.object({
  amount: z.number().min(50, "Minimum recharge is ₹50").max(10000, "Maximum recharge is ₹10,000"),
});

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type InsertBusRoute = z.infer<typeof insertBusRouteSchema>;
export type InsertBus = z.infer<typeof insertBusSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type SignupData = z.infer<typeof signupSchema>;
export type RechargeData = z.infer<typeof rechargeSchema>;

// Extended types with relations
export interface StudentWithRoute extends Student {
  bus_route?: BusRoute;
}

export interface DriverWithBus extends Driver {
  bus?: Bus & { route?: BusRoute };
}

export interface BusWithRoute extends Bus {
  route?: BusRoute;
}

export interface ScanLogWithDetails extends ScanLog {
  student?: Student;
  driver?: Driver;
  bus?: Bus;
}

export interface TransactionWithStudent extends Transaction {
  student?: Student;
}

// Dashboard stats
export interface AdminStats {
  totalBuses: number;
  totalStudents: number;
  studentsWithSufficientBalance: number;
  lowBalanceStudents: number;
  totalDrivers: number;
  totalRoutes: number;
  todayScans: number;
  todayRevenue: number;
}

export interface DriverStats {
  totalStudentsOnRoute: number;
  todayScans: number;
  successfulScans: number;
  failedScans: number;
}
