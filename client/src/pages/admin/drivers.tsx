import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { DriverWithBus, Bus } from '@shared/schema';
import { Plus, Users, Edit, Trash2, Search, Car, Phone, CreditCard } from 'lucide-react';

export default function AdminDrivers() {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<DriverWithBus[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverWithBus | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    license_number: '',
    bus_id: '',
    email: '',
    password: '',
    is_active: true,
  });

  const fetchData = async () => {
    const [driversResult, busesResult] = await Promise.all([
      supabase.from('drivers').select('*, buses(*, bus_routes(*))').order('full_name'),
      supabase.from('buses').select('*').order('bus_number'),
    ]);

    if (driversResult.data) {
      setDrivers(driversResult.data.map((d: any) => ({ 
        ...d, 
        bus: d.buses ? { ...d.buses, route: d.buses.bus_routes } : undefined 
      })));
    }
    if (busesResult.data) setBuses(busesResult.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async () => {
    if (!formData.full_name || !formData.phone || !formData.license_number) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    try {
      if (editingDriver) {
        // Update existing driver
        const { error } = await supabase
          .from('drivers')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            license_number: formData.license_number,
            bus_id: formData.bus_id || null,
            is_active: formData.is_active,
          })
          .eq('id', editingDriver.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Driver updated successfully' });
      } else {
        // Create new driver with auth account via backend API
        if (!formData.email || !formData.password) {
          toast({ title: 'Error', description: 'Email and password are required for new drivers', variant: 'destructive' });
          return;
        }

        // Use backend API to create driver (bypasses email verification)
        const response = await fetch('/api/create-driver', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            phone: formData.phone,
            license_number: formData.license_number,
            bus_id: formData.bus_id || null,
            is_active: formData.is_active,
          }),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to create driver');
        }

        toast({ title: 'Success', description: 'Driver added successfully' });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (driver: DriverWithBus) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;

    try {
      // Delete driver record
      const { error } = await supabase.from('drivers').delete().eq('id', driver.id);
      if (error) throw error;

      toast({ title: 'Success', description: 'Driver deleted successfully' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const openEditDialog = (driver: DriverWithBus) => {
    setEditingDriver(driver);
    setFormData({
      full_name: driver.full_name,
      phone: driver.phone,
      license_number: driver.license_number,
      bus_id: driver.bus_id || '',
      email: '',
      password: '',
      is_active: driver.is_active,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingDriver(null);
    setFormData({
      full_name: '',
      phone: '',
      license_number: '',
      bus_id: '',
      email: '',
      password: '',
      is_active: true,
    });
  };

  const filteredDrivers = drivers.filter(
    (driver) =>
      driver.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.license_number.toLowerCase().includes(searchQuery.toLowerCase())
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
            <h1 className="text-2xl font-semibold text-foreground">Drivers</h1>
            <p className="text-muted-foreground mt-1">Manage driver accounts</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-driver">
                <Plus className="h-4 w-4 mr-2" />
                Add Driver
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDriver ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="John Doe"
                    data-testid="input-driver-name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9876543210"
                    data-testid="input-driver-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="license_number">License Number</Label>
                  <Input
                    id="license_number"
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    placeholder="DL-123456"
                    data-testid="input-license-number"
                  />
                </div>
                {!editingDriver && (
                  <>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="driver@example.com"
                        data-testid="input-driver-email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Min 6 characters"
                        data-testid="input-driver-password"
                      />
                    </div>
                  </>
                )}
                <div>
                  <Label htmlFor="bus">Assigned Bus</Label>
                  <Select
                    value={formData.bus_id || "__none__"}
                    onValueChange={(value) => setFormData({ ...formData, bus_id: value === "__none__" ? "" : value })}
                  >
                    <SelectTrigger data-testid="select-bus">
                      <SelectValue placeholder="Select a bus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No Bus</SelectItem>
                      {buses.map((bus) => (
                        <SelectItem key={bus.id} value={bus.id}>
                          {bus.bus_number}
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
                    data-testid="switch-driver-active"
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full" data-testid="button-submit-driver">
                  {editingDriver ? 'Update Driver' : 'Add Driver'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search drivers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-drivers"
          />
        </div>

        {/* Drivers Grid */}
        {filteredDrivers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No drivers found</h3>
              <p className="text-muted-foreground mt-2">
                {searchQuery ? 'Try a different search' : 'Add your first driver to get started'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDrivers.map((driver) => (
              <Card key={driver.id} data-testid={`driver-card-${driver.id}`}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={driver.photo_url || undefined} />
                      <AvatarFallback className="bg-chart-2/10 text-chart-2">
                        {driver.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{driver.full_name}</CardTitle>
                      <Badge variant={driver.is_active ? 'default' : 'secondary'} className="mt-1">
                        {driver.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(driver)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(driver)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{driver.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span>{driver.license_number}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {driver.bus
                        ? `${driver.bus.bus_number}${driver.bus.route ? ` (${driver.bus.route.route_number})` : ''}`
                        : 'No bus assigned'}
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
