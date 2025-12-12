import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Only use StrictMode in development - it causes double renders that slow startup
const rootElement = document.getElementById('root') as HTMLElement;
const app = import.meta.env.DEV ? (
  <React.StrictMode>
    <App />
  </React.StrictMode>
) : (
  <App />
);

ReactDOM.createRoot(rootElement).render(app);
