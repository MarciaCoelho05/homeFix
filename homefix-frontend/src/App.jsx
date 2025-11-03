
import React, { useState } from 'react';
import { SearchContext } from './contexts/SearchContext';
import AppRoutes from './routes';

const App = () => {
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  return (
    <SearchContext.Provider value={{ searchQuery: globalSearchQuery, setSearchQuery: setGlobalSearchQuery }}>
      <AppRoutes />
    </SearchContext.Provider>
  );
};

export default App;
