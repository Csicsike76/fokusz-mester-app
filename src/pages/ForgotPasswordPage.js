// src/pages/ForgotPasswordPage.js

import React, { useState } from 'react';
import styles from './ForgotPasswordPage.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await fetch(`${API_URL}/api/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Hiba történt.');
            }

            setMessage(data.message);
            setEmail('');

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.formContainer}>
                <h1>Elfelejtett jelszó</h1>
                <p style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    Add meg a regisztrált e-mail címedet, és küldünk egy linket az új jelszó beállításához.
                </p>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="email">E-mail cím</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    {message && <p className={styles.successMessage}>{message}</p>}
                    {error && <p className={styles.errorMessage}>{error}</p>}

                    <button type="submit" className={styles.submitButton} disabled={isLoading}>
                        {isLoading ? 'Küldés...' : 'Visszaállító link küldése'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;