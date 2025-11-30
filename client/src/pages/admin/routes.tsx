import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { BusRoute } from '@shared/schema';
import { Plus, Route, Edit, Trash2, Search, IndianRupee, Users } from 'lucide-react';

export default function AdminRoutes() {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<(BusRoute & { studentCount: number })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<BusRoute | null>(null);
  
  const [formData, setFormData] = useState({
    route_name: '',
    route_number: '',
    description: '',
    daily_fare: 60,
  });

  const fetchData = async () => {
    const { data: routesData } = await supabase
      .from('bus_routes')
      .select('*')
      .order('route_number');

    if (routesData) {
      // Get student count for each route
      const routesWithCount = await Promise.all(
        routesData.map(async (route) => {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('bus_route_id', route.id);
          return { ...route, studentCount: count || 0 };
        })
      );
      setRoutes(routesWithCount);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async () => {
    if (!formData.route_name || !formData.route_number) {
      toast({ title: 'Error', description: 'Route name and number are required', variant: 'destructive' });
      return;
    }

    try {
      if (editingRoute) {
        const { error } = await supabase
          .from('bus_routes')
          .update({
            route_name: formData.route_name,
            route_number: formData.route_number,
            description: formData.description || null,
            daily_fare: formData.daily_fare,
          })
          .eq('id', editingRoute.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Route updated successfully' });
      } else {
        const { error } = await supabase.from('bus_routes').insert({
          route_name: formData.route_name,
          route_number: formData.route_number,
          description: formData.description || null,
          daily_fare: formData.daily_fare,
        });

        if (error) throw error;
        toast({ title: 'Success', description: 'Route added successfully' });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this route? This will also affect all assigned students and buses.')) return;

    try {
      const { error } = await supabase.from('bus_routes').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Route deleted successfully' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const openEditDialog = (route: BusRoute) => {
    setEditingRoute(route);
    setFormData({
      route_name: route.route_name,
      route_number: route.route_number,
      description: route.description || '',
      daily_fare: route.daily_fare,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingRoute(null);
    setFormData({ route_name: '', route_number: '', description: '', daily_fare: 60 });
  };

  const filteredRoutes = routes.filter(
    (route) =>
      route.route_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.route_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SidebarLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Routes</h1>
            <p className="text-muted-foreground mt-1">Manage bus routes and fares</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-route">
                <Plus className="h-4 w-4 mr-2" />
                Add Route
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingRoute ? 'Edit Route' : 'Add New Route'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="route_number">Route Number</Label>
                  <Input
                    id="route_number"
                    value={formData.route_number}
                    onChange={(e) => setFormData({ ...formData, route_number: e.target.value })}
                    placeholder="e.g., R1"
                    data-testid="input-route-number"
                  />
                </div>
                <div>
                  <Label htmlFor="route_name">Route Name</Label>
                  <Input
                    id="route_name"
                    value={formData.route_name}
                    onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                    placeholder="e.g., Downtown - Campus"
                    data-testid="input-route-name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Route description..."
                    data-testid="input-description"
                  />
                </div>
                <div>
                  <Label htmlFor="daily_fare">Daily Fare (₹)</Label>
                  <Input
                    id="daily_fare"
                    type="number"
                    value={formData.daily_fare}
                    onChange={(e) => setFormData({ ...formData, daily_fare: parseInt(e.target.value) })}
                    data-testid="input-daily-fare"
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full" data-testid="button-submit-route">
                  {editingRoute ? 'Update Route' : 'Add Route'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search routes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-routes"
          />
        </div>

        {/* Routes Grid */}
        {filteredRoutes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Route className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No routes found</h3>
              <p className="text-muted-foreground mt-2">
                {searchQuery ? 'Try a different search' : 'Add your first route to get started'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRoutes.map((route) => (
              <Card key={route.id} data-testid={`route-card-${route.id}`}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                      <Route className="h-5 w-5 text-chart-2" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{route.route_number}</CardTitle>
                      <CardDescription>{route.route_name}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(route)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(route.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {route.description && (
                    <p className="text-sm text-muted-foreground">{route.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Daily Fare</span>
                    </div>
                    <span className="font-medium">₹{route.daily_fare}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Students</span>
                    </div>
                    <span className="font-medium">{route.studentCount}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
