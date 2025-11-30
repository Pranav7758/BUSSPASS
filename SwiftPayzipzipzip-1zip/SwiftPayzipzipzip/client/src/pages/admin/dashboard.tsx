import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminStats, Transaction } from '@shared/schema';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  Bus,
  Users,
  Route,
  Wallet,
  TrendingUp,
  AlertTriangle,
  QrCode,
  IndianRupee,
} from 'lucide-react';

const COLORS = ['#1976d2', '#2e7d32', '#f57c00', '#c62828'];

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [walletDistribution, setWalletDistribution] = useState<any[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Get counts
      const [busesResult, studentsResult, driversResult, routesResult] = await Promise.all([
        supabase.from('buses').select('*', { count: 'exact', head: true }),
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('drivers').select('*', { count: 'exact', head: true }),
        supabase.from('bus_routes').select('*', { count: 'exact', head: true }),
      ]);

      // Get students with sufficient balance (assuming ₹60 daily fare)
      const { data: studentsData } = await supabase
        .from('students')
        .select('wallet_balance');

      const sufficientBalance = studentsData?.filter((s) => s.wallet_balance >= 60).length || 0;
      const lowBalance = studentsData?.filter((s) => s.wallet_balance < 60).length || 0;

      // Get today's scans
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: todayScans } = await supabase
        .from('scan_logs')
        .select('*', { count: 'exact', head: true })
        .gte('scan_timestamp', today.toISOString());

      // Get today's revenue (recharges)
      const { data: todayRecharges } = await supabase
        .from('transactions')
        .select('amount')
        .eq('transaction_type', 'recharge')
        .eq('status', 'success')
        .gte('created_at', today.toISOString());

      const todayRevenue = todayRecharges?.reduce((sum, t) => sum + t.amount, 0) || 0;

      setStats({
        totalBuses: busesResult.count || 0,
        totalStudents: studentsResult.count || 0,
        totalDrivers: driversResult.count || 0,
        totalRoutes: routesResult.count || 0,
        studentsWithSufficientBalance: sufficientBalance,
        lowBalanceStudents: lowBalance,
        todayScans: todayScans || 0,
        todayRevenue,
      });

      // Get wallet distribution for pie chart
      if (studentsData) {
        const distribution = [
          { name: '₹0-100', value: studentsData.filter(s => s.wallet_balance < 100).length },
          { name: '₹100-500', value: studentsData.filter(s => s.wallet_balance >= 100 && s.wallet_balance < 500).length },
          { name: '₹500-1000', value: studentsData.filter(s => s.wallet_balance >= 500 && s.wallet_balance < 1000).length },
          { name: '₹1000+', value: studentsData.filter(s => s.wallet_balance >= 1000).length },
        ];
        setWalletDistribution(distribution);
      }

      // Get monthly revenue for line chart (last 7 days)
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const { data: dayRecharges } = await supabase
          .from('transactions')
          .select('amount')
          .eq('transaction_type', 'recharge')
          .eq('status', 'success')
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDate.toISOString());

        last7Days.push({
          date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          revenue: dayRecharges?.reduce((sum, t) => sum + t.amount, 0) || 0,
        });
      }
      setMonthlyRevenue(last7Days);

      // Get recent transactions
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (txData) setRecentTransactions(txData);

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <SidebarLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your transport management system</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Buses
              </CardTitle>
              <Bus className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalBuses}</div>
              <Link href="/admin/buses">
                <p className="text-sm text-primary hover:underline mt-1">Manage buses</p>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Students
              </CardTitle>
              <Users className="h-5 w-5 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalStudents}</div>
              <Link href="/admin/students">
                <p className="text-sm text-primary hover:underline mt-1">View all students</p>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Passes
              </CardTitle>
              <Wallet className="h-5 w-5 text-chart-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.studentsWithSufficientBalance}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {stats?.lowBalanceStudents} with low balance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today's Revenue
              </CardTitle>
              <IndianRupee className="h-5 w-5 text-chart-3" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{stats?.todayRevenue?.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {stats?.todayScans} scans today
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-4">
          <Link href="/admin/routes">
            <Card className="hover-elevate cursor-pointer">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Route className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Routes</p>
                  <p className="text-sm text-muted-foreground">{stats?.totalRoutes} routes</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/drivers">
            <Card className="hover-elevate cursor-pointer">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                  <Users className="h-5 w-5 text-chart-2" />
                </div>
                <div>
                  <p className="font-medium">Drivers</p>
                  <p className="text-sm text-muted-foreground">{stats?.totalDrivers} drivers</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/transactions">
            <Card className="hover-elevate cursor-pointer">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4/10">
                  <TrendingUp className="h-5 w-5 text-chart-4" />
                </div>
                <div>
                  <p className="font-medium">Transactions</p>
                  <p className="text-sm text-muted-foreground">View history</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/reports">
            <Card className="hover-elevate cursor-pointer">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10">
                  <QrCode className="h-5 w-5 text-chart-3" />
                </div>
                <div>
                  <p className="font-medium">Reports</p>
                  <p className="text-sm text-muted-foreground">Analytics</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue (Last 7 Days)</CardTitle>
              <CardDescription>Daily recharge amounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                      formatter={(value: number) => [`₹${value}`, 'Revenue']}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Wallet Balance Distribution</CardTitle>
              <CardDescription>Student wallet balances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={walletDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {walletDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                      formatter={(value: number) => [`${value} students`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {walletDistribution.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {entry.name}: {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
}
