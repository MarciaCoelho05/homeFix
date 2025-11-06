import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";

const formatDateForInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Register() {
  const dateLimits = useMemo(() => {
    const today = new Date();
    const min = new Date(today);
    min.setFullYear(today.getFullYear() - 100);
    const max = new Date(today);
    max.setFullYear(today.getFullYear() - 18);
    return { min: formatDateForInput(min), max: formatDateForInput(max) };
  }, []);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    nif: "",
    email: "",
    password: "",
    confirmPassword: "",
    birthDate: "",
    userType: "cliente",
    technicianCategory: [],
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
    
    if (data.nif && data.nif.trim() && !/^\d{9}$/.test(data.nif.trim())) {
      errs.nif = "NIF deve ter 9 dígitos";
    }
    
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

    if (data.userType === "tecnico") {
      const categories = Array.isArray(data.technicianCategory) 
        ? data.technicianCategory 
        : data.technicianCategory ? [data.technicianCategory] : [];
      if (categories.length === 0) {
        errs.technicianCategory = "Selecione pelo menos uma categoria";
      }
    }

    return errs;
  };

  const isValid = useMemo(() => Object.keys(validate(form)).length === 0, [form]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const next = { ...form, [name]: value };
    
    if (name === "userType" && value === "cliente") {
      next.technicianCategory = [];
    }
    
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
      const { confirmPassword, userType, technicianCategory, ...basePayload } = form;
      const categories = Array.isArray(technicianCategory) 
        ? technicianCategory 
        : technicianCategory ? [technicianCategory] : [];
      const payload = {
        ...basePayload,
        isTechnician: userType === "tecnico",
        ...(userType === "tecnico" && categories.length > 0 ? { technicianCategory: categories } : {}),
      };
      await api.post("/auth/register", payload);
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
          technicianCategory: ["categoria", "tecnico"],
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
            <label className="form-label small text-uppercase">NIF (Opcional)</label>
            <input
              name="nif"
              type="text"
              placeholder="000000000"
              value={form.nif}
              onChange={handleChange}
              maxLength={9}
              className={`form-control ${fieldErrors.nif ? "is-invalid" : ""}`}
            />
            {fieldErrors.nif && <div className="invalid-feedback">{fieldErrors.nif}</div>}
            <small className="text-muted">Necessário para fatura com IVA</small>
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

          <div className="mt-3">
            <label className="form-label small text-uppercase">Tipo de conta</label>
            <div className="d-flex gap-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="userType"
                  id="userTypeCliente"
                  value="cliente"
                  checked={form.userType === "cliente"}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor="userTypeCliente">
                  Cliente
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="userType"
                  id="userTypeTecnico"
                  value="tecnico"
                  checked={form.userType === "tecnico"}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor="userTypeTecnico">
                  Técnico
                </label>
              </div>
            </div>
            {fieldErrors.userType && <div className="invalid-feedback d-block">{fieldErrors.userType}</div>}
          </div>

          {form.userType === "tecnico" && (
            <div className="mt-3">
              <label className="form-label small text-uppercase">Categorias de especializacao</label>
              <div className={`border rounded p-3 ${fieldErrors.technicianCategory ? 'border-danger' : ''}`}>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="category-canalizacao"
                    checked={Array.isArray(form.technicianCategory) && form.technicianCategory.includes('Canalizacao')}
                    onChange={(e) => {
                      const categories = Array.isArray(form.technicianCategory) ? form.technicianCategory : [];
                      const updated = e.target.checked
                        ? [...categories, 'Canalizacao']
                        : categories.filter(c => c !== 'Canalizacao');
                      setForm({ ...form, technicianCategory: updated });
                    }}
                  />
                  <label className="form-check-label" htmlFor="category-canalizacao">Canalização</label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="category-eletricidade"
                    checked={Array.isArray(form.technicianCategory) && form.technicianCategory.includes('Eletricidade')}
                    onChange={(e) => {
                      const categories = Array.isArray(form.technicianCategory) ? form.technicianCategory : [];
                      const updated = e.target.checked
                        ? [...categories, 'Eletricidade']
                        : categories.filter(c => c !== 'Eletricidade');
                      setForm({ ...form, technicianCategory: updated });
                    }}
                  />
                  <label className="form-check-label" htmlFor="category-eletricidade">Eletricidade</label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="category-pintura"
                    checked={Array.isArray(form.technicianCategory) && form.technicianCategory.includes('Pintura')}
                    onChange={(e) => {
                      const categories = Array.isArray(form.technicianCategory) ? form.technicianCategory : [];
                      const updated = e.target.checked
                        ? [...categories, 'Pintura']
                        : categories.filter(c => c !== 'Pintura');
                      setForm({ ...form, technicianCategory: updated });
                    }}
                  />
                  <label className="form-check-label" htmlFor="category-pintura">Pintura</label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="category-remodelacoes"
                    checked={Array.isArray(form.technicianCategory) && form.technicianCategory.includes('Remodelacoes')}
                    onChange={(e) => {
                      const categories = Array.isArray(form.technicianCategory) ? form.technicianCategory : [];
                      const updated = e.target.checked
                        ? [...categories, 'Remodelacoes']
                        : categories.filter(c => c !== 'Remodelacoes');
                      setForm({ ...form, technicianCategory: updated });
                    }}
                  />
                  <label className="form-check-label" htmlFor="category-remodelacoes">Remodelações</label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="category-jardinagem"
                    checked={Array.isArray(form.technicianCategory) && form.technicianCategory.includes('Jardinagem')}
                    onChange={(e) => {
                      const categories = Array.isArray(form.technicianCategory) ? form.technicianCategory : [];
                      const updated = e.target.checked
                        ? [...categories, 'Jardinagem']
                        : categories.filter(c => c !== 'Jardinagem');
                      setForm({ ...form, technicianCategory: updated });
                    }}
                  />
                  <label className="form-check-label" htmlFor="category-jardinagem">Jardinagem</label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="category-carpintaria"
                    checked={Array.isArray(form.technicianCategory) && form.technicianCategory.includes('Carpintaria')}
                    onChange={(e) => {
                      const categories = Array.isArray(form.technicianCategory) ? form.technicianCategory : [];
                      const updated = e.target.checked
                        ? [...categories, 'Carpintaria']
                        : categories.filter(c => c !== 'Carpintaria');
                      setForm({ ...form, technicianCategory: updated });
                    }}
                  />
                  <label className="form-check-label" htmlFor="category-carpintaria">Carpintaria</label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="category-outro"
                    checked={Array.isArray(form.technicianCategory) && form.technicianCategory.includes('Outro')}
                    onChange={(e) => {
                      const categories = Array.isArray(form.technicianCategory) ? form.technicianCategory : [];
                      const updated = e.target.checked
                        ? [...categories, 'Outro']
                        : categories.filter(c => c !== 'Outro');
                      setForm({ ...form, technicianCategory: updated });
                    }}
                  />
                  <label className="form-check-label" htmlFor="category-outro">Outro</label>
                </div>
              </div>
              {fieldErrors.technicianCategory && (
                <div className="invalid-feedback d-block">{fieldErrors.technicianCategory}</div>
              )}
            </div>
          )}

          <button type="submit" className="btn btn-primary w-100 mt-4" disabled={submitting}>
            {submitting ? "A criar conta..." : "Criar conta"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
