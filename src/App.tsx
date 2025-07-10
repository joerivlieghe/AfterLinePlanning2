import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import OperatorView from './pages/OperatorView';
import TruckDetail from './pages/TruckDetail';
import Header from './components/layout/Header';
import TruckSearch from './pages/TruckSearch';
import OperatorSelection from './pages/OperatorSelection';
import Reports from './pages/Reports';
import AdminPage from './pages/AdminPage';
import CustomerAdaptation from './pages/CustomerAdaptation';
import PaintBoothOccupancy from './pages/PaintBoothOccupancy'; // Import the new PaintBoothOccupancy component

const App: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/operators" element={<OperatorSelection />} />
          <Route path="/operator/:operatorId" element={<OperatorView />} />
          <Route path="/trucks/:truckId" element={<TruckDetail />} />
          <Route path="/truck-search" element={<TruckSearch />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/customer-adaptation" element={<CustomerAdaptation />} />
          <Route path="/paint-booth-occupancy" element={<PaintBoothOccupancy />} /> {/* New route for Paint Booth Occupancy Page */}
        </Routes>
      </main>
    </div>
  );
};

export default App;
