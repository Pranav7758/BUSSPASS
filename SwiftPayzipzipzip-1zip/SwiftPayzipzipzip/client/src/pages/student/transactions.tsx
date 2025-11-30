import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { Transaction } from '@shared/schema';
import {
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Receipt,
} from 'lucide-react';

export default function StudentTransactions() {
  const { student } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!student) return;

      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false });

      if (data) setTransactions(data);
      setLoading(false);
    };

    fetchTransactions();
  }, [student]);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.payment_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || tx.transaction_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="default" className="bg-chart-2/10 text-chart-2 border-chart-2/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Transactions</h1>
          <p className="text-muted-foreground mt-1">Your complete transaction history</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-transactions"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-type">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              <SelectItem value="recharge">Recharges</SelectItem>
              <SelectItem value="deduction">Deductions</SelectItem>
              <SelectItem value="admin_adjustment">Adjustments</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No transactions found</p>
                <p className="text-sm mt-1">
                  {searchQuery || filterType !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Your transactions will appear here'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors gap-4"
                    data-testid={`transaction-row-${tx.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full shrink-0 ${
                          tx.transaction_type === 'recharge'
                            ? 'bg-chart-2/10'
                            : tx.transaction_type === 'admin_adjustment'
                            ? 'bg-chart-4/10'
                            : 'bg-destructive/10'
                        }`}
                      >
                        {tx.transaction_type === 'recharge' ? (
                          <ArrowDownLeft className="h-6 w-6 text-chart-2" />
                        ) : (
                          <ArrowUpRight className="h-6 w-6 text-destructive" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">
                            {tx.transaction_type === 'recharge'
                              ? 'Wallet Recharge'
                              : tx.transaction_type === 'admin_adjustment'
                              ? 'Admin Adjustment'
                              : 'Fare Deduction'}
                          </p>
                          {getStatusBadge(tx.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {tx.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>
                            {new Date(tx.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {tx.payment_id && (
                            <span className="font-mono">ID: {tx.payment_id.slice(0, 12)}...</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right sm:text-right pl-16 sm:pl-0">
                      <p
                        className={`text-xl font-semibold ${
                          tx.transaction_type === 'recharge' || tx.amount > 0
                            ? 'text-chart-2'
                            : 'text-destructive'
                        }`}
                      >
                        {tx.transaction_type === 'recharge' || tx.amount > 0 ? '+' : '-'}₹
                        {Math.abs(tx.amount).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Balance: ₹{tx.balance_after.toFixed(2)}
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
