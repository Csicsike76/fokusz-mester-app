// src/pages/AdminPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './AdminPage.module.css';
import { API_URL } from '../config/api';

const AdminPage = () => {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const fetchData = useCallback(async (tab) => {
        setIsLoading(true);
        setError('');
        const endpoint = tab === 'users' ? '/api/admin/users' : '/api/admin/messages';
        const setData = tab === 'users' ? setUsers : setMessages;

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || `Hiba a(z) ${tab} betöltésekor.`);
            setData(data[tab]);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData(activeTab);
    }, [fetchData, activeTab]);

    const handleApproveTeacher = async (userId) => {
        setSuccessMessage('');
        setError('');
        try {
            const response = await fetch(`${API_URL}/api/admin/approve-teacher/${userId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'A jóváhagyás sikertelen.');
            
            setSuccessMessage(data.message);
            fetchData('users'); // Frissítjük a felhasználói listát

        } catch (err) {
            setError(err.message);
        }
    };
    
    const renderContent = () => {
        if (isLoading) return <p>Adatok betöltése...</p>;

        if (activeTab === 'users') {
            return (
                <div className={styles.tableContainer}>
                    <table>
                        <thead>
                            <tr>
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
                                    <td>{user.username}</td>
                                    <td>{user.email}</td>
                                    <td>{user.role}</td>
                                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                    <td>
                                        {user.role === 'teacher' ? (
                                            user.is_approved ? 
                                            <span className={styles.approved}>Jóváhagyva</span> : 
                                            <span className={styles.pending}>Jóváhagyásra vár</span>
                                        ) : <span className={styles.notApplicable}>-</span>}
                                    </td>
                                    <td>
                                        {user.role === 'teacher' && !user.is_approved && (
                                            <button className={styles.approveButton} onClick={() => handleApproveTeacher(user.id)}>
                                                Jóváhagyás
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        if (activeTab === 'messages') {
             return (
                <div className={styles.tableContainer}>
                    <table>
                        <thead>
                            <tr>
                                <th>Dátum</th>
                                <th>Név</th>
                                <th>E-mail</th>
                                <th>Tárgy</th>
                                <th>Üzenet</th>
                            </tr>
                        </thead>
                        <tbody>
                            {messages.map(msg => (
                                <tr key={msg.id}>
                                    <td>{new Date(msg.created_at).toLocaleString()}</td>
                                    <td>{msg.name}</td>
                                    <td>{msg.email}</td>
                                    <td>{msg.subject}</td>
                                    <td className={styles.messageCell}>{msg.message}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.adminPanel}>
                <h1>Adminisztrációs Felület</h1>
                {error && <p className={styles.errorMessage}>{error}</p>}
                {successMessage && <p className={styles.successMessage}>{successMessage}</p>}

                <div className={styles.navTabs}>
                    <button onClick={() => setActiveTab('users')} className={activeTab === 'users' ? styles.activeTab : styles.tabButton}>
                        Felhasználók
                    </button>
                    <button onClick={() => setActiveTab('messages')} className={activeTab === 'messages' ? styles.activeTab : styles.tabButton}>
                        Üzenetek
                    </button>
                </div>
                
                {renderContent()}
            </div>
        </div>
    );
};

export default AdminPage;