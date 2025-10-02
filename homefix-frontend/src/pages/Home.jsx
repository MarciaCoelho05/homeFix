import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
      return (
    <div className="bg-orange-50 min-h-screen">
      <header className="text-center py-20">
        <h1 className="text-5xl font-bold text-primary">Bem-vindo ao HomeFix</h1>
        <p className="text-lg mt-4 text-gray-700">
          Conectamos clientes com técnicos de confiança para todos os serviços de manutenção.
        </p>
        <Link to="/register" className="mt-6 inline-block bg-primary hover:bg-secondary text-white px-6 py-3 rounded-lg font-semibold">
          Comece Agora
        </Link>
      </header>
    </div>
  );
}