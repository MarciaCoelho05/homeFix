import { Link, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    navigate("/login")
  }

  return (
    <nav className="navbar navbar-expand-lg bg-white shadow p-3 flex justify-content-between align-items-center">
      <div className="fs-4 font-bold text-blue-600">
        <Link to="/dashboard">HomeFix</Link>
      </div>
      <div className="space-x-4">
        <Link to="/dashboard" className="text-secondary hover:text-blue-600">Dashboard</Link>
        <button onClick={handleLogout} className="text-red-500 ">Logout</button>
      </div>
    </nav>
  )
}