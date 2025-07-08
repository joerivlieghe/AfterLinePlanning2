import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import OperatorView from './pages/OperatorView';
import TruckDetail from './pages/TruckDetail';
import Header from './components/layout/Header';
import TruckSearch from './pages/TruckSearch';
import OperatorSelection from './pages/OperatorSelection'; // Import the new component

const App: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/operators" element={<OperatorSelection />} /> {/* New route for operator overview */}
          <Route path="/operator/:operatorId" element={<OperatorView />} />
          <Route path="/trucks/:truckId" element={<TruckDetail />} />
          <Route path="/truck-search" element={<TruckSearch />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
