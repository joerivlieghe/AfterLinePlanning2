import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MenuIcon } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-lg font-bold">
            AfterLine Planning
          </Link>
          <nav className="hidden md:flex space-x-4">
            <Link to="/" className="text-sm font-medium hover:underline">
              Dashboard
            </Link>
            <Link to="/planning" className="text-sm font-medium hover:underline">
              Planning
            </Link>
            <Link to="/planning-summary" className="text-sm font-medium hover:underline">
              Planning Summary
            </Link>
            <Link to="/truck-search" className="text-sm font-medium hover:underline">
              Truck Search
            </Link>
            <Link to="/operators" className="text-sm font-medium hover:underline">
              Operators
            </Link>
            <Link to="/reports" className="text-sm font-medium hover:underline">
              Reports
            </Link>
            <Link to="/overdue-trucks-report" className="text-sm font-medium hover:underline text-red-500">
              Overdue Trucks
            </Link>
            <Link to="/customer-adaptation" className="text-sm font-medium hover:underline">
              Customer Adaptation
            </Link>
            <Link to="/paint-booth-occupancy" className="text-sm font-medium hover:underline">
              Paint Booth Occupancy
            </Link>
            <Link to="/admin" className="text-sm font-medium hover:underline">
              Admin
            </Link>
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
              <nav className="flex flex-col space-y-4 pt-6">
                <Link to="/" className="text-lg font-medium hover:underline">
                  Dashboard
                </Link>
                <Link to="/planning" className="text-lg font-medium hover:underline">
                  Planning
                </Link>
                <Link to="/planning-summary" className="text-lg font-medium hover:underline">
                  Planning Summary
                </Link>
                <Link to="/truck-search" className="text-lg font-medium hover:underline">
                  Truck Search
                </Link>
                <Link to="/operators" className="text-lg font-medium hover:underline">
                  Operators
                </Link>
                <Link to="/reports" className="text-lg font-medium hover:underline">
                  Reports
                </Link>
                <Link to="/overdue-trucks-report" className="text-lg font-medium hover:underline text-red-500">
                  Overdue Trucks
                </Link>
                <Link to="/customer-adaptation" className="text-lg font-medium hover:underline">
                  Customer Adaptation
                </Link>
                <Link to="/paint-booth-occupancy" className="text-lg font-medium hover:underline">
                  Paint Booth Occupancy
                </Link>
                <Link to="/admin" className="text-lg font-medium hover:underline">
                  Admin
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
