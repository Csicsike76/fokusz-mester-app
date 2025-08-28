// src/pages/ContactPage.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './ContactPage.module.css';
import { API_URL } from '../config/api';

const ContactPage = () => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [status, setStatus] = useState({ message: '', type: '' });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.username || '',
                email: user.email || ''
            }));
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus({ message: '', type: '' });

        try {
            const response = await fetch(`${API_URL}/api/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Hiba történt az üzenet küldésekor.');
            }

            setStatus({ message: data.message, type: 'success' });
            if (user) {
                setFormData(prev => ({ ...prev, subject: '', message: '' }));
            } else {
                setFormData({ name: '', email: '', subject: '', message: '' });
            }

        } catch (error) {
            setStatus({ message: error.message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.formWrapper}>
                <h1>Kapcsolatfelvétel</h1>
                <p>Kérdése van, hibát talált, vagy csak visszajelzést küldene? Töltse ki az alábbi űrlapot!</p>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="name">Név</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            disabled={!!user}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="email">E-mail cím</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            disabled={!!user}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="subject">Tárgy</label>
                        <input
                            type="text"
                            id="subject"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="message">Üzenet</label>
                        <textarea
                            id="message"
                            name="message"
                            rows="6"
                            value={formData.message}
                            onChange={handleChange}
                            required
                        ></textarea>
                    </div>

                    {status.message && (
                        <p className={styles[status.type === 'success' ? 'successMessage' : 'errorMessage']}>
                            {status.message}
                        </p>
                    )}

                    <button type="submit" disabled={isLoading}>
                        {isLoading ? 'Küldés...' : 'Üzenet küldése'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ContactPage;