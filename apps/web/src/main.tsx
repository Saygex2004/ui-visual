import { createRoot } from 'react-dom/client';
import './theme/fonts.css';
import './theme/tokens.css';
import { AppProviders } from './app/providers.js';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}

createRoot(container).render(<AppProviders />);
