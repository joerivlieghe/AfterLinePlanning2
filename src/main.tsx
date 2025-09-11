import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import AppProvider from './context/AppContext'; // Changed to default import
import { Toaster } from './components/ui/toaster.tsx';
import { BrowserRouter } from 'react-router-dom';

console.log('main.tsx: Starting application render process.');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter> {/* This is the ONLY BrowserRouter in the app */}
    <AppProvider>
      <App />
      <Toaster />
    </AppProvider>
  </BrowserRouter>,
);
