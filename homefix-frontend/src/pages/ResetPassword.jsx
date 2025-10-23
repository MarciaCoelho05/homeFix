import React, { useMemo, useState } from 'react'
import Layout from '../components/Layout'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const token = params.get('token') || ''
  const validate = () => {
    const e = {}
    if (!password || password.length < 6) e.password = 'Mínimo 6 caracteres'
    if (confirm !== password) e.confirm = 'As palavras-passe não coincidem'
    if (!token) e.token = 'Token inválido'
    return e
  }
  const isValid = useMemo(() => Object.keys(validate()).length === 0, [password, confirm, token])

  const submit = async (e) => {
    e.preventDefault()
    const eMap = validate()
    setErrors(eMap)
    if (Object.keys(eMap).length) return
    try {
      setSubmitting(true)
      const res = await api.post('/auth/reset', { token, password })
      setStatus(res.data?.message || 'Palavra-passe atualizada')
      setTimeout(() => navigate('/login'), 1200)
    } catch (err) {
      setStatus('Token inválido ou expirado')
    } finally { setSubmitting(false) }
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto bg-white rounded shadow p-4">
        <h2 className="h5 fw-bold mb-2">Definir nova palavra-passe</h2>
        {status && <div className="alert alert-info py-2">{status}</div>}
        <form onSubmit={submit} noValidate>
          <label className="form-label">Nova palavra-passe</label>
          <input type="password" className={`form-control ${errors.password ? 'is-invalid' : ''}`} value={password} onChange={e => { setPassword(e.target.value); setErrors({}) }} />
          {errors.password && <div className="invalid-feedback">{errors.password}</div>}
          <label className="form-label mt-2">Confirmar palavra-passe</label>
          <input type="password" className={`form-control ${errors.confirm ? 'is-invalid' : ''}`} value={confirm} onChange={e => { setConfirm(e.target.value); setErrors({}) }} />
          {errors.confirm && <div className="invalid-feedback">{errors.confirm}</div>}
          <button className="btn btn-primary mt-3 w-100" disabled={!isValid || submitting}>
            {submitting ? 'A atualizar...' : 'Atualizar'}
          </button>
        </form>
      </div>
    </Layout>
  )
}
