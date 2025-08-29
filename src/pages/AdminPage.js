// src/pages/AdminPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './AdminPage.module.css';
import { API_URL } from '../config/api';

const AdminPage = () => {
    const { token } = useAuth();
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_URL}/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Hiba a felhasználók betöltésekor.');
            setUsers(data.users);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleApproveTeacher = async (userId) => {
        setMessage('');
        setError('');
        try {
            const response = await fetch(`${API_URL}/api/admin/approve-teacher/${userId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'A jóváhagyás sikertelen.');
            
            setMessage(data.message);
            // Frissítjük a listát a gomb megnyomása után
            fetchUsers();

        } catch (err) {
            setError(err.message);
        }
    };

    if (isLoading) {
        return <div className={styles.container}><p>Felhasználók betöltése...</p></div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.adminPanel}>
                <h1>Adminisztrációs Felület</h1>
                {error && <p className={styles.errorMessage}>{error}</p>}
                {message && <p className={styles.successMessage}>{message}</p>}
                
                <div className={styles.tableContainer}>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Felhasználónév</th>
                                <th>E-mail</th>
                                <th>Szerepkör</th>
                                <th>Regisztrált</th>
                                <th>Státusz</th>
                                <th>Műveletek</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td>{user.username}</td>
                                    <td>{user.email}</td>
                                    <td>{user.role}</td>
                                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                    <td>
                                        {user.role === 'teacher' ? (
                                            user.is_approved ? 
                                            <span className={styles.approved}>Jóváhagyva</span> : 
                                            <span className={styles.pending}>Jóváhagyásra vár</span>
                                        ) : (
                                            <span className={styles.notApplicable}>-</span>
                                        )}
                                    </td>
                                    <td>
                                        {user.role === 'teacher' && !user.is_approved && (
                                            <button 
                                                className={styles.approveButton}
                                                onClick={() => handleApproveTeacher(user.id)}
                                            >
                                                Jóváhagyás
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;