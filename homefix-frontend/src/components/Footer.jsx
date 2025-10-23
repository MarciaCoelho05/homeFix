import React from 'react'

export default function Footer(){
  return (
    <footer className="border-top py-4 mt-5">
      <div className="container d-flex justify-content-between align-items-center">
        <div className="text-muted small">© {new Date().getFullYear()} HomeFix</div>
        <div className="d-flex gap-3">
          <a className="text-decoration-none" href="https://facebook.com" target="_blank" rel="noreferrer"><img src="https://thvnext.bing.com/th/id/OIP.dLtBc58iKTTmsCyN6fwe5AHaHa?w=162&h=180&c=7&r=0&o=7&cb=ucfimgc2&dpr=1.5&pid=1.7&rm=3" alt="Facebook" /></a>
          <a className="text-decoration-none" href="https://instagram.com" target="_blank" rel="noreferrer"><img src="https://thvnext.bing.com/th/id/OIP.LvXdcalxa48wopcZJCLGrgHaHa?w=173&h=180&c=7&r=0&o=7&cb=ucfimgc2&dpr=1.5&pid=1.7&rm=3" alt="Instagram" /></a>
          <a className="text-decoration-none" href="https://wa.me/351900000000" target="_blank" rel="noreferrer"><img src="https://thvnext.bing.com/th/id/OIP.GbsrglNpiRVjIa8pKAcUzAHaHa?w=178&h=180&c=7&r=0&o=7&cb=ucfimgc2&dpr=1.5&pid=1.7&rm=3" alt="whatsapp" /></a>
        </div>
      </div>
    </footer>
  )
}
