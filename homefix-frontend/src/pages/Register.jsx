import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";


export default function Register() {
    const [form, setForm] = useState({
        firstName:"",
        lastName:"",
        email: "",
        password: "",
        birthDate: ""
    });
    const navigate = useNavigate();
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    }
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await API.post('/auth/register', form);
            navigate("/login");
        } catch (err) {
            setError("Erro ao registar. Tente novamente. ")
        }
    }
    
  return (
    <div className="app">
      <div className="center-container">
        <form onSubmit={handleSubmit} className="card">
          <h2 className="text-xl font-bold mb-4 text-center">Registar</h2>
          {error && <p className="text-red-500 mb-2 text-sm">{error}</p>}

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem'}}>
            <input name="firstName" placeholder="Nome" onChange={handleChange} required className="form-input" />
            <input name="lastName" placeholder="Apelido" onChange={handleChange} required className="form-input" />
          </div>

          <input name="email" type="email" placeholder="Email" onChange={handleChange} required className="form-input mt-3" />
          <input name="password" type="password" placeholder="Senha" onChange={handleChange} required className="form-input mt-3" />
          <input name="birthDate" type="date" placeholder="Data de nascimento" onChange={handleChange} required className="form-input mt-3" />

          <button type="submit" className="btn-primary mt-4">
            Criar Conta
          </button>
        </form>
      </div>
    </div>
  )
}