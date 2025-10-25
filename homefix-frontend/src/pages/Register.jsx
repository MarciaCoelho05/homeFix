import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import API from "../services/api";

const formatDateForInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dateLimits = (() => {
  const today = new Date();
  const min = new Date(today);
  min.setFullYear(today.getFullYear() - 100);
  const max = new Date(today);
  max.setFullYear(today.getFullYear() - 18);
  return { min: formatDateForInput(min), max: formatDateForInput(max) };
})();

export default function Register() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    birthDate: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const validate = (data) => {
    const errs = {};
    if (!data.firstName?.trim()) errs.firstName = "Indique o nome";
    if (!data.lastName?.trim()) errs.lastName = "Indique o apelido";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || "")) errs.email = "Email invalido";
    if (!data.password || data.password.length < 6 || !/[^A-Za-z0-9]/.test(data.password)) {
      errs.password = "Senha com minimo 6 caracteres e 1 caracter especial";
    }
    if ((data.confirmPassword || "") !== (data.password || "")) {
      errs.confirmPassword = "As senhas devem coincidir";
    }

    if (!data.birthDate) {
      errs.birthDate = "Indique a data de nascimento";
    } else {
      const birth = new Date(data.birthDate);
      if (Number.isNaN(birth.getTime())) {
        errs.birthDate = "Data de nascimento invalida";
      } else {
        const today = new Date();
        const oldest = new Date(today);
        oldest.setFullYear(today.getFullYear() - 100);
        const youngest = new Date(today);
        youngest.setFullYear(today.getFullYear() - 18);
        if (birth < oldest || birth > youngest) {
          errs.birthDate = "Idade deve estar entre 18 e 100 anos";
        }
      }
    }

    return errs;
  };

  const isValid = useMemo(() => Object.keys(validate(form)).length === 0, [form]);

  const handleChange = (event) => {
    const next = { ...form, [event.target.name]: event.target.value };
    setForm(next);
    if (showErrors) {
      setFieldErrors(validate(next));
    } else {
      setFieldErrors({});
    }
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setShowErrors(true);
    const errs = validate(form);
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      setSubmitting(true);
      const { confirmPassword, ...payload } = form;
      await API.post("/auth/register", payload);
      navigate("/login");
    } catch (err) {
      const resp = err?.response?.data;
      if (resp?.errors) {
        setFieldErrors(resp.errors);
        setError(resp.message || "");
      } else {
        const fallbackMessage = resp?.message || "Erro ao registar. Verifique os dados.";
        const lowerMessage = fallbackMessage.toLowerCase();
        const keywordMap = {
          firstName: ["nome"],
          lastName: ["apelido", "sobrenome"],
          email: ["email"],
          password: ["senha", "password"],
          confirmPassword: ["confirmacao", "confirmar", "confirme"],
          birthDate: ["nascimento", "idade", "data"],
        };

        const derivedFieldErrors = {};
        Object.entries(keywordMap).forEach(([field, keywords]) => {
          if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
            derivedFieldErrors[field] = fallbackMessage;
          }
        });

        if (!Object.keys(derivedFieldErrors).length) {
          ["firstName", "lastName", "email", "password", "confirmPassword", "birthDate"].forEach((field) => {
            derivedFieldErrors[field] = fallbackMessage;
          });
        }

        setFieldErrors(derivedFieldErrors);
        setError(fallbackMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="auth-wrapper">
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 p-md-5 rounded shadow-sm w-100 auth-card"
          style={{ maxWidth: 520 }}
        >
          <h2 className="fs-4 fw-bold mb-3 text-center">Criar conta</h2>
          {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

          <div className="row g-2">
            <div className="col-12 col-md-6">
              <label className="form-label small text-uppercase">Nome</label>
              <input
                name="firstName"
                placeholder="Nome"
                value={form.firstName}
                onChange={handleChange}
                className={`form-control ${fieldErrors.firstName ? "is-invalid" : ""}`}
              />
              {fieldErrors.firstName && <div className="invalid-feedback">{fieldErrors.firstName}</div>}
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label small text-uppercase">Apelido</label>
              <input
                name="lastName"
                placeholder="Apelido"
                value={form.lastName}
                onChange={handleChange}
                className={`form-control ${fieldErrors.lastName ? "is-invalid" : ""}`}
              />
              {fieldErrors.lastName && <div className="invalid-feedback">{fieldErrors.lastName}</div>}
            </div>
          </div>

          <div className="mt-3">
            <label className="form-label small text-uppercase">Email</label>
            <input
              name="email"
              type="email"
              placeholder="email@exemplo.com"
              value={form.email}
              onChange={handleChange}
              className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
            />
            {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
          </div>

          <div className="mt-3">
            <label className="form-label small text-uppercase">Senha</label>
            <input
              name="password"
              type="password"
              placeholder="Senha segura"
              value={form.password}
              onChange={handleChange}
              className={`form-control ${fieldErrors.password ? "is-invalid" : ""}`}
            />
            {fieldErrors.password && <div className="invalid-feedback">{fieldErrors.password}</div>}
          </div>

          <div className="mt-3">
            <label className="form-label small text-uppercase">Confirmar senha</label>
            <input
              name="confirmPassword"
              type="password"
              placeholder="Repita a senha"
              value={form.confirmPassword}
              onChange={handleChange}
              className={`form-control ${fieldErrors.confirmPassword ? "is-invalid" : ""}`}
            />
            {fieldErrors.confirmPassword && <div className="invalid-feedback">{fieldErrors.confirmPassword}</div>}
          </div>

          <div className="mt-3">
            <label className="form-label small text-uppercase">Data de nascimento</label>
            <input
              name="birthDate"
              type="date"
              value={form.birthDate}
              min={dateLimits.min}
              max={dateLimits.max}
              onChange={handleChange}
              className={`form-control ${fieldErrors.birthDate ? "is-invalid" : ""}`}
            />
            {fieldErrors.birthDate && <div className="invalid-feedback">{fieldErrors.birthDate}</div>}
          </div>

          <button type="submit" className="btn btn-primary w-100 mt-4" disabled={submitting}>
            {submitting ? "A criar conta..." : "Criar conta"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
