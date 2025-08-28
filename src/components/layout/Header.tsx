import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MenuIcon, HomeIcon, UsersIcon, TruckIcon, BarChart2Icon, SettingsIcon, PaintbrushIcon, LayoutDashboardIcon, ClipboardListIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/context/AppContext';

const Header: React.FC = () => {
  // This comment is added to force re-evaluation of the module.
  const location = useLocation();
  const { useDeliveryDateForCalculations, setUseDeliveryDateForCalculations } = useAppContext();

  const navItems = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Operators', href: '/operators', icon: UsersIcon },
    { name: 'Truck Search', href: '/truck-search', icon: TruckIcon },
    { name: 'Reports', href: '/reports', icon: BarChart2Icon },
    { name: 'Customer Adaptation', href: '/customer-adaptation', icon: PaintbrushIcon },
    { name: 'Paint Booth Occupancy', href: '/paint-booth-occupancy', icon: PaintbrushIcon },
    { name: 'Planning Dashboard', href: '/planning', icon: LayoutDashboardIcon },
    { name: 'Truck Planning Summary', href: '/truck-planning-summary', icon: ClipboardListIcon },
    { name: 'Admin', href: '/admin', icon: SettingsIcon },
  ];

  const handleToggleChange = (checked: boolean) => {
    // Invert the checked value to match the desired state:
    // If checked is true (switch is on the right, indicating "Earliest"), then useDeliveryDateForCalculations should be false.
    // If checked is false (switch is on the left, indicating "Delivery Date"), then useDeliveryDateForCalculations should be true.
    setUseDeliveryDateForCalculations(!checked);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-lg">AfterLinePlanning</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-4 lg:space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  location.pathname === item.href ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          {/* Toggle Switch for Date Calculation */}
          <div className="hidden md:flex items-center space-x-2 p-2 rounded-md bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-800">
            <Label htmlFor="date-calc-toggle" className="text-sm text-blue-800 dark:text-blue-200">
              Delivery Date
            </Label>
            <Switch
              id="date-calc-toggle"
              checked={!useDeliveryDateForCalculations} // Invert checked state: true for Delivery Date means switch is OFF (left)
              onCheckedChange={handleToggleChange}
              aria-label="Toggle between delivery date and earliest of delivery/invoice date for calculations"
            />
            <Label htmlFor="date-calc-toggle" className="text-sm text-blue-800 dark:text-blue-200">
              Earliest (Delivery/Invoice)
            </Label>
          </div>

          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MenuIcon className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <nav className="flex flex-col space-y-4 mt-6">
                  {navItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'flex items-center text-lg font-medium',
                        location.pathname === item.href ? 'text-primary' : 'text-muted-foreground'
                      )}
                    >
                      <item.icon className="mr-2 h-5 w-5" />
                      {item.name}
                    </Link>
                  ))}
                  {/* Mobile Toggle Switch */}
                  <div className="flex items-center justify-between mt-4 p-2 border-t pt-4 rounded-md bg-blue-100 dark:bg-blue-900 border-blue-200 dark:border-blue-800">
                    <Label htmlFor="date-calc-toggle-mobile" className="text-base text-blue-800 dark:text-blue-200">
                      Delivery Date
                    </Label>
                    <Switch
                      id="date-calc-toggle-mobile"
                      checked={!useDeliveryDateForCalculations} // Invert checked state for mobile
                      onCheckedChange={handleToggleChange}
                      aria-label="Toggle between delivery date and earliest of delivery/invoice date for calculations"
                    />
                    <Label htmlFor="date-calc-toggle-mobile" className="text-base text-blue-800 dark:text-blue-200">
                      Earliest (Delivery/Invoice)
                    </Label>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
