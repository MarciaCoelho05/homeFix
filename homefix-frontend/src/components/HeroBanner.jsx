import React from 'react'

export default function HeroBanner({ title, subtitle, imageUrl }) {
  return (
    <section className="hero-banner rounded-3 p-4 p-md-5 mb-4 text-white">
      <div className="row align-items-center g-4">
        <div className="col-12 col-lg-7">
          <h1 className="h3 fw-bold mb-2">{title}</h1>
          {subtitle && <p className="lead m-0 opacity-90">{subtitle}</p>}
        </div>
        {imageUrl && (
          <div className="col-12 col-lg-5 text-lg-end">
            <img className="hero-illus" src={imageUrl} alt="Ilustração" />
          </div>
        )}
      </div>
    </section>
  )
}
