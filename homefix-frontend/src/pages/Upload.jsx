import { useState } from 'react'
import API from '../services/api'

export default function Upload() {
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [status, setStatus] = useState("")

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImage(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  const handleUpload = async () => {
    if (!image) {
      setStatus("Selecione uma imagem primeiro.")
      return
    }

    const formData = new FormData()
    formData.append("file", image)

    try {
      const res = await API.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      })
      setStatus("Imagem enviada com sucesso!")
      console.log("Resposta do servidor:", res.data)
    } catch (err) {
      console.error("Erro no upload:", err)
      setStatus("Erro ao enviar imagem.")
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded shadow">
      <h2 className="fs-4 font-bold mb-3">Upload de Imagem</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} className="mb-3" />
      {preview && <img src={preview} alt="Preview" className="mb-3 rounded max-h-60" />}
      <button onClick={handleUpload} className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700">
        Enviar
      </button>
      {status && <p className="mt-3 fs-6">{status}</p>}
    </div>
  )
}
