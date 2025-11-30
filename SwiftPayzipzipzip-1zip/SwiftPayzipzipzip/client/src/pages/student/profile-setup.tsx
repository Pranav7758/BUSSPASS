import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { BusRoute } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Bus, Loader2, User, GraduationCap, Route } from 'lucide-react';

const steps = [
  { id: 1, title: 'Personal Info', icon: User },
  { id: 2, title: 'Academic Info', icon: GraduationCap },
  { id: 3, title: 'Bus Route', icon: Route },
];

export default function ProfileSetupPage() {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    enrollment_no: '',
    course: '',
    department: '',
    bus_route_id: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchRoutes = async () => {
      const { data } = await supabase
        .from('bus_routes')
        .select('*')
        .order('route_name');
      if (data) setRoutes(data);
    };
    fetchRoutes();
  }, []);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (step === 1) {
      if (!formData.full_name || formData.full_name.length < 2) {
        newErrors.full_name = 'Name must be at least 2 characters';
      }
      if (!formData.phone || formData.phone.length < 10) {
        newErrors.phone = 'Phone must be at least 10 digits';
      }
    }
    
    if (step === 2) {
      if (!formData.enrollment_no) {
        newErrors.enrollment_no = 'Enrollment number is required';
      }
      if (!formData.course) {
        newErrors.course = 'Course is required';
      }
      if (!formData.department) {
        newErrors.department = 'Department is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!validateStep(1) || !validateStep(2)) {
      toast({
        title: 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('students')
        .insert({
          user_id: user.id,
          full_name: formData.full_name,
          enrollment_no: formData.enrollment_no,
          course: formData.course,
          department: formData.department,
          phone: formData.phone,
          bus_route_id: formData.bus_route_id || null,
          wallet_balance: 0,
          is_blocked: false,
        });

      if (error) throw error;

      await refreshProfile();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast({
        title: 'Profile created!',
        description: 'Your student profile has been set up successfully.',
      });
      
      window.location.href = '/student/dashboard';
    } catch (err: any) {
      toast({
        title: 'Failed to create profile',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const progress = (currentStep / 3) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Bus className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-2xl font-semibold">Complete Your Profile</CardTitle>
            <CardDescription className="mt-2">
              We need a few more details to set up your bus pass
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 text-sm ${
                    currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      currentStep >= step.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground'
                    }`}
                  >
                    <step.icon className="h-4 w-4" />
                  </div>
                  <span className="hidden sm:inline font-medium">{step.title}</span>
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="space-y-4">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    data-testid="input-full-name"
                  />
                  {errors.full_name && <p className="text-sm text-destructive">{errors.full_name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    data-testid="input-phone"
                  />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="enrollment_no">Enrollment Number</Label>
                  <Input
                    id="enrollment_no"
                    placeholder="2024001234"
                    value={formData.enrollment_no}
                    onChange={(e) => setFormData({ ...formData, enrollment_no: e.target.value })}
                    data-testid="input-enrollment"
                  />
                  {errors.enrollment_no && <p className="text-sm text-destructive">{errors.enrollment_no}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course">Course</Label>
                  <Input
                    id="course"
                    placeholder="B.Tech Computer Science"
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    data-testid="input-course"
                  />
                  {errors.course && <p className="text-sm text-destructive">{errors.course}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="Computer Science & Engineering"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    data-testid="input-department"
                  />
                  {errors.department && <p className="text-sm text-destructive">{errors.department}</p>}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Your Bus Route</Label>
                  <Select
                    value={formData.bus_route_id || "__none__"}
                    onValueChange={(value) => setFormData({ ...formData, bus_route_id: value === "__none__" ? "" : value })}
                  >
                    <SelectTrigger data-testid="select-route">
                      <SelectValue placeholder="Choose a route (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Skip - Select later</SelectItem>
                      {routes.map((route) => (
                        <SelectItem key={route.id} value={route.id}>
                          {route.route_number} - {route.route_name} (₹{route.daily_fare}/day)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">
                    Bus route is optional. You can select or change it later from your profile settings.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrev}
                  className="flex-1"
                  data-testid="button-prev"
                >
                  Previous
                </Button>
              )}
              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="flex-1"
                  data-testid="button-next"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1"
                  disabled={isLoading}
                  data-testid="button-submit"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Complete Setup
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
