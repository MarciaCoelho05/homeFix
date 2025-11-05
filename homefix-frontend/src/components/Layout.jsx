import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Footer from './Footer';
import FloatingChat from './FloatingChat';
import api from '../services/api';
import { useSearch } from '../contexts/SearchContext';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
  const location = useLocation();
  const [userName, setUserName] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const { searchQuery: globalSearchQuery, setSearchQuery: setGlobalSearchQuery } = useSearch();

  useEffect(() => {
    if (role === 'admin' && location.pathname !== '/admin') {
      navigate('/admin', { replace: true });
    }
  }, [role, location.pathname, navigate]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (token) {
        try {
          const res = await api.get('/profile');
          const firstName = res.data?.firstName || '';
          setUserName(firstName);
        } catch (error) {
          console.error('Erro ao carregar dados do usuário:', error);
        }
      }
    };
    fetchUserData();
  }, [token]);

  useEffect(() => {
    if (!token || role === 'admin') return;

    const checkUnreadMessages = async () => {
      try {
        const endpoint = role === 'technician' ? '/requests' : '/requests/mine';
        const res = await api.get(endpoint);
        const requests = res.data || [];
        
        let totalUnread = 0;
        const userId = localStorage.getItem('userId');
        const lastVisit = localStorage.getItem('lastChatVisit');
        const lastVisitTime = lastVisit ? new Date(lastVisit).getTime() : 0;
        
        for (const request of requests) {
          if (request.messages && Array.isArray(request.messages) && request.messages.length > 0) {
            const unreadInRequest = request.messages.filter(msg => {
              if (!msg.senderId || msg.senderId === userId) return false;
              
              const messageTime = msg.createdAt ? new Date(msg.createdAt).getTime() : 0;
              return messageTime > lastVisitTime;
            }).length;
            
            if (unreadInRequest > 0) {
              totalUnread += unreadInRequest;
            }
          }
        }
        setUnreadCount(totalUnread);
      } catch (error) {
        console.error('Erro ao verificar mensagens:', error);
      }
    };

    checkUnreadMessages();
    const interval = setInterval(checkUnreadMessages, 30000);
    
    const handleStorageChange = (e) => {
      if (e.key === 'lastChatVisit' || e.storageArea === localStorage) {
        checkUnreadMessages();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('chatVisited', checkUnreadMessages);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('chatVisited', checkUnreadMessages);
    };
  }, [token, role, location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    navigate('/');
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const brandLink = role === 'admin' ? '/admin' : '/';
  const isAdmin = role === 'admin';
  const isTechnician = role === 'technician';
  const isAuthenticated = Boolean(token);

  return (
    <>
      <nav className="navbar navbar-expand-lg homefix-navbar shadow-sm">
        <div className="container">
          <Link className="navbar-brand fw-bold" to={brandLink}>
            HomeFix
            {isAuthenticated && userName && (
              <span className="ms-2 fw-normal text-muted" style={{ fontSize: '0.9rem' }}>
                | Olá, {userName}
              </span>
            )}
          </Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            {!isAdmin && location.pathname === '/services' && (
              <div className="mx-auto my-2 my-lg-0" style={{ maxWidth: '400px', width: '100%' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="🔍 Pesquisar..."
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
            )}
            <ul className="navbar-nav ms-auto align-items-lg-center gap-2">
              {!isAdmin && !isTechnician && (
                <>
                  <li className="nav-item">
                    <Link className="nav-link" to="/">Inicio</Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/services">Servicos</Link>
                  </li>
                </>
              )}
              {isAuthenticated ? (
                isAdmin ? (
                  <>
                    <li className="nav-item">
                      <Link className="nav-link" to="/admin">Painel</Link>
                    </li>
                    <li className="nav-item">
                      <button className="btn btn-sm btn-outline-primary" onClick={handleLogout}>Sair</button>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="nav-item">
                      <Link className="nav-link" to="/profile">Perfil</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link" to="/dashboard">Painel</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link position-relative" to="/chat">
                        Chat
                        {unreadCount > 0 && (
                          <span 
                            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" 
                            style={{ fontSize: '0.65rem', padding: '0.25rem 0.4rem' }}
                          >
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </Link>
                    </li>
                    {!isTechnician && (
                      <li className="nav-item">
                        <Link className="btn btn-sm btn-primary" to="/new-request">Pedir servico</Link>
                      </li>
                    )}
                    <li className="nav-item">
                      <button className="btn btn-sm btn-outline-primary" onClick={handleLogout}>Sair</button>
                    </li>
                  </>
                )
              ) : (
                <>
                  <li className="nav-item">
                    <Link className="btn btn-sm btn-outline-primary" to="/login">Entrar</Link>
                  </li>
                  <li className="nav-item">
                    <Link className="btn btn-sm btn-primary" to="/register">Registar</Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>

      <main className="container py-4">
        {children}
      </main>
      <Footer />
      {isAuthenticated && <FloatingChat />}
    </>
  );
};

export default Layout;
