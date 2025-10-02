import React, { useEffect, useState } from "react";
import api from "../api";

export default function Admin() {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        api.get('/admin/users').then(res => setUsers (res.data)).catch(err => console.error(err));
    }, []);

    const promoteUser = async (id) => {
        await.api.put('/admin/users/${id}/promote');
        alert('User promovido');
    };

    return (
        <div className="p-6">
            <h2 className="text-3x1 font-bold text-primary mb-4">Painel de Administração</h2>
            <ul className="space-y-2">
                {users.map(u =>(
                    <li key={u.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
                        <span>{u.name} - {u.email}</span>
                        <button onClick={() => promoteUser(u.id)} className="bg-primary text-white px-3 py-1 rounded hover:bg-secondary">Promover</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}