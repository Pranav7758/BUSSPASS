import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { BusRoute, RouteStop } from '@shared/schema';
import { 
  Plus, 
  MapPin, 
  Edit, 
  Trash2, 
  ArrowLeft, 
  GripVertical,
  ArrowUp,
  ArrowDown,
  Train,
  Navigation,
  Clock
} from 'lucide-react';

export default function AdminRouteStops() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStop, setEditingStop] = useState<RouteStop | null>(null);
  
  const [formData, setFormData] = useState({
    stop_name: '',
    latitude: '',
    longitude: '',
  });

  const fetchRoutes = async () => {
    try {
      const { data: routesData, error } = await supabase
        .from('bus_routes')
        .select('*')
        .order('route_number');

      if (error) {
        console.error('Error fetching routes:', error.message);
        toast({ title: 'Error', description: 'Failed to load routes', variant: 'destructive' });
        return;
      }

      if (routesData) {
        setRoutes(routesData);
      }
    } catch (err) {
      console.error('Error fetching routes:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStops = async (routeId: string) => {
    setStopsLoading(true);
    try {
      const { data: stopsData, error } = await supabase
        .from('route_stops')
        .select('*')
        .eq('route_id', routeId)
        .order('sequence', { ascending: true });

      if (error) {
        console.error('Error fetching stops:', error.message);
        toast({ title: 'Error', description: 'Failed to load stops', variant: 'destructive' });
        return;
      }

      if (stopsData) {
        setStops(stopsData);
      }
    } catch (err) {
      console.error('Error fetching stops:', err);
    } finally {
      setStopsLoading(false);
    }
  };

  const isValidLatLng = (value: string): boolean => {
    if (!value || value.trim() === '') return true;
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    if (selectedRoute) {
      fetchStops(selectedRoute.id);
    }
  }, [selectedRoute]);

  const handleSubmit = async () => {
    if (!formData.stop_name || !selectedRoute) {
      toast({ title: 'Error', description: 'Stop name is required', variant: 'destructive' });
      return;
    }

    if (!isValidLatLng(formData.latitude) || !isValidLatLng(formData.longitude)) {
      toast({ title: 'Error', description: 'Invalid latitude or longitude value', variant: 'destructive' });
      return;
    }

    const latitude = formData.latitude && formData.latitude.trim() !== '' 
      ? parseFloat(formData.latitude) 
      : null;
    const longitude = formData.longitude && formData.longitude.trim() !== '' 
      ? parseFloat(formData.longitude) 
      : null;

    try {
      if (editingStop) {
        const { error } = await supabase
          .from('route_stops')
          .update({
            stop_name: formData.stop_name,
            latitude,
            longitude,
          })
          .eq('id', editingStop.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Stop updated successfully' });
      } else {
        const nextSequence = stops.length > 0 ? Math.max(...stops.map(s => s.sequence)) + 1 : 1;
        
        const { error } = await supabase.from('route_stops').insert({
          route_id: selectedRoute.id,
          stop_name: formData.stop_name,
          sequence: nextSequence,
          latitude,
          longitude,
        });

        if (error) throw error;
        toast({ title: 'Success', description: 'Stop added successfully' });
      }

      setDialogOpen(false);
      resetForm();
      fetchStops(selectedRoute.id);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stop?')) return;

    try {
      const { error } = await supabase.from('route_stops').delete().eq('id', id);
      if (error) throw error;
      
      toast({ title: 'Success', description: 'Stop deleted successfully' });
      if (selectedRoute) {
        await fetchStops(selectedRoute.id);
        await reorderStops();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const reorderStops = async () => {
    if (!selectedRoute) return;
    
    const { data: currentStops } = await supabase
      .from('route_stops')
      .select('*')
      .eq('route_id', selectedRoute.id)
      .order('sequence', { ascending: true });

    if (currentStops) {
      for (let i = 0; i < currentStops.length; i++) {
        await supabase
          .from('route_stops')
          .update({ sequence: i + 1 })
          .eq('id', currentStops[i].id);
      }
      fetchStops(selectedRoute.id);
    }
  };

  const moveStop = async (stopId: string, direction: 'up' | 'down') => {
    const currentIndex = stops.findIndex(s => s.id === stopId);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= stops.length) return;

    const currentStop = stops[currentIndex];
    const targetStop = stops[targetIndex];

    try {
      await supabase
        .from('route_stops')
        .update({ sequence: targetStop.sequence })
        .eq('id', currentStop.id);

      await supabase
        .from('route_stops')
        .update({ sequence: currentStop.sequence })
        .eq('id', targetStop.id);

      if (selectedRoute) {
        fetchStops(selectedRoute.id);
      }
      toast({ title: 'Success', description: 'Stop order updated' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const openEditDialog = (stop: RouteStop) => {
    setEditingStop(stop);
    setFormData({
      stop_name: stop.stop_name,
      latitude: stop.latitude?.toString() || '',
      longitude: stop.longitude?.toString() || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingStop(null);
    setFormData({ stop_name: '', latitude: '', longitude: '' });
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </SidebarLayout>
    );
  }

  if (!selectedRoute) {
    return (
      <SidebarLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Route Stops</h1>
              <p className="text-muted-foreground mt-1">Select a route to manage its stops (sub-routes)</p>
            </div>
          </div>

          {routes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Train className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No routes found</h3>
                <p className="text-muted-foreground mt-2">
                  Create routes first before adding stops
                </p>
                <Button className="mt-4" onClick={() => setLocation('/admin/routes')}>
                  Go to Routes
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {routes.map((route) => (
                <Card 
                  key={route.id} 
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedRoute(route)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Train className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{route.route_number}</CardTitle>
                        <CardDescription>{route.route_name}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Click to manage stops for this route
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedRoute(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-foreground">{selectedRoute.route_number}</h1>
                <Badge variant="secondary">{selectedRoute.route_name}</Badge>
              </div>
              <p className="text-muted-foreground mt-1">Manage stops for this route</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Stop
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingStop ? 'Edit Stop' : 'Add New Stop'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="stop_name">Stop Name</Label>
                  <Input
                    id="stop_name"
                    value={formData.stop_name}
                    onChange={(e) => setFormData({ ...formData, stop_name: e.target.value })}
                    placeholder="e.g., Main Gate, Library, Hostel Block A"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="latitude">Latitude (Optional)</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="e.g., 28.6139"
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude">Longitude (Optional)</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="e.g., 77.2090"
                    />
                  </div>
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  {editingStop ? 'Update Stop' : 'Add Stop'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {stopsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : stops.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <MapPin className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No stops added yet</h3>
              <p className="text-muted-foreground mt-2">
                Add stops to create a train-like tracking experience
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Navigation className="h-5 w-5 text-primary" />
                Route Stops ({stops.length})
              </CardTitle>
              <CardDescription>
                Stops are shown in order. Use arrows to reorder.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {stops.map((stop, index) => {
                  const isFirst = index === 0;
                  const isLast = index === stops.length - 1;
                  
                  return (
                    <div key={stop.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                          isFirst 
                            ? 'bg-green-500 border-green-500 text-white' 
                            : isLast 
                              ? 'bg-red-500 border-red-500 text-white' 
                              : 'bg-primary border-primary text-primary-foreground'
                        }`}>
                          <span className="text-sm font-bold">{stop.sequence}</span>
                        </div>
                        {!isLast && (
                          <div className="w-0.5 h-16 bg-primary/30" />
                        )}
                      </div>

                      <div className="flex-1 pb-6">
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <h3 className="font-medium flex items-center gap-2">
                                {stop.stop_name}
                                {isFirst && <Badge variant="outline" className="text-green-600 border-green-600">Start</Badge>}
                                {isLast && <Badge variant="outline" className="text-red-600 border-red-600">End</Badge>}
                              </h3>
                              {(stop.latitude || stop.longitude) && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {stop.latitude?.toFixed(4)}, {stop.longitude?.toFixed(4)}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => moveStop(stop.id, 'up')}
                              disabled={isFirst}
                              className="h-8 w-8"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => moveStop(stop.id, 'down')}
                              disabled={isLast}
                              className="h-8 w-8"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(stop)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(stop.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-medium">How it works</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  When a driver starts a trip, students can track the bus progress through these stops in real-time, 
                  similar to train tracking apps. The driver marks arrival and departure at each stop.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
