
import React, { useState } from 'react';
import { SearchContext } from './contexts/SearchContext';
import AppRoutes from './routes';

const App = () => {
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  if (typeof window !== 'undefined') {
    console.log('[APP] 🚀 App component loaded - Version V2.0:', new Date().toISOString());
    console.log('[APP] ✅ Alterações ativas - Deploy funcionando!');
  }

  return (
    <SearchContext.Provider value={{ searchQuery: globalSearchQuery, setSearchQuery: setGlobalSearchQuery }}>
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        background: '#ff7a00', 
        color: 'white', 
        padding: '10px', 
        textAlign: 'center', 
        zIndex: 999999,
        fontWeight: 'bold'
      }}>
        🚀 DEPLOY V2.0 FUNCIONANDO - {new Date().toLocaleTimeString()}
      </div>
      <div style={{ marginTop: '50px' }}>
        <AppRoutes />
      </div>
    </SearchContext.Provider>
  );
};

export default App;
