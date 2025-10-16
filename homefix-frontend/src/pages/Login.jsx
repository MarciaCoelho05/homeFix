import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await API.post('/auth/login', { email, password });
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));
            navigate("/dashboard");
        } catch (err) {
            setError("Credenciais inválidas")
        }}

  return (
    <div className="app">
      <div className="center-container">
        <form onSubmit={handleSubmit} className="card">
          <h2 className="text-xl font-bold mb-4 text-center">Login</h2>
          {error && <p className="text-red-500 mb-2 text-sm">{error}</p>}

          <label className="sr-only">Email</label>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="form-input mb-3"
            required
          />

          <label className="sr-only">Senha</label>
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="form-input mb-3"
            required
          />

          <button type="submit" className="btn-primary">
            Entrar
          </button>

          <p className="text-center mt-4 text-sm muted">
            Não tem conta? <a href="/register" className="text-blue-600 hover:underline">Registar</a>
          </p>
        </form>
      </div>
    </div>
  )
}