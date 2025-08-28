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
import PaintBoothOccupancy from './pages/PaintBoothOccupancy';
import PlanningDashboard from './pages/PlanningDashboard';
import TruckPlanningSummaryPage from './pages/TruckPlanningSummaryPage';

const App: React.FC = () => {
  console.log('App.tsx: App component is rendering.');
  return (
    <div className="flex flex-col min-h-screen">
      {console.log('App.tsx: Rendering Header component.')}
      <Header key="app-header" /> {/* Added a key to force re-mount */}
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
          <Route path="/paint-booth-occupancy" element={<PaintBoothOccupancy />} />
          <Route path="/planning" element={<PlanningDashboard />} />
          <Route path="/truck-planning-summary" element={<TruckPlanningSummaryPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
