import { useState } from "react";
import API from "../api";

export default function Upload() {
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [status, setStatus] = useState("");

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleUpload = async () => {
        if (!image) {
            setStatus("Por favor, selecione uma imagem primeiro.");
            return;
        }

        const formData = new FormData();
        formData.append("file", image)
        formData.append("maintenanceRequestId", "ID_DO_PEDIDO") // Substitua pelo ID real do pedido de manutenção
    
        try {
            const res = await API.post("/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });
            setStatus("Upload realizado com sucesso!");
            console.log("Resposta ao Servidor", res.data)
        } catch (err) {
            setStatus("Erro ao fazer upload. Tente novamente.");
            console.error("Erro no upload", err);
        }
    };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Upload de Imagem</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} className="mb-4" />
      {preview && <img src={preview} alt="Preview" className="mb-4 rounded max-h-60" />}
      <button onClick={handleUpload} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        Enviar
      </button>
      {status && <p className="mt-4 text-sm">{status}</p>}
    </div>
    );
}