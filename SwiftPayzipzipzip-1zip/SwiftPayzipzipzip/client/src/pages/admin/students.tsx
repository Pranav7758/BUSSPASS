import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { StudentWithRoute, BusRoute } from '@shared/schema';
import { Search, Users, Edit, Ban, Wallet, GraduationCap, Phone } from 'lucide-react';

export default function AdminStudents() {
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentWithRoute[]>([]);
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithRoute | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');

  const fetchData = async () => {
    const [studentsResult, routesResult] = await Promise.all([
      supabase.from('students').select('*, bus_routes(*)').order('full_name'),
      supabase.from('bus_routes').select('*').order('route_name'),
    ]);

    if (studentsResult.data) {
      setStudents(studentsResult.data.map((s: any) => ({ ...s, bus_route: s.bus_routes })));
    }
    if (routesResult.data) setRoutes(routesResult.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleBlock = async (student: StudentWithRoute) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ is_blocked: !student.is_blocked })
        .eq('id', student.id);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `Student ${student.is_blocked ? 'unblocked' : 'blocked'} successfully`,
      });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const adjustBalance = async () => {
    if (!selectedStudent || !adjustmentAmount) return;

    const amount = parseFloat(adjustmentAmount);
    if (isNaN(amount)) {
      toast({ title: 'Error', description: 'Invalid amount', variant: 'destructive' });
      return;
    }

    try {
      const newBalance = selectedStudent.wallet_balance + amount;
      if (newBalance < 0) {
        toast({ title: 'Error', description: 'Balance cannot be negative', variant: 'destructive' });
        return;
      }

      // Update balance
      const { error: updateError } = await supabase
        .from('students')
        .update({ wallet_balance: newBalance })
        .eq('id', selectedStudent.id);

      if (updateError) throw updateError;

      // Create transaction record
      await supabase.from('transactions').insert({
        student_id: selectedStudent.id,
        amount: Math.abs(amount),
        transaction_type: 'admin_adjustment',
        currency: 'INR',
        status: 'success',
        balance_before: selectedStudent.wallet_balance,
        balance_after: newBalance,
        description: `Admin adjustment: ${amount > 0 ? '+' : ''}${amount}`,
      });

      // Notify student
      await supabase.from('notifications').insert({
        user_id: selectedStudent.user_id,
        title: 'Wallet Adjusted',
        message: `Your wallet balance has been adjusted by ₹${amount}. New balance: ₹${newBalance.toFixed(2)}`,
        type: 'system',
        is_read: false,
      });

      toast({ title: 'Success', description: 'Balance adjusted successfully' });
      setSelectedStudent(null);
      setAdjustmentAmount('');
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const filteredStudents = students.filter(
    (student) =>
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.enrollment_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.course.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SidebarLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full max-w-md" />
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
          <h1 className="text-2xl font-semibold text-foreground">Students</h1>
          <p className="text-muted-foreground mt-1">Manage student accounts and wallets</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, enrollment, or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-students"
          />
        </div>

        {/* Students Table */}
        <Card>
          <CardContent className="p-0">
            {filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No students found</h3>
                <p className="text-muted-foreground mt-2">
                  {searchQuery ? 'Try a different search' : 'No students have registered yet'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-medium text-muted-foreground">Student</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Enrollment</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Course</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Route</th>
                      <th className="text-right p-4 font-medium text-muted-foreground">Balance</th>
                      <th className="text-center p-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-center p-4 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="border-b hover:bg-muted/30" data-testid={`student-row-${student.id}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={student.photo_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {student.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{student.full_name}</p>
                              <p className="text-sm text-muted-foreground">{student.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm">{student.enrollment_no}</td>
                        <td className="p-4 text-sm">{student.course}</td>
                        <td className="p-4 text-sm">
                          {student.bus_route
                            ? `${student.bus_route.route_number} - ${student.bus_route.route_name}`
                            : '-'}
                        </td>
                        <td className="p-4 text-right">
                          <span className={`font-medium ${student.wallet_balance < 60 ? 'text-destructive' : ''}`}>
                            ₹{student.wallet_balance.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <Badge variant={student.is_blocked ? 'destructive' : 'default'}>
                            {student.is_blocked ? 'Blocked' : 'Active'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedStudent(student)}
                              data-testid={`button-adjust-${student.id}`}
                            >
                              <Wallet className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleBlock(student)}
                              className={student.is_blocked ? 'text-chart-2' : 'text-destructive'}
                              data-testid={`button-toggle-block-${student.id}`}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Adjustment Dialog */}
        <Dialog open={!!selectedStudent} onOpenChange={() => { setSelectedStudent(null); setAdjustmentAmount(''); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Wallet Balance</DialogTitle>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedStudent.photo_url || undefined} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {selectedStudent.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-lg">{selectedStudent.full_name}</p>
                    <p className="text-muted-foreground">{selectedStudent.enrollment_no}</p>
                    <p className="text-sm mt-1">
                      Current Balance: <span className="font-semibold">₹{selectedStudent.wallet_balance.toFixed(2)}</span>
                    </p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="amount">Adjustment Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    placeholder="Enter amount (use negative for deduction)"
                    data-testid="input-adjustment-amount"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Use positive value to add, negative to deduct
                  </p>
                </div>
                <Button onClick={adjustBalance} className="w-full" data-testid="button-confirm-adjustment">
                  Confirm Adjustment
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SidebarLayout>
  );
}
