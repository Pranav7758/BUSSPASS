import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { Student, Bus, BusRoute } from '@shared/schema';
import { Search, Users, GraduationCap, QrCode } from 'lucide-react';

interface StudentWithScans extends Student {
  scans_today: number;
}

export default function DriverStudents() {
  const { driver } = useAuth();
  const [students, setStudents] = useState<StudentWithScans[]>([]);
  const [route, setRoute] = useState<BusRoute | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!driver?.bus_id) {
        setLoading(false);
        return;
      }

      // Fetch bus and route
      const { data: busData } = await supabase
        .from('buses')
        .select('route_id')
        .eq('id', driver.bus_id)
        .single();

      if (!busData?.route_id) {
        setLoading(false);
        return;
      }

      // Fetch route
      const { data: routeData } = await supabase
        .from('bus_routes')
        .select('*')
        .eq('id', busData.route_id)
        .single();
      if (routeData) setRoute(routeData);

      // Fetch students on route
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .eq('bus_route_id', busData.route_id)
        .order('full_name');

      if (studentsData) {
        // Get today's scans for each student
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const studentsWithScans = await Promise.all(
          studentsData.map(async (student) => {
            const { count } = await supabase
              .from('scan_logs')
              .select('*', { count: 'exact', head: true })
              .eq('student_id', student.id)
              .eq('scan_status', 'success')
              .gte('scan_timestamp', today.toISOString());

            return { ...student, scans_today: count || 0 };
          })
        );

        setStudents(studentsWithScans);
      }

      setLoading(false);
    };

    fetchData();
  }, [driver]);

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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
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
          <h1 className="text-2xl font-semibold text-foreground">Students</h1>
          <p className="text-muted-foreground mt-1">
            {route ? `Students on ${route.route_number} - ${route.route_name}` : 'No route assigned'}
          </p>
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

        {/* Students Grid */}
        {filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No students found</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'No students are assigned to your route yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredStudents.map((student) => (
              <Card key={student.id} data-testid={`student-card-${student.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={student.photo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {student.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium truncate">{student.full_name}</p>
                          <p className="text-sm text-muted-foreground">{student.enrollment_no}</p>
                        </div>
                        <Badge
                          variant={student.is_blocked ? 'destructive' : student.wallet_balance >= (route?.daily_fare || 60) ? 'default' : 'secondary'}
                        >
                          {student.is_blocked ? 'Blocked' : student.wallet_balance >= (route?.daily_fare || 60) ? 'Active' : 'Low Bal'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <GraduationCap className="h-4 w-4" />
                          <span className="truncate">{student.course}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <div className="flex items-center gap-1 text-sm">
                          <QrCode className="h-4 w-4 text-muted-foreground" />
                          <span>Scans today: {student.scans_today}/2</span>
                        </div>
                        <span className="text-sm font-medium">
                          ₹{student.wallet_balance.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary */}
        <Card className="bg-muted/50">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredStudents.length} of {students.length} students
            </p>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
