import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AppProvider } from './context/AppContext';
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from './components/ui/toaster.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <AppProvider>
        <App />
        <Toaster />
      </AppProvider>
    </Router>
  </React.StrictMode>,
);
