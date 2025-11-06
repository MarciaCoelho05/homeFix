import React, { useState, useEffect } from 'react';
import { SearchContext } from './contexts/SearchContext';
import AppRoutes from './routes';

const App = () => {
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState('Carregando...');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Wait for next tick to ensure everything is initialized
    let intervalId = null;
    const initTimer = setTimeout(() => {
      try {
        const updateTime = () => {
          try {
            const now = new Date();
            const timeString = now.toLocaleTimeString();
            setCurrentTime(timeString);
            return now.toISOString();
          } catch (e) {
            setCurrentTime('Erro');
            return '';
          }
        };

        const isoString = updateTime();
        console.log('[APP] 🚀 App component loaded - Version V2.0:', isoString || 'N/A');
        console.log('[APP] ✅ Alterações ativas - Deploy funcionando!');
        
        intervalId = setInterval(updateTime, 1000);
      } catch (e) {
        console.error('[APP] Erro ao inicializar:', e);
      }
    }, 0);
    
    return () => {
      clearTimeout(initTimer);
      if (intervalId) clearInterval(intervalId);
    };
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
