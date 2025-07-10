import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, UsersIcon, TruckIcon, SearchIcon, BarChart2Icon, SettingsIcon, WrenchIcon, PaintbrushIcon } from 'lucide-react'; // Import PaintbrushIcon
import { cn } from '@/lib/utils';

const Header: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Operators', href: '/operators', icon: UsersIcon },
    { name: 'Truck Search', href: '/truck-search', icon: SearchIcon },
    { name: 'Reports', href: '/reports', icon: BarChart2Icon },
    { name: 'Customer Adaptation', href: '/customer-adaptation', icon: WrenchIcon },
    { name: 'Paint Booth', href: '/paint-booth-occupancy', icon: PaintbrushIcon }, // New nav item
    { name: 'Admin', href: '/admin', icon: SettingsIcon },
  ];

  return (
    <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg py-4 px-6">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-3xl font-extrabold tracking-tight">
          AfterLine Planning
        </Link>
        <nav>
          <ul className="flex space-x-6">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center text-lg font-medium transition-colors hover:text-blue-200",
                    location.pathname === item.href ? "text-blue-100 border-b-2 border-blue-100" : "text-white"
                  )}
                >
                  <item.icon className="mr-2 h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
