import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';
import { API_URL } from '../config/api'; // JAVÍTÁS: A központi konfiguráció használata

const LoginPage = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const { login } = useAuth(); 
    const navigate = useNavigate();
    const location = useLocation();

    // Ha átirányításból érkezik, az üzenet megjelenítése
    const redirectMessage = location.state?.message;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({ ...prevData, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email, password: formData.password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Sikertelen bejelentkezés.');
            }
            
            login(data.user, data.token);

            // Átirányítás oda, ahonnan a felhasználó jött, vagy a főoldalra
            const from = location.state?.from || '/';
            navigate(from, { replace: true });

        } catch (err) {
            setError(err.message);
            console.error("Bejelentkezési hiba:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.formContainer}>
                <h1>Bejelentkezés</h1>
                {redirectMessage && <p className={styles.infoMessage}>{redirectMessage}</p>}
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="email">E-mail cím</label>
                        <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="password">Jelszó</label>
                        <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required />
                    </div>

                    <div className={styles.extraOptions}>
                        <div className={styles.checkboxGroup}>
                            <input type="checkbox" id="rememberMe" name="rememberMe" />
                            <label htmlFor="rememberMe">Emlékezz rám</label>
                        </div>
                        <a href="/elfelejtett-jelszo">Elfelejtetted a jelszavad?</a>
                    </div>
                    
                    {error && <p className={styles.errorMessage}>{error}</p>}

                    <button type="submit" className={styles.submitButton} disabled={isLoading}>
                        {isLoading ? 'Bejelentkezés...' : 'Bejelentkezés'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;