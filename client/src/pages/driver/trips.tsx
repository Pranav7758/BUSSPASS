import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { ScanLog, Student } from '@shared/schema';
import { Calendar, Clock, Users, CheckCircle2, XCircle, History } from 'lucide-react';

interface ScanLogWithStudent extends ScanLog {
  student?: Student;
}

interface GroupedScans {
  date: string;
  displayDate: string;
  scans: ScanLogWithStudent[];
  successCount: number;
  failedCount: number;
  firstScan?: string;
  lastScan?: string;
}

export default function DriverTrips() {
  const { driver } = useAuth();
  const [groupedScans, setGroupedScans] = useState<GroupedScans[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!driver) {
        setLoading(false);
        return;
      }

      // Fetch scan logs with student info
      const { data: scansData } = await supabase
        .from('scan_logs')
        .select('*, students(*)')
        .eq('driver_id', driver.id)
        .order('scan_timestamp', { ascending: false });

      if (scansData) {
        // Group by date
        const grouped: Record<string, ScanLogWithStudent[]> = {};
        
        scansData.forEach((scan: any) => {
          const date = new Date(scan.scan_timestamp).toISOString().split('T')[0];
          if (!grouped[date]) {
            grouped[date] = [];
          }
          grouped[date].push({
            ...scan,
            student: scan.students,
          });
        });

        // Convert to array with stats
        const groupedArray: GroupedScans[] = Object.entries(grouped).map(([date, scans]) => {
          const successCount = scans.filter((s) => s.scan_status === 'success').length;
          const failedCount = scans.filter((s) => s.scan_status !== 'success').length;
          const timestamps = scans.map((s) => new Date(s.scan_timestamp).getTime());
          
          return {
            date,
            displayDate: new Date(date).toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }),
            scans,
            successCount,
            failedCount,
            firstScan: timestamps.length > 0 
              ? new Date(Math.min(...timestamps)).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
              : undefined,
            lastScan: timestamps.length > 0
              ? new Date(Math.max(...timestamps)).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
              : undefined,
          };
        });

        setGroupedScans(groupedArray);
      }

      setLoading(false);
    };

    fetchData();
  }, [driver]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="default" className="bg-chart-2/10 text-chart-2 border-chart-2/20">
            Success
          </Badge>
        );
      case 'insufficient_balance':
        return <Badge variant="destructive">Low Balance</Badge>;
      case 'limit_exceeded':
        return <Badge variant="secondary">Limit</Badge>;
      case 'blocked':
        return <Badge variant="destructive">Blocked</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
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
          <h1 className="text-2xl font-semibold text-foreground">Trip History</h1>
          <p className="text-muted-foreground mt-1">View your scan history grouped by date</p>
        </div>

        {/* Trip History */}
        {groupedScans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <History className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No scan history</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">
                Your scan history will appear here after you start scanning student passes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="space-y-4">
            {groupedScans.map((group) => (
              <AccordionItem
                key={group.date}
                value={group.date}
                className="border rounded-lg bg-card overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{group.displayDate}</p>
                        <p className="text-sm text-muted-foreground">
                          {group.firstScan} - {group.lastScan}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-chart-2" />
                        <span>{group.successCount}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span>{group.failedCount}</span>
                      </div>
                      <Badge variant="secondary">
                        {group.scans.length} scans
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3 pt-2">
                    {group.scans.map((scan) => (
                      <div
                        key={scan.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-background"
                        data-testid={`scan-log-${scan.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={scan.student?.photo_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {scan.student?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {scan.student?.full_name || 'Unknown Student'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {scan.student?.enrollment_no}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm">
                              {new Date(scan.scan_timestamp).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            {scan.fare_deducted > 0 && (
                              <p className="text-xs text-muted-foreground">
                                -₹{scan.fare_deducted}
                              </p>
                            )}
                          </div>
                          {getStatusBadge(scan.scan_status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </SidebarLayout>
  );
}
