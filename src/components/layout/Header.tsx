import React from 'react';
import { Link } from 'react-router-dom';
import { TruckIcon, UsersIcon, SearchIcon } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2">
          <TruckIcon className="h-8 w-8" />
          <h1 className="text-2xl font-bold tracking-tight">Truck Repair Planner</h1>
        </Link>
        <nav>
          <ul className="flex space-x-6">
            <li>
              <Link to="/" className="flex items-center text-lg hover:text-blue-200 transition-colors duration-200">
                <TruckIcon className="h-5 w-5 mr-2" /> Dashboard
              </Link>
            </li>
            <li>
              <Link to="/operators" className="flex items-center text-lg hover:text-blue-200 transition-colors duration-200">
                <UsersIcon className="h-5 w-5 mr-2" /> Operators
              </Link>
            </li>
            <li>
              <Link to="/truck-search" className="flex items-center text-lg hover:text-blue-200 transition-colors duration-200">
                <SearchIcon className="h-5 w-5 mr-2" /> Truck Search
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
