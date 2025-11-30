import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Transaction, BusRoute } from '@shared/schema';
import {
  Wallet,
  Calendar,
  QrCode,
  MapPin,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

export default function StudentDashboard() {
  const { student } = useAuth();
  const [route, setRoute] = useState<BusRoute | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!student) return;

      // Fetch route info
      if (student.bus_route_id) {
        const { data: routeData } = await supabase
          .from('bus_routes')
          .select('*')
          .eq('id', student.bus_route_id)
          .single();
        if (routeData) setRoute(routeData);
      }

      // Fetch recent transactions
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (txData) setRecentTransactions(txData);

      setLoading(false);
    };

    fetchData();
  }, [student]);

  const dailyFare = route?.daily_fare || 60;
  const daysRemaining = student ? Math.floor(student.wallet_balance / dailyFare) : 0;
  const isLowBalance = daysRemaining <= 3;

  if (loading) {
    return (
      <SidebarLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
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
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome back, {student?.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's an overview of your bus pass status
          </p>
        </div>

        {/* Low Balance Alert */}
        {isLowBalance && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-destructive">Low Balance Warning</p>
                <p className="text-sm text-muted-foreground">
                  Your wallet balance is low. Recharge soon to continue using your bus pass.
                </p>
              </div>
              <Link href="/student/wallet">
                <Button size="sm" data-testid="button-recharge-alert">
                  Recharge Now
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Wallet Balance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Wallet Balance
              </CardTitle>
              <Wallet className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground" data-testid="text-wallet-balance">
                ₹{student?.wallet_balance?.toFixed(2) || '0.00'}
              </div>
              <p className={`text-sm mt-1 ${isLowBalance ? 'text-destructive' : 'text-muted-foreground'}`}>
                {isLowBalance ? 'Low balance' : 'Available balance'}
              </p>
            </CardContent>
          </Card>

          {/* Days Remaining */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Days Remaining
              </CardTitle>
              <Calendar className="h-5 w-5 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground" data-testid="text-days-remaining">
                {daysRemaining}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                At ₹{dailyFare}/day
              </p>
            </CardContent>
          </Card>

          {/* Daily Fare */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Daily Fare
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-chart-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                ₹{dailyFare}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {route?.route_name || 'No route selected'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/student/wallet">
            <Card className="hover-elevate cursor-pointer transition-all">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Recharge Wallet</p>
                  <p className="text-sm text-muted-foreground">Add money</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/student/pass">
            <Card className="hover-elevate cursor-pointer transition-all">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2/10">
                  <QrCode className="h-6 w-6 text-chart-2" />
                </div>
                <div>
                  <p className="font-medium">View Pass</p>
                  <p className="text-sm text-muted-foreground">Show QR code</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/student/track-bus">
            <Card className="hover-elevate cursor-pointer transition-all">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-4/10">
                  <MapPin className="h-6 w-6 text-chart-4" />
                </div>
                <div>
                  <p className="font-medium">Track Bus</p>
                  <p className="text-sm text-muted-foreground">Live location</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/student/transactions">
            <Card className="hover-elevate cursor-pointer transition-all">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-3/10">
                  <Wallet className="h-6 w-6 text-chart-3" />
                </div>
                <div>
                  <p className="font-medium">Transactions</p>
                  <p className="text-sm text-muted-foreground">View history</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest wallet activity</CardDescription>
            </div>
            <Link href="/student/transactions">
              <Button variant="ghost" size="sm" data-testid="button-view-all-transactions">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No transactions yet</p>
                <p className="text-sm">Recharge your wallet to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                    data-testid={`transaction-${tx.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          tx.transaction_type === 'recharge'
                            ? 'bg-chart-2/10'
                            : 'bg-destructive/10'
                        }`}
                      >
                        {tx.transaction_type === 'recharge' ? (
                          <ArrowDownLeft className="h-5 w-5 text-chart-2" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {tx.transaction_type === 'recharge' ? 'Wallet Recharge' : 'Fare Deduction'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          tx.transaction_type === 'recharge' ? 'text-chart-2' : 'text-destructive'
                        }`}
                      >
                        {tx.transaction_type === 'recharge' ? '+' : '-'}₹{Math.abs(tx.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Bal: ₹{tx.balance_after.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
