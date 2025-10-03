import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './Navbar.module.css';
import { FaBell } from 'react-icons/fa';
import { API_URL } from '../../config/api';

const NotificationBell = () => {
    const { user, token } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const bellRef = useRef(null);
    const panelRef = useRef(null);

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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (bellRef.current && !bellRef.current.contains(event.target) &&
                panelRef.current && !panelRef.current.contains(event.target)) {
                setIsNotificationOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    if (!user) return null; 

    return (
        <div className={styles.notificationContainer}>
            <button onClick={handleBellClick} className={styles.notificationBell} ref={bellRef}>
                <FaBell />
                {unreadCount > 0 && <span className={styles.notificationBadge}>{unreadCount}</span>}
            </button>
            {isNotificationOpen && (
                <div className={styles.notificationPanel} ref={panelRef}>
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
    );
};

export default NotificationBell;