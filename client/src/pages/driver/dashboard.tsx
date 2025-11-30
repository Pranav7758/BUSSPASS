import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import type { Bus, BusRoute, Student, RouteStop, ActiveTrip, TripStopStatus } from '@shared/schema';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Play,
  Square,
  QrCode,
  Users,
  CheckCircle2,
  XCircle,
  Bus as BusIcon,
  Route,
  Loader2,
  X,
  MapPin,
  ArrowRight,
  Clock,
  Navigation,
  Wifi,
} from 'lucide-react';

const ARRIVAL_RADIUS_METERS = 50;
const DEPARTURE_RADIUS_METERS = 80;

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

interface ScanResult {
  status: 'success' | 'insufficient_balance' | 'limit_exceeded' | 'blocked' | 'not_found';
  student?: Student;
  message: string;
  fareDeducted?: number;
  balanceAfter?: number;
}

interface StopWithStatus extends RouteStop {
  status: TripStopStatus;
  event_id?: string;
}

export default function DriverDashboard() {
  const { driver } = useAuth();
  const { toast } = useToast();
  
  const [bus, setBus] = useState<Bus | null>(null);
  const [route, setRoute] = useState<BusRoute | null>(null);
  const [stops, setStops] = useState<StopWithStatus[]>([]);
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [todayStats, setTodayStats] = useState({ total: 0, success: 0, failed: 0 });
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingStop, setUpdatingStop] = useState<string | null>(null);
  
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastAutoUpdateRef = useRef<{stopId: string, status: TripStopStatus, time: number} | null>(null);
  
  const [testMode, setTestMode] = useState(false);
  const [simulatingStop, setSimulatingStop] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!driver?.bus_id) {
        setLoading(false);
        return;
      }

      const { data: busData } = await supabase
        .from('buses')
        .select('*')
        .eq('id', driver.bus_id)
        .single();
      if (busData) {
        setBus(busData);

        if (busData.route_id) {
          const { data: routeData } = await supabase
            .from('bus_routes')
            .select('*')
            .eq('id', busData.route_id)
            .single();
          if (routeData) setRoute(routeData);

          const { data: stopsData } = await supabase
            .from('route_stops')
            .select('*')
            .eq('route_id', busData.route_id)
            .order('sequence', { ascending: true });
          
          if (stopsData) {
            setStops(stopsData.map(s => ({ ...s, status: 'pending' as TripStopStatus })));
          }

          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('bus_route_id', busData.route_id);
          setTotalStudents(count || 0);

          const { data: tripData } = await supabase
            .from('active_trips')
            .select('*')
            .eq('bus_id', busData.id)
            .eq('is_active', true)
            .single();
          
          if (tripData && stopsData) {
            setActiveTrip(tripData);
            
            const { data: eventData } = await supabase
              .from('trip_stop_events')
              .select('*')
              .eq('trip_id', tripData.id);

            const existingEvents = eventData || [];
            const missingStopEvents = stopsData.filter(
              stop => !existingEvents.find(e => e.route_stop_id === stop.id)
            );

            if (missingStopEvents.length > 0) {
              const newEvents = missingStopEvents.map(stop => ({
                trip_id: tripData.id,
                route_stop_id: stop.id,
                status: 'pending',
              }));
              await supabase.from('trip_stop_events').insert(newEvents);
              
              const { data: allEvents } = await supabase
                .from('trip_stop_events')
                .select('*')
                .eq('trip_id', tripData.id);
              
              if (allEvents) {
                setStops(stopsData.map(stop => {
                  const event = allEvents.find(e => e.route_stop_id === stop.id);
                  return {
                    ...stop,
                    status: (event?.status || 'pending') as TripStopStatus,
                    event_id: event?.id,
                  };
                }));
              }
            } else {
              setStops(stopsData.map(stop => {
                const event = existingEvents.find(e => e.route_stop_id === stop.id);
                return {
                  ...stop,
                  status: (event?.status || 'pending') as TripStopStatus,
                  event_id: event?.id,
                };
              }));
            }
          }
        }
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: scans } = await supabase
        .from('scan_logs')
        .select('scan_status')
        .eq('driver_id', driver.id)
        .gte('scan_timestamp', today.toISOString());

      if (scans) {
        setTodayStats({
          total: scans.length,
          success: scans.filter((s) => s.scan_status === 'success').length,
          failed: scans.filter((s) => s.scan_status !== 'success').length,
        });
      }

      setLoading(false);
    };

    fetchData();
  }, [driver]);

  const autoUpdateStopStatus = useCallback(async (stop: StopWithStatus, newStatus: TripStopStatus, tripId: string) => {
    if (!stop.event_id) return;
    
    const now = Date.now();
    if (lastAutoUpdateRef.current && 
        lastAutoUpdateRef.current.stopId === stop.id && 
        lastAutoUpdateRef.current.status === newStatus &&
        now - lastAutoUpdateRef.current.time < 30000) {
      return;
    }

    lastAutoUpdateRef.current = { stopId: stop.id, status: newStatus, time: now };

    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      
      if (newStatus === 'arrived') {
        updateData.arrived_at = new Date().toISOString();
      } else if (newStatus === 'departed') {
        updateData.departed_at = new Date().toISOString();
      }

      await supabase
        .from('trip_stop_events')
        .update(updateData)
        .eq('id', stop.event_id);

      await supabase
        .from('active_trips')
        .update({ current_stop_sequence: stop.sequence })
        .eq('id', tripId);

      setStops(prevStops => prevStops.map(s => {
        if (s.id === stop.id) {
          return { ...s, status: newStatus };
        }
        return s;
      }));

      toast({
        title: newStatus === 'arrived' ? `Arrived: ${stop.stop_name}` : `Left: ${stop.stop_name}`,
        description: 'Auto-detected by GPS',
      });
    } catch (err) {
      console.error('Failed to auto-update stop:', err);
    }
  }, [toast]);

  const simulateAtStop = useCallback(async (stop: StopWithStatus) => {
    if (!activeTrip || !stop.latitude || !stop.longitude) return;
    
    setSimulatingStop(stop.id);
    
    const simulatedLat = stop.latitude;
    const simulatedLng = stop.longitude;
    setCurrentLocation({ lat: simulatedLat, lng: simulatedLng });

    for (const s of stops) {
      if (!s.latitude || !s.longitude) continue;

      const distance = calculateDistance(simulatedLat, simulatedLng, s.latitude, s.longitude);

      if (s.status === 'pending') {
        const stopIndex = stops.findIndex(st => st.id === s.id);
        const prevStop = stopIndex > 0 ? stops[stopIndex - 1] : null;
        const canArrive = !prevStop || prevStop.status === 'departed';
        
        if (canArrive && distance <= ARRIVAL_RADIUS_METERS) {
          await autoUpdateStopStatus(s, 'arrived', activeTrip.id);
          break;
        }
      } else if (s.status === 'arrived' && s.id !== stop.id) {
        await autoUpdateStopStatus(s, 'departed', activeTrip.id);
      }
    }

    setTimeout(() => setSimulatingStop(null), 1000);
    
    toast({
      title: 'GPS Simulated',
      description: `Location set to: ${stop.stop_name}`,
    });
  }, [activeTrip, stops, autoUpdateStopStatus, toast]);

  const simulateDeparture = useCallback(async (stop: StopWithStatus) => {
    if (!activeTrip || !stop.latitude || !stop.longitude) return;
    
    setSimulatingStop(stop.id);
    
    const simulatedLat = stop.latitude + 0.001;
    const simulatedLng = stop.longitude + 0.001;
    setCurrentLocation({ lat: simulatedLat, lng: simulatedLng });

    if (stop.status === 'arrived') {
      await autoUpdateStopStatus(stop, 'departed', activeTrip.id);
    }

    setTimeout(() => setSimulatingStop(null), 1000);
    
    toast({
      title: 'Departure Simulated',
      description: `Simulated leaving: ${stop.stop_name}`,
    });
  }, [activeTrip, autoUpdateStopStatus, toast]);

  useEffect(() => {
    if (testMode) {
      setGpsEnabled(true);
      setGpsError(null);
      return;
    }

    if (!activeTrip || stops.length === 0) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setGpsEnabled(false);
      setCurrentLocation(null);
      return;
    }

    const stopsWithCoords = stops.filter(s => s.latitude && s.longitude);
    if (stopsWithCoords.length === 0) {
      setGpsError('No stop coordinates configured');
      setGpsEnabled(false);
      return;
    }

    if (!navigator.geolocation) {
      setGpsError('GPS not supported');
      setGpsEnabled(false);
      return;
    }

    setGpsEnabled(true);
    setGpsError(null);

    const handlePosition = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      setCurrentLocation({ lat: latitude, lng: longitude });

      for (const stop of stops) {
        if (!stop.latitude || !stop.longitude) continue;

        const distance = calculateDistance(latitude, longitude, stop.latitude, stop.longitude);

        if (stop.status === 'pending') {
          const stopIndex = stops.findIndex(s => s.id === stop.id);
          const prevStop = stopIndex > 0 ? stops[stopIndex - 1] : null;
          const canArrive = !prevStop || prevStop.status === 'departed';
          
          if (canArrive && distance <= ARRIVAL_RADIUS_METERS) {
            autoUpdateStopStatus(stop, 'arrived', activeTrip.id);
            break;
          }
        } else if (stop.status === 'arrived') {
          const stopIndex = stops.findIndex(s => s.id === stop.id);
          const nextStop = stopIndex < stops.length - 1 ? stops[stopIndex + 1] : null;
          
          let departureThreshold = DEPARTURE_RADIUS_METERS;
          if (nextStop && nextStop.latitude && nextStop.longitude) {
            const distToNextStop = calculateDistance(
              stop.latitude!, stop.longitude!, 
              nextStop.latitude, nextStop.longitude
            );
            departureThreshold = Math.min(DEPARTURE_RADIUS_METERS, distToNextStop * 0.4);
          }
          
          if (distance > departureThreshold) {
            autoUpdateStopStatus(stop, 'departed', activeTrip.id);
            break;
          }
        }
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('GPS error:', error.message);
      setGpsError(error.message);
      setGpsEnabled(false);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [activeTrip, stops, autoUpdateStopStatus]);

  const startTrip = async () => {
    if (!driver || !bus || !route) return;

    try {
      const { data: tripData, error } = await supabase
        .from('active_trips')
        .insert({
          bus_id: bus.id,
          driver_id: driver.id,
          route_id: route.id,
          is_active: true,
          current_stop_sequence: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setActiveTrip(tripData);

      const stopEvents = stops.map(stop => ({
        trip_id: tripData.id,
        route_stop_id: stop.id,
        status: 'pending',
      }));

      await supabase.from('trip_stop_events').insert(stopEvents);

      const { data: eventData } = await supabase
        .from('trip_stop_events')
        .select('*')
        .eq('trip_id', tripData.id);

      if (eventData) {
        setStops(prevStops => prevStops.map(stop => {
          const event = eventData.find(e => e.route_stop_id === stop.id);
          return {
            ...stop,
            status: 'pending' as TripStopStatus,
            event_id: event?.id,
          };
        }));
      }

      toast({
        title: 'Trip started',
        description: 'Students can now track your bus location.',
      });
    } catch (err) {
      console.error('Failed to start trip:', err);
      toast({
        title: 'Failed to start trip',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const endTrip = async () => {
    if (!activeTrip) return;

    try {
      await supabase
        .from('active_trips')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('id', activeTrip.id);

      setActiveTrip(null);
      setStops(prevStops => prevStops.map(stop => ({
        ...stop,
        status: 'pending' as TripStopStatus,
        event_id: undefined,
      })));

      toast({
        title: 'Trip ended',
        description: 'Bus tracking stopped.',
      });
    } catch (err) {
      console.error('Failed to end trip:', err);
      toast({
        title: 'Failed to end trip',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const updateStopStatus = async (stop: StopWithStatus, newStatus: TripStopStatus) => {
    if (!activeTrip || !stop.event_id) return;
    
    setUpdatingStop(stop.id);

    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      
      if (newStatus === 'arrived') {
        updateData.arrived_at = new Date().toISOString();
      } else if (newStatus === 'departed') {
        updateData.departed_at = new Date().toISOString();
      }

      await supabase
        .from('trip_stop_events')
        .update(updateData)
        .eq('id', stop.event_id);

      await supabase
        .from('active_trips')
        .update({ current_stop_sequence: stop.sequence })
        .eq('id', activeTrip.id);

      setStops(prevStops => prevStops.map(s => {
        if (s.id === stop.id) {
          return { ...s, status: newStatus };
        }
        return s;
      }));

      toast({
        title: newStatus === 'arrived' ? 'Arrived at stop' : 'Departed from stop',
        description: stop.stop_name,
      });
    } catch (err) {
      console.error('Failed to update stop:', err);
      toast({
        title: 'Failed to update',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStop(null);
    }
  };

  const startScanner = async () => {
    setScannerOpen(true);
    setScanResult(null);
    setScanning(true);

    setTimeout(async () => {
      try {
        scannerRef.current = new Html5Qrcode('qr-reader');
        await scannerRef.current.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          onScanSuccess,
          () => {}
        );
      } catch (err) {
        console.error('Failed to start scanner:', err);
        toast({
          title: 'Camera error',
          description: 'Failed to access camera. Please check permissions.',
          variant: 'destructive',
        });
        setScannerOpen(false);
        setScanning(false);
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const closeScanner = async () => {
    await stopScanner();
    setScannerOpen(false);
    setScanResult(null);
  };

  const onScanSuccess = async (decodedText: string) => {
    await stopScanner();

    const studentId = decodedText.trim();
    
    if (!driver || !bus || !route) {
      setScanResult({
        status: 'not_found',
        message: 'Driver or bus configuration error.',
      });
      return;
    }

    try {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();

      if (studentError || !student) {
        setScanResult({
          status: 'not_found',
          message: 'Student not found in the system.',
        });
        return;
      }

      if (student.is_blocked) {
        await supabase.from('scan_logs').insert({
          student_id: student.id,
          driver_id: driver.id,
          bus_id: bus.id,
          scan_status: 'blocked',
          fare_deducted: 0,
          balance_after_scan: student.wallet_balance,
        });

        setScanResult({
          status: 'blocked',
          student,
          message: 'This student pass is blocked. Contact administrator.',
        });
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: scanCount } = await supabase
        .from('scan_logs')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', student.id)
        .eq('scan_status', 'success')
        .gte('scan_timestamp', today.toISOString());

      const todayScans = scanCount || 0;

      if (todayScans >= 2) {
        await supabase.from('scan_logs').insert({
          student_id: student.id,
          driver_id: driver.id,
          bus_id: bus.id,
          scan_status: 'limit_exceeded',
          fare_deducted: 0,
          balance_after_scan: student.wallet_balance,
        });

        setScanResult({
          status: 'limit_exceeded',
          student,
          message: 'Daily scan limit (2) exceeded.',
        });
        return;
      }

      const dailyFare = route.daily_fare;

      if (todayScans === 0) {
        if (student.wallet_balance < dailyFare) {
          await supabase.from('scan_logs').insert({
            student_id: student.id,
            driver_id: driver.id,
            bus_id: bus.id,
            scan_status: 'insufficient_balance',
            fare_deducted: 0,
            balance_after_scan: student.wallet_balance,
          });

          setScanResult({
            status: 'insufficient_balance',
            student,
            message: `Insufficient balance. Need ₹${dailyFare}, have ₹${student.wallet_balance.toFixed(2)}`,
          });
          return;
        }

        const newBalance = student.wallet_balance - dailyFare;

        await supabase
          .from('students')
          .update({ wallet_balance: newBalance })
          .eq('id', student.id);

        await supabase.from('transactions').insert({
          student_id: student.id,
          amount: dailyFare,
          transaction_type: 'deduction',
          currency: 'INR',
          status: 'success',
          balance_before: student.wallet_balance,
          balance_after: newBalance,
          description: `Daily fare deduction - ${route.route_name}`,
        });

        await supabase.from('scan_logs').insert({
          student_id: student.id,
          driver_id: driver.id,
          bus_id: bus.id,
          scan_status: 'success',
          fare_deducted: dailyFare,
          balance_after_scan: newBalance,
        });

        if (newBalance < dailyFare * 3) {
          await supabase.from('notifications').insert({
            user_id: student.user_id,
            title: 'Low Balance Warning',
            message: `Your wallet balance is ₹${newBalance.toFixed(2)}. Please recharge soon.`,
            type: 'low_balance',
            is_read: false,
          });
        }

        setScanResult({
          status: 'success',
          student,
          message: 'First scan - Fare deducted successfully',
          fareDeducted: dailyFare,
          balanceAfter: newBalance,
        });
      } else {
        await supabase.from('scan_logs').insert({
          student_id: student.id,
          driver_id: driver.id,
          bus_id: bus.id,
          scan_status: 'success',
          fare_deducted: 0,
          balance_after_scan: student.wallet_balance,
        });

        setScanResult({
          status: 'success',
          student,
          message: 'Second scan - Return trip (no charge)',
          fareDeducted: 0,
          balanceAfter: student.wallet_balance,
        });
      }

      const { data: scans } = await supabase
        .from('scan_logs')
        .select('scan_status')
        .eq('driver_id', driver.id)
        .gte('scan_timestamp', today.toISOString());

      if (scans) {
        setTodayStats({
          total: scans.length,
          success: scans.filter((s) => s.scan_status === 'success').length,
          failed: scans.filter((s) => s.scan_status !== 'success').length,
        });
      }
    } catch (err) {
      console.error('Scan processing error:', err);
      setScanResult({
        status: 'not_found',
        message: 'Error processing scan. Please try again.',
      });
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32" />
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
      <div className="space-y-4 md:space-y-6 pb-4">
        <div 
          className={`relative overflow-hidden rounded-2xl p-4 md:p-6 ${
            activeTrip 
              ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700' 
              : 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900'
          }`}
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          
          <div className="relative flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`h-2.5 w-2.5 rounded-full ${activeTrip ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                  <span className="text-sm font-medium opacity-90">
                    {activeTrip ? 'Trip in Progress' : 'Ready to Start'}
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold">{bus?.bus_number || 'No Bus Assigned'}</h1>
                <p className="text-white/70 text-sm mt-0.5">
                  {route ? `${route.route_number} • ${route.route_name}` : 'No route assigned'}
                </p>
              </div>

              <Button
                size="lg"
                onClick={activeTrip ? endTrip : startTrip}
                data-testid="button-toggle-trip"
                className={`shrink-0 h-11 px-6 font-semibold shadow-lg ${
                  activeTrip 
                    ? 'bg-white text-red-600 hover:bg-red-50' 
                    : 'bg-white text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                {activeTrip ? (
                  <><Square className="h-4 w-4 mr-2" />End Trip</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" />Start Trip</>
                )}
              </Button>
            </div>

            <button 
              onClick={startScanner}
              data-testid="button-scan-qr"
              className="w-full flex items-center gap-4 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl cursor-pointer transition-all active:scale-[0.98] border border-white/20 text-left"
            >
              <div className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-white shadow-lg flex-shrink-0">
                <QrCode className="h-7 w-7 md:h-8 md:w-8 text-slate-800" />
              </div>
              <div className="flex-1 text-white min-w-0">
                <p className="font-bold text-lg">Scan Student Pass</p>
                <p className="text-white/70 text-sm">Tap here to scan QR code</p>
              </div>
              <div className="hidden sm:flex items-center justify-center h-10 w-10 rounded-full bg-white/20 flex-shrink-0">
                <ArrowRight className="h-5 w-5 text-white" />
              </div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{totalStudents}</p>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Students on route</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <QrCode className="h-5 w-5 text-violet-500" />
            </div>
            <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{todayStats.total}</p>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Scans today</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-2xl md:text-3xl font-bold text-emerald-600">{todayStats.success}</p>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Successful</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-2xl md:text-3xl font-bold text-red-600">{todayStats.failed}</p>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Failed</p>
          </div>
        </div>

        {activeTrip && stops.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900 dark:text-white">Route Stops</h2>
                    <p className="text-xs text-slate-500">
                      {stops.filter(s => s.status === 'departed').length} of {stops.length} completed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setTestMode(!testMode)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      testMode 
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <Navigation className="h-3 w-3" />
                    {testMode ? 'Test ON' : 'Test Mode'}
                  </button>
                  {gpsEnabled && !testMode && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                      <Wifi className="h-3 w-3 animate-pulse" />
                      GPS Active
                    </span>
                  )}
                  {gpsError && !testMode && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      GPS Error
                    </span>
                  )}
                </div>
              </div>
              {testMode && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                  Test Mode: Click buttons to simulate GPS arrival/departure
                  {currentLocation && (
                    <span className="block text-xs mt-1 opacity-75">
                      Current: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="p-4 space-y-2">
              {stops.map((stop, index) => {
                const isCurrentStop = stop.status === 'arrived';
                const isCompleted = stop.status === 'departed';
                const isPending = stop.status === 'pending';
                const prevStop = index > 0 ? stops[index - 1] : null;
                const canArrive = isPending && (!prevStop || prevStop.status === 'departed');
                const canDepart = isCurrentStop;
                const stopHasCoords = stop.latitude && stop.longitude;
                const showManualButtons = !gpsEnabled || !stopHasCoords;

                return (
                  <div
                    key={stop.id}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isCurrentStop 
                        ? 'bg-blue-50 dark:bg-blue-950/40 ring-2 ring-blue-500' 
                        : isCompleted 
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20' 
                          : 'bg-slate-50 dark:bg-slate-800/50'
                    }`}
                  >
                    <div className="relative flex flex-col items-center">
                      <div className={`flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full text-sm font-semibold ${
                        isCompleted 
                          ? 'bg-emerald-500 text-white' 
                          : isCurrentStop 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : isCurrentStop ? (
                          <BusIcon className="h-5 w-5" />
                        ) : (
                          stop.sequence
                        )}
                      </div>
                      {index < stops.length - 1 && (
                        <div className={`absolute top-full w-0.5 h-4 ${
                          isCompleted ? 'bg-emerald-300' : 'bg-slate-200 dark:bg-slate-700'
                        }`} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm md:text-base truncate ${
                        isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 
                        isCurrentStop ? 'text-blue-700 dark:text-blue-400' : 
                        'text-slate-700 dark:text-slate-200'
                      }`}>{stop.stop_name}</p>
                      {isCurrentStop && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                          Bus is here
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1.5 flex-shrink-0">
                      {testMode && stopHasCoords && isPending && canArrive && (
                        <button
                          onClick={() => simulateAtStop(stop)}
                          disabled={simulatingStop === stop.id}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50 transition-colors"
                        >
                          {simulatingStop === stop.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Arrive'}
                        </button>
                      )}
                      {testMode && stopHasCoords && isCurrentStop && (
                        <button
                          onClick={() => simulateDeparture(stop)}
                          disabled={simulatingStop === stop.id}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50 transition-colors"
                        >
                          {simulatingStop === stop.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Depart'}
                        </button>
                      )}
                      {!testMode && showManualButtons && isPending && canArrive && (
                        <button
                          onClick={() => updateStopStatus(stop, 'arrived')}
                          disabled={updatingStop === stop.id}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
                        >
                          {updatingStop === stop.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Arrived'}
                        </button>
                      )}
                      {!testMode && showManualButtons && canDepart && (
                        <button
                          onClick={() => updateStopStatus(stop, 'departed')}
                          disabled={updatingStop === stop.id}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50 transition-colors dark:bg-slate-700 dark:text-slate-200"
                        >
                          {updatingStop === stop.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Left'}
                        </button>
                      )}
                      {isCompleted && (
                        <span className="px-2 py-1 text-xs font-medium rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                          Done
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {route && !activeTrip && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950">
                <Route className="h-5 w-5 text-violet-600" />
              </div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Route Details</h2>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{route.route_number}</p>
                <p className="text-xs text-slate-500">Route</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{stops.length}</p>
                <p className="text-xs text-slate-500">Stops</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-600">₹{route.daily_fare}</p>
                <p className="text-xs text-slate-500">Fare</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={scannerOpen} onOpenChange={(open) => !open && closeScanner()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Scan QR Code
              <Button variant="ghost" size="icon" onClick={closeScanner}>
                <X className="h-5 w-5" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {scanning && !scanResult && (
            <div className="space-y-4">
              <div id="qr-reader" className="w-full rounded-lg overflow-hidden" />
              <p className="text-sm text-muted-foreground text-center">
                Point camera at student's QR code
              </p>
            </div>
          )}

          {scanResult && (
            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-full ${
                    scanResult.status === 'success' ? 'bg-chart-2/10' : 'bg-destructive/10'
                  }`}
                >
                  {scanResult.status === 'success' ? (
                    <CheckCircle2 className="h-10 w-10 text-chart-2" />
                  ) : (
                    <XCircle className="h-10 w-10 text-destructive" />
                  )}
                </div>
              </div>

              {scanResult.student && (
                <div className="flex flex-col items-center gap-3">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={scanResult.student.photo_url || undefined} />
                    <AvatarFallback className="text-lg">
                      {scanResult.student.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <p className="font-semibold text-lg">{scanResult.student.full_name}</p>
                    <p className="text-sm text-muted-foreground">{scanResult.student.enrollment_no}</p>
                    <p className="text-sm text-muted-foreground">{scanResult.student.course}</p>
                  </div>
                </div>
              )}

              <div
                className={`p-4 rounded-lg text-center ${
                  scanResult.status === 'success' ? 'bg-chart-2/10' : 'bg-destructive/10'
                }`}
              >
                <p
                  className={`font-medium ${
                    scanResult.status === 'success' ? 'text-chart-2' : 'text-destructive'
                  }`}
                >
                  {scanResult.message}
                </p>
                {scanResult.fareDeducted !== undefined && (
                  <div className="mt-2 text-sm">
                    <p>Fare: ₹{scanResult.fareDeducted}</p>
                    <p>Balance: ₹{scanResult.balanceAfter?.toFixed(2)}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={closeScanner} className="flex-1">
                  Close
                </Button>
                <Button onClick={startScanner} className="flex-1">
                  <QrCode className="h-4 w-4 mr-2" />
                  Scan Again
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarLayout>
  );
}
