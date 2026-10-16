import { createRoot } from 'react-dom/client';

import { App } from './App';
import './index.css';

// No StrictMode: it runs every effect twice in development, which here means
// every query hits Snowflake twice.
createRoot(document.getElementById('root')!).render(<App />);
