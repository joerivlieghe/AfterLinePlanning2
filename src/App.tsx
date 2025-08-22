import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import TruckDetail from './pages/TruckDetail';
import OperatorSelection from './pages/OperatorSelection';
import OperatorView from './pages/OperatorView';
import Header from './components/layout/Header'; // Import the Header component
import { AppProvider } from './context/AppContext'; // Import AppProvider

const App: React.FC = () => {
  return (
    <AppProvider> {/* Wrap the entire application with AppProvider */}
      <Header /> {/* Render the Header component here */}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/trucks/:truckId" element={<TruckDetail />} />
        <Route path="/operators" element={<OperatorSelection />} />
        <Route path="/operator/:operatorId" element={<OperatorView />} />
        {/* Add other routes here as needed */}
      </Routes>
    </AppProvider>
  );
};

export default App;
