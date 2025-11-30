import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { BusRoute, ScanLog } from '@shared/schema';
import {
  CheckCircle2,
  XCircle,
  CreditCard,
  Route,
  Wallet,
  Calendar,
  QrCode,
  AlertTriangle,
} from 'lucide-react';

export default function StudentPass() {
  const { student } = useAuth();
  const [route, setRoute] = useState<BusRoute | null>(null);
  const [todayScans, setTodayScans] = useState(0);
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

      // Count today's scans
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count } = await supabase
        .from('scan_logs')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', student.id)
        .gte('scan_timestamp', today.toISOString())
        .eq('scan_status', 'success');
      
      setTodayScans(count || 0);
      setLoading(false);
    };

    fetchData();
  }, [student]);

  const dailyFare = route?.daily_fare || 60;
  const hasSufficientBalance = student && student.wallet_balance >= dailyFare;
  const daysRemaining = student ? Math.floor(student.wallet_balance / dailyFare) : 0;

  const getPassStatus = () => {
    if (!student) return { status: 'inactive', label: 'Inactive', color: 'secondary' };
    if (student.is_blocked) return { status: 'blocked', label: 'Blocked', color: 'destructive' };
    if (!hasSufficientBalance) return { status: 'insufficient', label: 'Insufficient Balance', color: 'destructive' };
    return { status: 'active', label: 'Active', color: 'default' };
  };

  const passStatus = getPassStatus();

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex justify-center py-8">
          <Skeleton className="h-[600px] w-full max-w-md" />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="max-w-md mx-auto space-y-6">
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground">Digital Bus Pass</h1>
          <p className="text-muted-foreground mt-1">Show this QR code to the driver</p>
        </div>

        {/* Pass Card */}
        <Card className="overflow-hidden">
          {/* Status Header */}
          <div
            className={`p-4 text-center ${
              passStatus.status === 'active'
                ? 'bg-chart-2/10'
                : 'bg-destructive/10'
            }`}
          >
            <Badge
              variant={passStatus.color as any}
              className="text-sm px-4 py-1"
              data-testid="badge-pass-status"
            >
              {passStatus.status === 'active' && <CheckCircle2 className="h-4 w-4 mr-1" />}
              {passStatus.status !== 'active' && <XCircle className="h-4 w-4 mr-1" />}
              {passStatus.label}
            </Badge>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Student Photo & Name */}
            <div className="flex flex-col items-center space-y-3">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={student?.photo_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {student?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h2 className="text-xl font-semibold" data-testid="text-student-name">
                  {student?.full_name}
                </h2>
                <p className="text-sm text-muted-foreground" data-testid="text-enrollment">
                  {student?.enrollment_no}
                </p>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="flex flex-col items-center py-4">
              {hasSufficientBalance && !student?.is_blocked ? (
                <div className="p-4 bg-white rounded-lg shadow-sm" data-testid="qr-code-container">
                  <QRCodeSVG
                    value={student?.id || ''}
                    size={200}
                    level="H"
                    includeMargin
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center p-8 rounded-lg border-2 border-dashed border-destructive/30 bg-destructive/5">
                  <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
                  <p className="font-medium text-destructive text-center">
                    {student?.is_blocked ? 'Pass Blocked' : 'Insufficient Balance'}
                  </p>
                  <p className="text-sm text-muted-foreground text-center mt-1">
                    {student?.is_blocked
                      ? 'Contact administrator for assistance'
                      : 'Please recharge your wallet to use your pass'}
                  </p>
                  {!student?.is_blocked && (
                    <Link href="/student/wallet">
                      <Button className="mt-4" data-testid="button-recharge-pass">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Recharge Now
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Pass Details */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Route className="h-5 w-5" />
                  <span>Route</span>
                </div>
                <span className="font-medium" data-testid="text-route">
                  {route ? `${route.route_number} - ${route.route_name}` : 'Not assigned'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Wallet className="h-5 w-5" />
                  <span>Wallet Balance</span>
                </div>
                <span className={`font-medium ${!hasSufficientBalance ? 'text-destructive' : ''}`}>
                  ₹{student?.wallet_balance?.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <CreditCard className="h-5 w-5" />
                  <span>Daily Fare</span>
                </div>
                <span className="font-medium">₹{dailyFare}</span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Calendar className="h-5 w-5" />
                  <span>Days Remaining</span>
                </div>
                <span className={`font-medium ${daysRemaining <= 3 ? 'text-destructive' : ''}`}>
                  {daysRemaining} days
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <QrCode className="h-5 w-5" />
                  <span>Scans Today</span>
                </div>
                <span className="font-medium">{todayScans} / 2</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Note */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              Your pass allows 2 scans per day. First scan deducts fare, second scan is free (return trip).
            </p>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
