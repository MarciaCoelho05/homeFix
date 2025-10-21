export default function MaintenanceCard({ request }) {
  return (
    <div className="bg-white p-3 rounded shadow mb-3">
      <h3 className="fs-5 font-semibold text-gray-800">{request.title}</h3>
      <p className="fs-6 text-gray-600 mb-2">{request.description}</p>
      <p className="fs-6"><strong>Categoria:</strong> {request.category}</p>
      <p className="fs-6"><strong>Status:</strong> <span className="font-medium">{request.status}</span></p>
      <p className="fs-6"><strong>Preço:</strong> €{request.price}</p>
    </div>
  )
}