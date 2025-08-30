import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Navbar.module.css';
import { FaBell } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || '';

const UserMenu = () => {
    const { user, logout, token } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!token) return;
        try {
            const response = await fetch(`${API_URL}/api/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setNotifications(data.notifications);
            }
        } catch (error) {
            console.error("Hiba az értesítések lekérdezésekor:", error);
        }
    }, [token]);

    useEffect(() => {
        if (user) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 60000); 
            return () => clearInterval(interval);
        }
    }, [user, fetchNotifications]);

    const handleBellClick = async () => {
        const currentlyOpen = isNotificationOpen;
        setIsNotificationOpen(!currentlyOpen);
        
        const hasUnread = notifications.some(n => !n.read);
        if (!currentlyOpen && hasUnread) {
            try {
                await fetch(`${API_URL}/api/notifications/mark-read`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            } catch (error) {
                console.error("Hiba az értesítések olvasottá tételekor:", error);
            }
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    if (!user) {
        return (
            <>
                <Link to="/bejelentkezes" className={styles.loginButton}>Bejelentkezés</Link>
                <Link to="/regisztracio" className={styles.authButton}>Regisztráció</Link>
            </>
        );
    }

    return (
        <>
            <span className={styles.welcomeUser}>Üdv, {user.username}!</span>
            
            <div className={styles.notificationContainer}>
                <button onClick={handleBellClick} className={styles.notificationBell}>
                    <FaBell />
                    {unreadCount > 0 && <span className={styles.notificationBadge}>{unreadCount}</span>}
                </button>
                {isNotificationOpen && (
                    <div className={styles.notificationPanel}>
                        {notifications.length > 0 ? (
                            notifications.map(notif => (
                                <div key={notif.id} className={`${styles.notificationItem} ${!notif.read ? styles.unread : ''}`}>
                                    <strong>{notif.title}</strong>
                                    <p>{notif.message}</p>
                                    <small>{new Date(notif.sent_at).toLocaleString('hu-HU')}</small>
                                </div>
                            ))
                        ) : (
                            <div className={styles.notificationItem}>Nincsenek új értesítéseid.</div>
                        )}
                    </div>
                )}
            </div>

            <button onClick={logout} className={styles.logoutButton}>Kijelentkezés</button>
        </>
    );
};

export default UserMenu;