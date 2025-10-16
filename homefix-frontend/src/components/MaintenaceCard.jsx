export default function MaintenanceCard({ request }) {
  return (
    <div className="bg-white p-4 rounded shadow mb-4">
      <h3 className="text-lg font-semibold text-gray-800">{request.title}</h3>
      <p className="text-sm text-gray-600 mb-2">{request.description}</p>
      <p className="text-sm"><strong>Categoria:</strong> {request.category}</p>
      <p className="text-sm"><strong>Status:</strong> <span className="font-medium">{request.status}</span></p>
      <p className="text-sm"><strong>Preço:</strong> €{request.price}</p>
    </div>
  )
}