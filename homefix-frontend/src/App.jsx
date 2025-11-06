import React, { useState, useEffect } from 'react';
import { SearchContext } from './contexts/SearchContext';
import AppRoutes from './routes';

const App = () => {
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const getTimeString = () => {
      try {
        const date = new Date();
        return date.toLocaleTimeString();
      } catch (e) {
        return '';
      }
    };

    const getISOString = () => {
      try {
        const date = new Date();
        return date.toISOString();
      } catch (e) {
        return '';
      }
    };

    console.log('[APP] 🚀 App component loaded - Version V2.0:', getISOString());
    console.log('[APP] ✅ Alterações ativas - Deploy funcionando!');
    
    setCurrentTime(getTimeString());
    
    const interval = setInterval(() => {
      setCurrentTime(getTimeString());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

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
        zIndex: 1000,
        fontWeight: 'bold'
      }}>
        🚀 DEPLOY V2.0 FUNCIONANDO - {currentTime}
      </div>
      <div style={{ marginTop: '50px' }}>
        <AppRoutes />
      </div>
    </SearchContext.Provider>
  );
};

export default App;
