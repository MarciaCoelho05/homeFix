import React, { useMemo } from 'react'

export default function Footer() {
  const currentYear = useMemo(() => {
    try {
      return new Date().getFullYear();
    } catch (e) {
      return 2025;
    }
  }, []);

  return (
    <footer className="border-top py-4 mt-5">
      <div className="container d-flex justify-content-between align-items-center">
        <div className="text-muted small">&copy; {currentYear} HOMEFIX - V2.0</div>
        <div className="d-flex gap-3 footer-social">
          <a className="text-decoration-none" href="https://facebook.com" target="_blank" rel="noreferrer">
            <img src="/img/icon-facebook.svg" alt="Facebook" />
          </a>
          <a className="text-decoration-none" href="https://instagram.com" target="_blank" rel="noreferrer">
            <img src="/img/icon-instagram.svg" alt="Instagram" />
          </a>
          <a className="text-decoration-none" href="https://wa.me/351900000000" target="_blank" rel="noreferrer">
            <img src="/img/icon-whatsapp.svg" alt="WhatsApp" />
          </a>
        </div>
      </div>
    </footer>
  )
}
