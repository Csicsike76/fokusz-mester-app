import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';
import { API_URL } from '../config/api';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'; // HOZZÁADVA

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const LoginPageContent = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const { login, handleGoogleLogin } = useAuth(); // HOZZÁADVA: handleGoogleLogin
    const navigate = useNavigate();
    const location = useLocation();

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
            if (!response.ok) throw new Error(data.message || 'Sikertelen bejelentkezés.');
            
            login(data.user, data.token);
            const from = location.state?.from || '/';
            navigate(from, { replace: true });

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // HOZZÁADVA: Google bejelentkezés sikerességét kezelő függvény
    const onGoogleSuccess = async (credentialResponse) => {
        setIsLoading(true);
        setError('');
        try {
            const { user, token } = await handleGoogleLogin(credentialResponse);
            login(user, token);
            const from = location.state?.from || '/';
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message || 'Hiba a Google bejelentkezés során.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.formContainer}>
                <h1>Bejelentkezés</h1>
                {redirectMessage && <p className={styles.infoMessage}>{redirectMessage}</p>}
                
                {/* HOZZÁADVA: Külső bejelentkezési lehetőségek */}
                <div className={styles.socialLoginContainer}>
                    {GOOGLE_CLIENT_ID && (
                        <GoogleLogin
                            onSuccess={onGoogleSuccess}
                            onError={() => setError('Google bejelentkezési hiba.')}
                            useOneTap
                        />
                    )}
                    {/* Apple gomb helye */}
                </div>

                <div className={styles.separator}><span>VAGY</span></div>
                
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

// HOZZÁADVA: Provider a Google kliens ID-val
const LoginPage = () => (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <LoginPageContent />
    </GoogleOAuthProvider>
);

export default LoginPage;