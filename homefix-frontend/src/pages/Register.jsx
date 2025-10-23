import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import API from '../services/api'

export default function Register() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', birthDate: ''
  })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const validate = (data) => {
    const errs = {}
    if (!data.firstName?.trim()) errs.firstName = 'Indique o nome'
    if (!data.lastName?.trim()) errs.lastName = 'Indique o apelido'
    if (!data.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errs.email = 'Email inválido'
    if (!data.password || data.password.length < 6) errs.password = 'Senha com pelo menos 6 caracteres'
    if (!data.birthDate) errs.birthDate = 'Indique a data de nascimento'
    return errs
  }

  const isValid = useMemo(() => Object.keys(validate(form)).length === 0, [form])

  const handleChange = (e) => {
    const next = { ...form, [e.target.name]: e.target.value }
    setForm(next)
    setFieldErrors(validate(next))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate(form)
    setFieldErrors(errs)
    if (Object.keys(errs).length) return
    try {
      setSubmitting(true)
      await API.post('/auth/register', form)
      navigate('/login')
    } catch (err) {
      const resp = err?.response?.data; if (resp?.errors) { setFieldErrors(resp.errors); setError(resp.message || ''); } else { setError(resp?.message || 'Erro ao registar. Verifique os dados.'); } } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen d-flex align-items-center justify-content-center bg-light">
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow-sm w-100" style={{maxWidth: 460}}>
        <h2 className="fs-4 fw-bold mb-3 text-center">Criar conta</h2>
        {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

        <div className="row g-2">
          <div className="col-6">
            <input name="firstName" placeholder="Nome" value={form.firstName} onChange={handleChange} className={`form-control ${fieldErrors.firstName ? 'is-invalid' : ''}`} />
            {fieldErrors.firstName && <div className="invalid-feedback">{fieldErrors.firstName}</div>}
          </div>
          <div className="col-6">
            <input name="lastName" placeholder="Apelido" value={form.lastName} onChange={handleChange} className={`form-control ${fieldErrors.lastName ? 'is-invalid' : ''}`} />
            {fieldErrors.lastName && <div className="invalid-feedback">{fieldErrors.lastName}</div>}
          </div>
        </div>

        <div className="mt-2">
          <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`} />
          {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
        </div>
        <div className="mt-2">
          <input name="password" type="password" placeholder="Senha (mín. 6)" value={form.password} onChange={handleChange} className={`form-control ${fieldErrors.password ? 'is-invalid' : ''}`} />
          {fieldErrors.password && <div className="invalid-feedback">{fieldErrors.password}</div>}
        </div>
        <div className="mt-2">
          <input name="birthDate" type="date" placeholder="Data de nascimento" value={form.birthDate} onChange={handleChange} className={`form-control ${fieldErrors.birthDate ? 'is-invalid' : ''}`} />
          {fieldErrors.birthDate && <div className="invalid-feedback">{fieldErrors.birthDate}</div>}
        </div>

        <button type="submit" className="btn btn-primary w-100 mt-3" disabled={!isValid || submitting}>
          {submitting ? 'A criar conta...' : 'Criar conta'}
        </button>
      </form>
    </div>
  )
}



