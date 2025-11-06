import React, { useState, useEffect } from 'react';
import { SearchContext } from './contexts/SearchContext';
import AppRoutes from './routes';

const App = () => {
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return new Date().toLocaleTimeString();
      } catch (e) {
        return '';
      }
    }
    return '';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        console.log('[APP] 🚀 App component loaded - Version V2.0:', new Date().toISOString());
        console.log('[APP] ✅ Alterações ativas - Deploy funcionando!');
        
        const updateTime = () => {
          try {
            setCurrentTime(new Date().toLocaleTimeString());
          } catch (e) {
            console.error('[APP] Error updating time:', e);
          }
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
      } catch (e) {
        console.error('[APP] Error in useEffect:', e);
      }
    }
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
        zIndex: 999999,
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
