import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { initSupabase } from '@innova/supabase';
import App from './App';
import './styles.css';

initSupabase(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/nr1">
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
