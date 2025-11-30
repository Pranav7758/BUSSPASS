import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
  AreaChart,
  Area,
} from 'recharts';
import { TrendingUp, Users, Wallet, QrCode, Route, Bus } from 'lucide-react';

const COLORS = ['#1976d2', '#2e7d32', '#f57c00', '#c62828', '#7b1fa2'];

export default function AdminReports() {
  const [loading, setLoading] = useState(true);
  const [dailyScans, setDailyScans] = useState<any[]>([]);
  const [routeDistribution, setRouteDistribution] = useState<any[]>([]);
  const [revenueByType, setRevenueByType] = useState<any[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [stats, setStats] = useState({
    avgBalance: 0,
    totalRevenue: 0,
    totalScans: 0,
    activeStudents: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      // Get daily scans for last 7 days
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const { count: successCount } = await supabase
          .from('scan_logs')
          .select('*', { count: 'exact', head: true })
          .eq('scan_status', 'success')
          .gte('scan_timestamp', date.toISOString())
          .lt('scan_timestamp', nextDate.toISOString());

        const { count: failedCount } = await supabase
          .from('scan_logs')
          .select('*', { count: 'exact', head: true })
          .neq('scan_status', 'success')
          .gte('scan_timestamp', date.toISOString())
          .lt('scan_timestamp', nextDate.toISOString());

        last7Days.push({
          date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          success: successCount || 0,
          failed: failedCount || 0,
        });
      }
      setDailyScans(last7Days);

      // Get route distribution
      const { data: routes } = await supabase.from('bus_routes').select('id, route_name');
      if (routes) {
        const routeStats = await Promise.all(
          routes.map(async (route) => {
            const { count } = await supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('bus_route_id', route.id);
            return { name: route.route_name, value: count || 0 };
          })
        );
        setRouteDistribution(routeStats.filter((r) => r.value > 0));
      }

      // Get revenue by type
      const { data: recharges } = await supabase
        .from('transactions')
        .select('amount')
        .eq('transaction_type', 'recharge')
        .eq('status', 'success');

      const { data: deductions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('transaction_type', 'deduction')
        .eq('status', 'success');

      setRevenueByType([
        { name: 'Recharges', value: recharges?.reduce((s, t) => s + t.amount, 0) || 0 },
        { name: 'Deductions', value: deductions?.reduce((s, t) => s + t.amount, 0) || 0 },
      ]);

      // Get monthly trend (last 30 days)
      const monthlyData = [];
      for (let i = 29; i >= 0; i--) {
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

        monthlyData.push({
          date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          revenue: dayRecharges?.reduce((s, t) => s + t.amount, 0) || 0,
        });
      }
      setMonthlyTrend(monthlyData);

      // Get overall stats
      const { data: students } = await supabase.from('students').select('wallet_balance');
      const avgBalance = students?.length
        ? students.reduce((s, st) => s + st.wallet_balance, 0) / students.length
        : 0;
      const activeStudents = students?.filter((s) => s.wallet_balance >= 60).length || 0;

      const totalRevenue = recharges?.reduce((s, t) => s + t.amount, 0) || 0;
      const { count: totalScans } = await supabase
        .from('scan_logs')
        .select('*', { count: 'exact', head: true });

      setStats({
        avgBalance,
        totalRevenue,
        totalScans: totalScans || 0,
        activeStudents,
      });

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <SidebarLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
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
          <h1 className="text-2xl font-semibold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Insights and statistics for your transport system</p>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-chart-2/10">
                <Wallet className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Balance</p>
                <p className="text-xl font-bold">₹{stats.avgBalance.toFixed(0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-chart-4/10">
                <QrCode className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Scans</p>
                <p className="text-xl font-bold">{stats.totalScans.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-chart-3/10">
                <Users className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Passes</p>
                <p className="text-xl font-bold">{stats.activeStudents}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Daily Scans */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Scans (Last 7 Days)</CardTitle>
              <CardDescription>Success vs Failed scans per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyScans}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Bar dataKey="success" fill="#2e7d32" name="Success" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="failed" fill="#c62828" name="Failed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Route Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Students by Route</CardTitle>
              <CardDescription>Distribution across bus routes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={routeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {routeDistribution.map((entry, index) => (
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
                {routeDistribution.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-muted-foreground truncate max-w-[100px]">
                      {entry.name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue Trend */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Revenue Trend (Last 30 Days)</CardTitle>
              <CardDescription>Daily recharge amounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                      formatter={(value: number) => [`₹${value}`, 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary) / 0.2)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
}
