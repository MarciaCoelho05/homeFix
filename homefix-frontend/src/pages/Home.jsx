import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";

const carouselImages = [
  { src: "/img/a1.jpg", alt: "Projetos concluídos 1" },
  { src: "/img/a2.jpg", alt: "Projetos concluídos 2" },
  { src: "/img/a3.jpg", alt: "Projetos concluídos 3" },
  { src: "/img/a4.jpg", alt: "Projetos concluídos 4" },
  { src: "/img/a5.jpg", alt: "Projetos concluídos 5" },
];

const Home = () => {
  const [statusMsg, setStatusMsg] = useState("");
  const navigate = useNavigate();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        await api.get("/public/requests");
      } catch (firstError) {
        try {
          await api.get("/public/requests?status=concluido");
          setStatusMsg("Mostramos serviços concluídos recentemente.");
        } catch (secondError) {
          setStatusMsg("Para ver todos os serviços, inicie sessão.");
        }
      }
    };
    fetchRequests();
  }, []);

  const pedirOrcamento = (category = "") => {
    if (!token) {
      navigate("/login");
      return;
    }
    const target = category ? `/new-request?category=${encodeURIComponent(category)}` : "/new-request";
    navigate(target);
  };

  return (
    <Layout>
      <div className="home-page">
        <section className="home-hero rounded-3 p-4 p-md-5 mb-5 text-white">
          <div className="row align-items-center g-4">
            <div className="col-12 col-lg-7">
              <h1 className="display-6 fw-bold mb-3">Manutenção de qualidade, do pedido à conclusão.</h1>
              <p className="lead mb-4">
                Compare técnicos certificados, leia feedback real e marque o serviço ideal para a sua casa.
              </p>
              <div className="d-flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary btn-lg" onClick={() => pedirOrcamento()}>
                  Pedir orçamento
                </button>
              </div>
            </div>
            <div className="col-12 col-lg-5">
              <div className="stats-card p-4 rounded-3 bg-dark bg-opacity-25">
                <div className="d-flex justify-content-between text-center">
                  <div>
                    <div className="stat-number">24h</div>
                    <div className="stat-label">Resposta média</div>
                  </div>
                  <div>
                    <div className="stat-number">+500</div>
                    <div className="stat-label">Serviços executados</div>
                  </div>
                  <div>
                    <div className="stat-number">4.8⭐</div>
                    <div className="stat-label">Avaliação média</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-5">
          <div id="homeHighlightsCarousel" className="carousel slide" data-bs-ride="carousel">
            <div className="carousel-indicators">
              {carouselImages.map((_, index) => (
                <button
                  key={`indicator-${index}`}
                  type="button"
                  data-bs-target="#homeHighlightsCarousel"
                  data-bs-slide-to={index}
                  className={index === 0 ? "active" : ""}
                  aria-current={index === 0 ? "true" : undefined}
                  aria-label={`Slide ${index + 1}`}
                ></button>
              ))}
            </div>
            <div className="carousel-inner rounded-3 shadow-sm">
              {carouselImages.map((image, index) => (
                <div key={image.src} className={`carousel-item ${index === 0 ? "active" : ""}`}>
                  <img src={image.src} className="d-block w-100 home-carousel-img" alt={image.alt} />
                </div>
              ))}
            </div>
            <button className="carousel-control-prev" type="button" data-bs-target="#homeHighlightsCarousel" data-bs-slide="prev">
              <span className="carousel-control-prev-icon" aria-hidden="true"></span>
              <span className="visually-hidden">Anterior</span>
            </button>
            <button className="carousel-control-next" type="button" data-bs-target="#homeHighlightsCarousel" data-bs-slide="next">
              <span className="carousel-control-next-icon" aria-hidden="true"></span>
              <span className="visually-hidden">Seguinte</span>
            </button>
          </div>
        </section>

        <section className="mb-5">
          <div className="card bg-light border-0 shadow-sm">
            <div className="card-body p-4 p-md-5 d-flex flex-column flex-md-row align-items-md-center gap-4">
              <div className="flex-grow-1">
                <h2 className="h4 fw-semibold mb-2">Técnicos validados</h2>
                <p className="text-muted mb-0">
                  Cada prestador é verificado pela equipa HomeFix. Garantimos orçamentos transparentes e acompanhamento até à conclusão do trabalho.
                </p>
              </div>
            </div>
          </div>
        </section>

        {statusMsg && <p className="text-muted small">{statusMsg}</p>}
      </div>
    </Layout>
  );
};

export default Home;
