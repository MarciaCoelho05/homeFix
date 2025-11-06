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
    if (!password || password.length < 6) e.password = 'Minimo 6 caracteres'
    if (confirm !== password) e.confirm = 'As palavras-passe nao coincidem'
    if (!token) e.token = 'Token invalido'
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
      setStatus('Token invalido ou expirado')
    } finally { setSubmitting(false) }
  }

  return (
    <Layout>
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-5">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4 p-md-5">
              <h2 className="h5 fw-semibold mb-3 text-center">Definir nova palavra-passe</h2>
              {status && <div className="alert alert-info py-2 mb-3">{status}</div>}
              <form onSubmit={submit} noValidate>
                <div className="mb-3">
                  <label className="form-label small text-uppercase">Nova palavra-passe</label>
                  <input 
                    type="password" 
                    className={`form-control ${errors.password ? 'is-invalid' : ''}`} 
                    value={password} 
                    onChange={e => { setPassword(e.target.value); setErrors({}) }} 
                  />
                  {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                </div>
                <div className="mb-3">
                  <label className="form-label small text-uppercase">Confirmar palavra-passe</label>
                  <input 
                    type="password" 
                    className={`form-control ${errors.confirm ? 'is-invalid' : ''}`} 
                    value={confirm} 
                    onChange={e => { setConfirm(e.target.value); setErrors({}) }} 
                  />
                  {errors.confirm && <div className="invalid-feedback">{errors.confirm}</div>}
                </div>
                <button className="btn btn-primary w-100" disabled={!isValid || submitting}>
                  {submitting ? 'A atualizar...' : 'Atualizar'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
