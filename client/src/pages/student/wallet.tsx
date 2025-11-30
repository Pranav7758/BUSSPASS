import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { BusRoute, Transaction } from '@shared/schema';
import {
  Wallet,
  Calendar,
  CreditCard,
  IndianRupee,
  Loader2,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

const quickAmounts = [500, 1000, 2000, 5000];

export default function StudentWallet() {
  const { student, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [route, setRoute] = useState<BusRoute | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
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
        .limit(10);
      if (txData) setRecentTransactions(txData);

      setLoading(false);
    };

    fetchData();
  }, [student]);

  const dailyFare = route?.daily_fare || 60;
  const daysRemaining = student ? Math.floor(student.wallet_balance / dailyFare) : 0;

  const handleQuickAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const getRechargeAmount = () => {
    if (selectedAmount) return selectedAmount;
    const parsed = parseInt(customAmount);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleRecharge = async () => {
    const amount = getRechargeAmount();
    
    if (amount < 50) {
      toast({
        title: 'Invalid amount',
        description: 'Minimum recharge amount is ₹50',
        variant: 'destructive',
      });
      return;
    }

    if (amount > 10000) {
      toast({
        title: 'Invalid amount',
        description: 'Maximum recharge amount is ₹10,000',
        variant: 'destructive',
      });
      return;
    }

    if (!student) return;

    setIsProcessing(true);

    try {
      // For now, we'll simulate a successful payment (mock Razorpay)
      // In production, this would integrate with real Razorpay
      
      const balanceBefore = student.wallet_balance;
      const balanceAfter = balanceBefore + amount;

      // Create transaction record
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          student_id: student.id,
          amount: amount,
          transaction_type: 'recharge',
          currency: 'INR',
          payment_gateway: 'razorpay_mock',
          payment_id: `mock_${Date.now()}`,
          order_id: `order_${Date.now()}`,
          status: 'success',
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          description: 'Wallet recharge',
        });

      if (txError) throw txError;

      // Update wallet balance
      const { error: updateError } = await supabase
        .from('students')
        .update({ wallet_balance: balanceAfter })
        .eq('id', student.id);

      if (updateError) throw updateError;

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: student.user_id,
          title: 'Wallet Recharged',
          message: `₹${amount} has been added to your wallet. New balance: ₹${balanceAfter.toFixed(2)}`,
          type: 'recharge',
          is_read: false,
        });

      // Refresh profile to get updated balance
      await refreshProfile();

      // Refresh transactions
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (txData) setRecentTransactions(txData);

      toast({
        title: 'Recharge successful!',
        description: `₹${amount} has been added to your wallet.`,
      });

      setSelectedAmount(null);
      setCustomAmount('');
    } catch (err: any) {
      toast({
        title: 'Recharge failed',
        description: err.message || 'An error occurred during recharge.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
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
          <h1 className="text-2xl font-semibold text-foreground">Wallet</h1>
          <p className="text-muted-foreground mt-1">Manage your bus pass balance</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Wallet Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Wallet Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-4">
                <div className="text-4xl font-bold text-foreground" data-testid="text-current-balance">
                  ₹{student?.wallet_balance?.toFixed(2)}
                </div>
                <p className="text-muted-foreground mt-1">Available Balance</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <Calendar className="h-6 w-6 mx-auto mb-2 text-chart-2" />
                  <div className="text-2xl font-semibold">{daysRemaining}</div>
                  <p className="text-sm text-muted-foreground">Days Remaining</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <IndianRupee className="h-6 w-6 mx-auto mb-2 text-chart-4" />
                  <div className="text-2xl font-semibold">₹{dailyFare}</div>
                  <p className="text-sm text-muted-foreground">Daily Fare</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recharge Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Recharge Wallet
              </CardTitle>
              <CardDescription>Add money to your wallet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Amount Buttons */}
              <div>
                <Label className="mb-3 block">Quick Recharge</Label>
                <div className="grid grid-cols-2 gap-3">
                  {quickAmounts.map((amount) => (
                    <Button
                      key={amount}
                      variant={selectedAmount === amount ? 'default' : 'outline'}
                      onClick={() => handleQuickAmountSelect(amount)}
                      className="h-12 text-lg"
                      data-testid={`button-amount-${amount}`}
                    >
                      ₹{amount}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Amount Input */}
              <div>
                <Label htmlFor="custom-amount" className="mb-2 block">
                  Or enter custom amount
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    id="custom-amount"
                    type="number"
                    placeholder="Enter amount (50 - 10,000)"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    className="pl-8"
                    min={50}
                    max={10000}
                    data-testid="input-custom-amount"
                  />
                </div>
              </div>

              {/* Recharge Button */}
              <Button
                className="w-full h-12"
                disabled={getRechargeAmount() < 50 || isProcessing}
                onClick={handleRecharge}
                data-testid="button-recharge"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Recharge ₹{getRechargeAmount() || 0}
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Powered by Razorpay. Min: ₹50, Max: ₹10,000
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your wallet activity</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-3 border-b last:border-0"
                    data-testid={`wallet-transaction-${tx.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          tx.transaction_type === 'recharge'
                            ? 'bg-chart-2/10'
                            : tx.transaction_type === 'admin_adjustment'
                            ? 'bg-chart-4/10'
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
                        <p className="font-medium">
                          {tx.transaction_type === 'recharge'
                            ? 'Wallet Recharge'
                            : tx.transaction_type === 'admin_adjustment'
                            ? 'Admin Adjustment'
                            : 'Fare Deduction'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          tx.transaction_type === 'recharge' || tx.amount > 0
                            ? 'text-chart-2'
                            : 'text-destructive'
                        }`}
                      >
                        {tx.transaction_type === 'recharge' || tx.amount > 0 ? '+' : '-'}₹
                        {Math.abs(tx.amount).toFixed(2)}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                        {tx.status === 'success' && (
                          <CheckCircle2 className="h-3 w-3 text-chart-2" />
                        )}
                        <span>Bal: ₹{tx.balance_after.toFixed(2)}</span>
                      </div>
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
