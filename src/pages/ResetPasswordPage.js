// src/pages/ResetPasswordPage.js

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './ForgotPasswordPage.module.css'; // Ugyanazt a stílust használjuk

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const ResetPasswordPage = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== passwordConfirm) {
            setError('A két jelszó nem egyezik!');
            return;
        }

        setIsLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await fetch(`${API_URL}/api/reset-password/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Hiba történt.');
            }

            setMessage(data.message);
            setTimeout(() => navigate('/bejelentkezes'), 3000); // 3 másodperc után átirányítás

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.formContainer}>
                <h1>Új jelszó beállítása</h1>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="password">Új jelszó</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="passwordConfirm">Új jelszó megerősítése</label>
                        <input
                            type="password"
                            id="passwordConfirm"
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                            required
                        />
                    </div>

                    {message && <p className={styles.successMessage}>{message}</p>}
                    {error && <p className={styles.errorMessage}>{error}</p>}

                    <button type="submit" className={styles.submitButton} disabled={isLoading || message}>
                        {isLoading ? 'Mentés...' : 'Új jelszó mentése'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPasswordPage;