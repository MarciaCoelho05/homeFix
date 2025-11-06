import React, { useState, useEffect } from 'react';
import { SearchContext } from './contexts/SearchContext';
import AppRoutes from './routes';

const App = () => {
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[APP] 🚀 App component loaded - Version V2.0');
      console.log('[APP] ✅ Aplicação funcionando!');
    }
  }, []);

  return (
    <SearchContext.Provider value={{ searchQuery: globalSearchQuery, setSearchQuery: setGlobalSearchQuery }}>
      <AppRoutes />
    </SearchContext.Provider>
  );
};

export default App;
