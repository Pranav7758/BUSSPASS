import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  CreditCard,
  QrCode,
  MapPin,
  Receipt,
  Bell,
  Bus,
  Users,
  Route,
  BarChart3,
  Play,
  History,
  LogOut,
  Settings,
} from 'lucide-react';
import type { ReactNode } from 'react';

interface SidebarLayoutProps {
  children: ReactNode;
}

const studentNavItems = [
  { title: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { title: 'Digital Pass', href: '/student/pass', icon: QrCode },
  { title: 'Wallet', href: '/student/wallet', icon: CreditCard },
  { title: 'Track Bus', href: '/student/track-bus', icon: MapPin },
  { title: 'Transactions', href: '/student/transactions', icon: Receipt },
  { title: 'Notifications', href: '/student/notifications', icon: Bell },
];

const driverNavItems = [
  { title: 'Dashboard', href: '/driver/dashboard', icon: LayoutDashboard },
  { title: 'Students', href: '/driver/students', icon: Users },
  { title: 'Trip History', href: '/driver/trips', icon: History },
];

const adminNavItems = [
  { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { title: 'Buses', href: '/admin/buses', icon: Bus },
  { title: 'Routes', href: '/admin/routes', icon: Route },
  { title: 'Route Stops', href: '/admin/route-stops', icon: MapPin },
  { title: 'Students', href: '/admin/students', icon: Users },
  { title: 'Drivers', href: '/admin/drivers', icon: Users },
  { title: 'Transactions', href: '/admin/transactions', icon: Receipt },
  { title: 'Reports', href: '/admin/reports', icon: BarChart3 },
];

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const { user, student, driver, signOut } = useAuth();
  const [location] = useLocation();

  const getNavItems = () => {
    if (!user) return [];
    switch (user.role) {
      case 'student':
        return studentNavItems;
      case 'driver':
        return driverNavItems;
      case 'admin':
        return adminNavItems;
      default:
        return [];
    }
  };

  const navItems = getNavItems();
  
  const getUserName = () => {
    if (student) return student.full_name;
    if (driver) return driver.full_name;
    if (user?.role === 'admin') return 'Administrator';
    return user?.email || 'User';
  };

  const getUserInitials = () => {
    const name = getUserName();
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getPhotoUrl = () => {
    if (student?.photo_url) return student.photo_url;
    if (driver?.photo_url) return driver.photo_url;
    return null;
  };

  const getRoleLabel = () => {
    if (!user) return '';
    return user.role.charAt(0).toUpperCase() + user.role.slice(1);
  };

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background">
        <Sidebar className="border-r border-sidebar-border">
          <SidebarHeader className="border-b border-sidebar-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bus className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-semibold text-sidebar-foreground">SwiftPass</span>
                <span className="text-xs text-muted-foreground">{getRoleLabel()} Portal</span>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="px-2 py-4">
            <SidebarGroup>
              <SidebarGroupLabel className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className="h-10"
                        >
                          <Link href={item.href} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                            <item.icon className="h-5 w-5" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          
          <SidebarFooter className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={getPhotoUrl() || undefined} alt={getUserName()} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {getUserName()}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="w-full mt-3 justify-start text-muted-foreground hover:text-destructive"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </SidebarFooter>
        </Sidebar>
        
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
