import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { HomeIcon, UsersIcon, TruckIcon, BarChart2Icon, SettingsIcon, LayoutDashboardIcon } from 'lucide-react';

const Header: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Operators', href: '/operators', icon: UsersIcon },
    { name: 'Truck Search', href: '/truck-search', icon: TruckIcon },
    { name: 'Reports', href: '/reports', icon: BarChart2Icon },
    { name: 'Alternative Dashboard', href: '/alternative-dashboard', icon: LayoutDashboardIcon },
    { name: 'Admin', href: '/admin', icon: SettingsIcon }, // New Admin link
  ];

  return (
    <header className="bg-gradient-to-r from-blue-600 to-purple-700 text-white shadow-lg py-4 px-6">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-3xl font-bold tracking-tight flex items-center">
          <img src="https://images.pexels.com/photos/105827/pexels-photo-105827.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" alt="Logo" className="h-10 w-10 rounded-full mr-3 object-cover" />
          AfterLine Planning
        </Link>
        <nav>
          <ul className="flex space-x-6">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Button
                    asChild
                    variant="ghost"
                    className={cn(
                      "text-white hover:bg-white hover:text-blue-700 transition-colors duration-200",
                      isActive && "bg-white text-blue-700 font-semibold"
                    )}
                  >
                    <Link to={item.href} className="flex items-center">
                      <Icon className="mr-2 h-5 w-5" />
                      {item.name}
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
