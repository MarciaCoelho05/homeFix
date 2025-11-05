import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function SupportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
  const isAdmin = role === 'admin';

  // Se for admin, não mostrar o botão de suporte (admin não precisa de suporte)
  if (isAdmin) {
    return null;
  }

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#ff7a00',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          cursor: 'pointer',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        }}
        title="Precisa de ajuda? Contacte o administrador"
      >
        💬
      </button>

      {/* Menu de suporte */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: '280px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            padding: '20px',
            zIndex: 1001,
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <h6 style={{ margin: 0, color: '#1f2937', fontWeight: 600, fontSize: '16px' }}>
              Precisa de Ajuda?
            </h6>
            <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
              Entre em contacto com o administrador através do chat.
            </p>
          </div>
          
          <Link
            to="/chat"
            onClick={() => setIsOpen(false)}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#ff7a00',
              color: 'white',
              textAlign: 'center',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#e56d00';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#ff7a00';
            }}
          >
            Abrir Chat
          </Link>
          
          <button
            onClick={() => setIsOpen(false)}
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '8px',
              backgroundColor: 'transparent',
              color: '#6b7280',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Fechar
          </button>
        </div>
      )}

      {/* Overlay para fechar ao clicar fora */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            backgroundColor: 'transparent',
          }}
        />
      )}
    </>
  );
}

