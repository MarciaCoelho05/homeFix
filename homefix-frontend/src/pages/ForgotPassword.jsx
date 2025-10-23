import React, { useState, useMemo } from 'react'
import Layout from '../components/Layout'
import api from '../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const emailError = useMemo(() => {
    return !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Email inválido' : ''
  }, [email])
  const isValid = !emailError

  const submit = async (e) => {
    e.preventDefault()
    setErrors({ email: emailError })
    if (emailError) return
    try {
      setSubmitting(true)
      const res = await api.post('/auth/forgot', { email })
      setStatus(res.data?.message || 'Se o email existir, enviaremos instruções')
    } catch (err) {
      setStatus('Erro ao enviar email de recuperação')
    } finally { setSubmitting(false) }
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto bg-white rounded shadow p-4">
        <h2 className="h5 fw-bold mb-2">Recuperar palavra-passe</h2>
        {status && <div className="alert alert-info py-2">{status}</div>}
        <form onSubmit={submit} noValidate>
          <label className="form-label">Email</label>
          <input className={`form-control ${errors.email ? 'is-invalid' : ''}`} value={email} onChange={e => { setEmail(e.target.value); setErrors({}) }} />
          {errors.email && <div className="invalid-feedback">{errors.email}</div>}
          <button className="btn btn-primary mt-3 w-100" disabled={!isValid || submitting}>
            {submitting ? 'A enviar...' : 'Enviar instruções'}
          </button>
        </form>
      </div>
    </Layout>
  )
}
