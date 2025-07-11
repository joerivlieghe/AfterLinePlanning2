import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MenuIcon, HomeIcon, UsersIcon, TruckIcon, BarChart2Icon, SettingsIcon, PaintbrushIcon, LayoutDashboardIcon, ClipboardListIcon } from 'lucide-react';

const Header: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Operators', href: '/operators', icon: UsersIcon },
    { name: 'Truck Search', href: '/truck-search', icon: TruckIcon },
    { name: 'Reports', href: '/reports', icon: BarChart2Icon },
    { name: 'Customer Adaptation', href: '/customer-adaptation', icon: PaintbrushIcon },
    { name: 'Paint Booth Occupancy', href: '/paint-booth-occupancy', icon: PaintbrushIcon },
    { name: 'Planning Dashboard', href: '/planning', icon: LayoutDashboardIcon },
    { name: 'Truck Planning Summary', href: '/truck-planning-summary', icon: ClipboardListIcon }, // New link
    { name: 'Admin', href: '/admin', icon: SettingsIcon },
  ];

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
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
