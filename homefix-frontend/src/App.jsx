import React, { useState, useEffect } from 'react';
import { SearchContext } from './contexts/SearchContext';
import AppRoutes from './routes';

const App = () => {
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Initialize time immediately with a safe function
    const updateTime = () => {
      try {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        setCurrentTime(timeString);
        return now.toISOString();
      } catch (e) {
        setCurrentTime('');
        return '';
      }
    };

    const isoString = updateTime();
    console.log('[APP] 🚀 App component loaded - Version V2.0:', isoString || 'N/A');
    console.log('[APP] ✅ Alterações ativas - Deploy funcionando!');
    
    const interval = setInterval(updateTime, 1000);
    
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
        🚀 DEPLOY V2.0 FUNCIONANDO - {currentTime || 'Carregando...'}
      </div>
      <div style={{ marginTop: '50px' }}>
        <AppRoutes />
      </div>
    </SearchContext.Provider>
  );
};

export default App;
