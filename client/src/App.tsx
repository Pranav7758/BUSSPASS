import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import ProfileSetupPage from "@/pages/student/profile-setup";
import StudentDashboard from "@/pages/student/dashboard";
import StudentPass from "@/pages/student/pass";
import StudentWallet from "@/pages/student/wallet";
import StudentTrackBus from "@/pages/student/track-bus";
import StudentTransactions from "@/pages/student/transactions";
import StudentNotifications from "@/pages/student/notifications";
import DriverDashboard from "@/pages/driver/dashboard";
import DriverStudents from "@/pages/driver/students";
import DriverTrips from "@/pages/driver/trips";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminBuses from "@/pages/admin/buses";
import AdminRoutes from "@/pages/admin/routes";
import AdminStudents from "@/pages/admin/students";
import AdminDrivers from "@/pages/admin/drivers";
import AdminTransactions from "@/pages/admin/transactions";
import AdminReports from "@/pages/admin/reports";
import AdminRouteStops from "@/pages/admin/route-stops";
import NotFound from "@/pages/not-found";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user, loading, student } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (!allowedRoles.includes(user.role)) {
    const redirectPath = user.role === 'student' ? '/student/dashboard' :
                         user.role === 'driver' ? '/driver/dashboard' :
                         '/admin/dashboard';
    return <Redirect to={redirectPath} />;
  }

  if (user.role === 'student' && !student && location !== '/student/profile-setup') {
    return <Redirect to="/student/profile-setup" />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, student } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    if (user.role === 'student' && !student) {
      return <Redirect to="/student/profile-setup" />;
    }
    const redirectPath = user.role === 'student' ? '/student/dashboard' :
                         user.role === 'driver' ? '/driver/dashboard' :
                         '/admin/dashboard';
    return <Redirect to={redirectPath} />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/login" />
      </Route>
      
      <Route path="/login">
        <AuthRoute>
          <LoginPage />
        </AuthRoute>
      </Route>
      
      <Route path="/signup">
        <AuthRoute>
          <SignupPage />
        </AuthRoute>
      </Route>
      
      <Route path="/student/profile-setup">
        <ProtectedRoute allowedRoles={['student']}>
          <ProfileSetupPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/student/dashboard">
        <ProtectedRoute allowedRoles={['student']}>
          <StudentDashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/student/pass">
        <ProtectedRoute allowedRoles={['student']}>
          <StudentPass />
        </ProtectedRoute>
      </Route>
      
      <Route path="/student/wallet">
        <ProtectedRoute allowedRoles={['student']}>
          <StudentWallet />
        </ProtectedRoute>
      </Route>
      
      <Route path="/student/track-bus">
        <ProtectedRoute allowedRoles={['student']}>
          <StudentTrackBus />
        </ProtectedRoute>
      </Route>
      
      <Route path="/student/transactions">
        <ProtectedRoute allowedRoles={['student']}>
          <StudentTransactions />
        </ProtectedRoute>
      </Route>
      
      <Route path="/student/notifications">
        <ProtectedRoute allowedRoles={['student']}>
          <StudentNotifications />
        </ProtectedRoute>
      </Route>
      
      <Route path="/driver/dashboard">
        <ProtectedRoute allowedRoles={['driver']}>
          <DriverDashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/driver/students">
        <ProtectedRoute allowedRoles={['driver']}>
          <DriverStudents />
        </ProtectedRoute>
      </Route>
      
      <Route path="/driver/trips">
        <ProtectedRoute allowedRoles={['driver']}>
          <DriverTrips />
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/dashboard">
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/buses">
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminBuses />
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/routes">
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminRoutes />
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/students">
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminStudents />
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/drivers">
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDrivers />
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/transactions">
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminTransactions />
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/reports">
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminReports />
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/route-stops">
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminRouteStops />
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
