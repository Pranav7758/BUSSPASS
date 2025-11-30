import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import type { BusRoute, Bus, RouteStop, ActiveTrip, TripStopStatus } from '@shared/schema';
import {
  Bus as BusIcon,
  Clock,
  AlertCircle,
  MapPin,
  CheckCircle2,
  Circle,
  Navigation,
  Train,
  ArrowRight,
  Zap,
  Timer,
} from 'lucide-react';

interface StopWithStatus extends RouteStop {
  status: TripStopStatus;
  arrived_at: string | null;
  departed_at: string | null;
}

export default function StudentTrackBus() {
  const { student } = useAuth();
  
  const [route, setRoute] = useState<BusRoute | null>(null);
  const [bus, setBus] = useState<Bus | null>(null);
  const [stops, setStops] = useState<StopWithStatus[]>([]);
  const [baseStops, setBaseStops] = useState<RouteStop[]>([]);
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [loading, setLoading] = useState(true);

  const updateStopsWithEvents = useCallback(async (tripId: string, stopsData: RouteStop[]) => {
    try {
      const { data: eventData, error } = await supabase
        .from('trip_stop_events')
        .select('*')
        .eq('trip_id', tripId);

      if (error) {
        console.error('Error fetching trip stop events:', error.message);
        return;
      }

      const updatedStops: StopWithStatus[] = stopsData.map(stop => {
        const event = eventData?.find(e => e.route_stop_id === stop.id);
        if (event) {
          return {
            ...stop,
            status: event.status as TripStopStatus,
            arrived_at: event.arrived_at,
            departed_at: event.departed_at,
          };
        }
        return {
          ...stop,
          status: 'pending' as TripStopStatus,
          arrived_at: null,
          departed_at: null,
        };
      });

      setStops(updatedStops);
    } catch (err) {
      console.error('Error updating stops with events:', err);
    }
  }, []);

  const resetStopsToPending = useCallback((stopsData: RouteStop[]) => {
    setStops(stopsData.map(stop => ({
      ...stop,
      status: 'pending' as TripStopStatus,
      arrived_at: null,
      departed_at: null,
    })));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!student?.bus_route_id) {
        setLoading(false);
        return;
      }

      try {
        const { data: routeData, error: routeError } = await supabase
          .from('bus_routes')
          .select('*')
          .eq('id', student.bus_route_id)
          .single();
        
        if (routeError) {
          console.error('Error fetching route:', routeError.message);
        } else if (routeData) {
          setRoute(routeData);
        }

        const { data: busData, error: busError } = await supabase
          .from('buses')
          .select('*')
          .eq('route_id', student.bus_route_id)
          .eq('is_active', true)
          .single();
        
        if (busError && busError.code !== 'PGRST116') {
          console.error('Error fetching bus:', busError.message);
        } else if (busData) {
          setBus(busData);
        }

        const { data: stopsData, error: stopsError } = await supabase
          .from('route_stops')
          .select('*')
          .eq('route_id', student.bus_route_id)
          .order('sequence', { ascending: true });
        
        if (stopsError) {
          console.error('Error fetching stops:', stopsError.message);
        } else if (stopsData && stopsData.length > 0) {
          setBaseStops(stopsData);
          const stopsWithStatus: StopWithStatus[] = stopsData.map(stop => ({
            ...stop,
            status: 'pending' as TripStopStatus,
            arrived_at: null,
            departed_at: null,
          }));
          setStops(stopsWithStatus);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [student]);

  useEffect(() => {
    if (!bus || !route || baseStops.length === 0) return;

    const fetchActiveTrip = async () => {
      try {
        const { data: tripData, error } = await supabase
          .from('active_trips')
          .select('*')
          .eq('bus_id', bus.id)
          .eq('is_active', true)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching active trip:', error.message);
        }

        if (tripData) {
          setActiveTrip(tripData);
          await updateStopsWithEvents(tripData.id, baseStops);
        } else {
          setActiveTrip(null);
          resetStopsToPending(baseStops);
        }
      } catch (err) {
        console.error('Error fetching active trip:', err);
      }
    };

    fetchActiveTrip();

    const tripChannel = supabase
      .channel(`active-trip-${bus.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_trips',
          filter: `bus_id=eq.${bus.id}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const trip = payload.new as ActiveTrip;
            if (trip.is_active) {
              setActiveTrip(trip);
              await updateStopsWithEvents(trip.id, baseStops);
            } else {
              setActiveTrip(null);
              resetStopsToPending(baseStops);
            }
          }
          if (payload.eventType === 'DELETE') {
            setActiveTrip(null);
            resetStopsToPending(baseStops);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tripChannel);
    };
  }, [bus, route, baseStops, updateStopsWithEvents, resetStopsToPending]);

  useEffect(() => {
    if (!activeTrip || baseStops.length === 0) return;

    updateStopsWithEvents(activeTrip.id, baseStops);

    const channel = supabase
      .channel(`trip-stops-${activeTrip.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_stop_events',
          filter: `trip_id=eq.${activeTrip.id}`,
        },
        async () => {
          await updateStopsWithEvents(activeTrip.id, baseStops);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTrip, baseStops, updateStopsWithEvents]);

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCurrentStopName = () => {
    const currentStop = stops.find(stop => stop.status === 'arrived');
    if (currentStop) return currentStop.stop_name;
    
    const lastDeparted = [...stops].reverse().find(stop => stop.status === 'departed');
    if (lastDeparted) {
      const nextStopIndex = stops.findIndex(s => s.id === lastDeparted.id) + 1;
      if (nextStopIndex < stops.length) {
        return `En route to ${stops[nextStopIndex].stop_name}`;
      }
    }
    
    return stops.length > 0 ? `Starting from ${stops[0].stop_name}` : 'No stops defined';
  };

  const getProgress = () => {
    if (stops.length === 0) return 0;
    const completedStops = stops.filter(s => s.status === 'departed').length;
    const arrivedStop = stops.find(s => s.status === 'arrived') ? 0.5 : 0;
    return ((completedStops + arrivedStop) / stops.length) * 100;
  };

  const getNextStop = () => {
    const arrivedStop = stops.find(s => s.status === 'arrived');
    if (arrivedStop) return arrivedStop;
    
    const lastDepartedIndex = stops.map(s => s.status).lastIndexOf('departed');
    if (lastDepartedIndex >= 0 && lastDepartedIndex < stops.length - 1) {
      return stops[lastDepartedIndex + 1];
    }
    
    return stops.length > 0 ? stops[0] : null;
  };

  const getCompletedCount = () => stops.filter(s => s.status === 'departed').length;
  const getRemainingCount = () => stops.filter(s => s.status === 'pending').length;

  if (loading) {
    return (
      <SidebarLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32" />
          <Skeleton className="h-[400px]" />
        </div>
      </SidebarLayout>
    );
  }

  if (!student?.bus_route_id || !route) {
    return (
      <SidebarLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Track Bus</h1>
            <p className="text-muted-foreground mt-1">Real-time bus location</p>
          </div>
          
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Route Assigned</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">
                You haven't been assigned to a bus route yet. Please update your profile to select a route.
              </p>
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Track Bus</h1>
          <p className="text-muted-foreground mt-1">Real-time bus location tracking</p>
        </div>

        <Card className={activeTrip ? 'border-green-500/50 bg-green-500/5' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className={`relative flex h-16 w-16 items-center justify-center rounded-full ${
                activeTrip ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'
              }`}>
                <BusIcon className={`h-8 w-8 ${
                  activeTrip ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                }`} />
                {activeTrip && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xl">{bus?.bus_number || 'No bus'}</span>
                  <Badge variant={activeTrip ? 'default' : 'secondary'} className={activeTrip ? 'bg-green-600' : ''}>
                    {activeTrip ? 'Live Tracking' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {route.route_number} - {route.route_name}
                </p>
                {activeTrip && (
                  <div className="flex items-center gap-1 mt-2">
                    <Zap className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {getCurrentStopName()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {activeTrip && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-2xl font-bold">{getCompletedCount()}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Completed</p>
              </CardContent>
            </Card>
            <Card className="border-primary">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Navigation className="h-5 w-5 animate-pulse" />
                  <span className="text-2xl font-bold">
                    {stops.find(s => s.status === 'arrived') ? 1 : 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Current</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Timer className="h-5 w-5" />
                  <span className="text-2xl font-bold">{getRemainingCount()}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Remaining</p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTrip && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 to-transparent">
              <CardTitle className="text-lg flex items-center gap-2">
                <Train className="h-5 w-5 text-primary" />
                Trip Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {stops.length > 0 ? stops[0].stop_name : 'Start'}
                  </span>
                  <span className="font-medium">{Math.round(getProgress())}%</span>
                  <span className="text-muted-foreground">
                    {stops.length > 0 ? stops[stops.length - 1].stop_name : 'End'}
                  </span>
                </div>
                <Progress value={getProgress()} className="h-3" />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Route Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stops.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No stops defined for this route yet.</p>
                <p className="text-sm mt-1">Contact admin to add stops.</p>
              </div>
            ) : (
              <div className="relative">
                {stops.map((stop, index) => {
                  const isLast = index === stops.length - 1;
                  const isFirst = index === 0;
                  const isArrived = stop.status === 'arrived';
                  const isDeparted = stop.status === 'departed';
                  const isPending = stop.status === 'pending';
                  const isNextStop = !isArrived && !isDeparted && 
                    (index === 0 || stops[index - 1]?.status === 'departed');
                  
                  return (
                    <div key={stop.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`relative flex h-12 w-12 items-center justify-center rounded-full border-3 transition-all shadow-sm ${
                          isDeparted 
                            ? 'bg-green-500 border-green-500 text-white' 
                            : isArrived 
                              ? 'bg-blue-500 border-blue-500 text-white animate-pulse shadow-blue-300 shadow-lg' 
                              : isNextStop && activeTrip
                                ? 'bg-yellow-100 border-yellow-400 text-yellow-600 dark:bg-yellow-900/30'
                                : 'bg-background border-muted-foreground/30 text-muted-foreground'
                        }`}>
                          {isDeparted ? (
                            <CheckCircle2 className="h-6 w-6" />
                          ) : isArrived ? (
                            <BusIcon className="h-6 w-6" />
                          ) : isFirst ? (
                            <span className="text-sm font-bold">1</span>
                          ) : isLast ? (
                            <MapPin className="h-5 w-5" />
                          ) : (
                            <span className="text-sm font-bold">{stop.sequence}</span>
                          )}
                          
                          {isArrived && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
                            </span>
                          )}
                        </div>
                        {!isLast && (
                          <div className={`w-1 h-16 rounded-full ${
                            isDeparted ? 'bg-green-500' : 'bg-muted-foreground/20'
                          }`} />
                        )}
                      </div>

                      <div className={`flex-1 pb-6 ${isLast ? '' : ''}`}>
                        <div className={`p-3 rounded-lg transition-all ${
                          isArrived 
                            ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800' 
                            : isDeparted 
                              ? 'bg-green-50/50 dark:bg-green-950/20'
                              : isNextStop && activeTrip
                                ? 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800'
                                : ''
                        }`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className={`font-semibold text-base ${
                                isArrived ? 'text-blue-600 dark:text-blue-400' : 
                                isDeparted ? 'text-green-600 dark:text-green-400' : ''
                              }`}>
                                {stop.stop_name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  Stop {stop.sequence} of {stops.length}
                                </span>
                                {isFirst && <Badge variant="outline" className="text-xs py-0 h-5">Start</Badge>}
                                {isLast && <Badge variant="outline" className="text-xs py-0 h-5">Destination</Badge>}
                              </div>
                            </div>
                            
                            <div className="text-right">
                              {isArrived && (
                                <Badge className="bg-blue-500 hover:bg-blue-600 animate-pulse">
                                  Bus Here Now
                                </Badge>
                              )}
                              {isDeparted && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  Departed
                                </Badge>
                              )}
                              {isNextStop && activeTrip && !isArrived && !isDeparted && (
                                <Badge variant="outline" className="text-yellow-600 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30">
                                  Next Stop
                                </Badge>
                              )}
                              {isPending && !isNextStop && !activeTrip && (
                                <Badge variant="outline" className="text-muted-foreground">
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </div>

                          {(stop.arrived_at || stop.departed_at) && (
                            <div className="mt-3 flex items-center gap-4 text-xs">
                              {stop.arrived_at && (
                                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                                  <Clock className="h-3 w-3" />
                                  <span>Arrived: {formatTime(stop.arrived_at)}</span>
                                </div>
                              )}
                              {stop.departed_at && (
                                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                                  <ArrowRight className="h-3 w-3" />
                                  <span>Departed: {formatTime(stop.departed_at)}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {!activeTrip && (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="font-medium">Waiting for Trip to Start</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    The driver will start the trip when the bus begins its route. 
                    You'll see live updates here once the trip is active.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarLayout>
  );
}
