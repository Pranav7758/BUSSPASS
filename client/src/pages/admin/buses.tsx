import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { Bus, BusRoute, BusWithRoute } from '@shared/schema';
import { Plus, Bus as BusIcon, Edit, Trash2, Search, Route } from 'lucide-react';

export default function AdminBuses() {
  const { toast } = useToast();
  const [buses, setBuses] = useState<BusWithRoute[]>([]);
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  
  const [formData, setFormData] = useState({
    bus_number: '',
    capacity: 50,
    route_id: '',
    is_active: true,
  });

  const fetchData = async () => {
    const [busesResult, routesResult] = await Promise.all([
      supabase.from('buses').select('*, bus_routes(*)').order('bus_number'),
      supabase.from('bus_routes').select('*').order('route_name'),
    ]);

    if (busesResult.data) {
      setBuses(busesResult.data.map((b: any) => ({ ...b, route: b.bus_routes })));
    }
    if (routesResult.data) setRoutes(routesResult.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async () => {
    if (!formData.bus_number) {
      toast({ title: 'Error', description: 'Bus number is required', variant: 'destructive' });
      return;
    }

    try {
      if (editingBus) {
        const { error } = await supabase
          .from('buses')
          .update({
            bus_number: formData.bus_number,
            capacity: formData.capacity,
            route_id: formData.route_id || null,
            is_active: formData.is_active,
          })
          .eq('id', editingBus.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Bus updated successfully' });
      } else {
        const { error } = await supabase.from('buses').insert({
          bus_number: formData.bus_number,
          capacity: formData.capacity,
          route_id: formData.route_id || null,
          is_active: formData.is_active,
        });

        if (error) throw error;
        toast({ title: 'Success', description: 'Bus added successfully' });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bus?')) return;

    try {
      const { error } = await supabase.from('buses').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Bus deleted successfully' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const openEditDialog = (bus: Bus) => {
    setEditingBus(bus);
    setFormData({
      bus_number: bus.bus_number,
      capacity: bus.capacity,
      route_id: bus.route_id || '',
      is_active: bus.is_active,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingBus(null);
    setFormData({ bus_number: '', capacity: 50, route_id: '', is_active: true });
  };

  const filteredBuses = buses.filter(
    (bus) =>
      bus.bus_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bus.route?.route_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
            <h1 className="text-2xl font-semibold text-foreground">Buses</h1>
            <p className="text-muted-foreground mt-1">Manage your bus fleet</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-bus">
                <Plus className="h-4 w-4 mr-2" />
                Add Bus
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBus ? 'Edit Bus' : 'Add New Bus'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="bus_number">Bus Number</Label>
                  <Input
                    id="bus_number"
                    value={formData.bus_number}
                    onChange={(e) => setFormData({ ...formData, bus_number: e.target.value })}
                    placeholder="e.g., BUS-001"
                    data-testid="input-bus-number"
                  />
                </div>
                <div>
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    data-testid="input-capacity"
                  />
                </div>
                <div>
                  <Label htmlFor="route">Route</Label>
                  <Select
                    value={formData.route_id || "__none__"}
                    onValueChange={(value) => setFormData({ ...formData, route_id: value === "__none__" ? "" : value })}
                  >
                    <SelectTrigger data-testid="select-route">
                      <SelectValue placeholder="Select a route" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No Route</SelectItem>
                      {routes.map((route) => (
                        <SelectItem key={route.id} value={route.id}>
                          {route.route_number} - {route.route_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Active</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    data-testid="switch-active"
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full" data-testid="button-submit-bus">
                  {editingBus ? 'Update Bus' : 'Add Bus'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search buses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-buses"
          />
        </div>

        {/* Buses Grid */}
        {filteredBuses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BusIcon className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No buses found</h3>
              <p className="text-muted-foreground mt-2">
                {searchQuery ? 'Try a different search' : 'Add your first bus to get started'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredBuses.map((bus) => (
              <Card key={bus.id} data-testid={`bus-card-${bus.id}`}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <BusIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{bus.bus_number}</CardTitle>
                      <Badge variant={bus.is_active ? 'default' : 'secondary'} className="mt-1">
                        {bus.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(bus)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(bus.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="font-medium">{bus.capacity} seats</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Route</span>
                    <span className="font-medium">
                      {bus.route ? `${bus.route.route_number} - ${bus.route.route_name}` : 'Not assigned'}
                    </span>
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
