import React from 'react';
import { Link } from 'react-router-dom';
import { TruckIcon, UsersIcon, SearchIcon, BarChart3Icon, LayoutDashboardIcon } from 'lucide-react'; // Added LayoutDashboardIcon

const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2">
          <TruckIcon className="h-8 w-8 text-blue-300" />
          <span className="text-2xl font-bold tracking-tight">AfterLine Planning</span>
        </Link>
        <nav>
          <ul className="flex space-x-6">
            <li>
              <Link to="/" className="flex items-center text-blue-100 hover:text-white transition-colors duration-200">
                <TruckIcon className="h-5 w-5 mr-1" />
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/alternative-dashboard" className="flex items-center text-blue-100 hover:text-white transition-colors duration-200">
                <LayoutDashboardIcon className="h-5 w-5 mr-1" />
                Alt Dashboard
              </Link>
            </li>
            <li>
              <Link to="/operators" className="flex items-center text-blue-100 hover:text-white transition-colors duration-200">
                <UsersIcon className="h-5 w-5 mr-1" />
                Operators
              </Link>
            </li>
            <li>
              <Link to="/truck-search" className="flex items-center text-blue-100 hover:text-white transition-colors duration-200">
                <SearchIcon className="h-5 w-5 mr-1" />
                Truck Search
              </Link>
            </li>
            <li>
              <Link to="/reports" className="flex items-center text-blue-100 hover:text-white transition-colors duration-200">
                <BarChart3Icon className="h-5 w-5 mr-1" />
                Reports
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
