import React, { useState } from 'react';
import styles from './LoginPage.module.css';

const API_URL = 'https://fokusz-mester-backend.onrender.com';

const LoginPage = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false,
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({ ...prevData, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Sikertelen bejelentkezés.');
            }

            // SIKERES BEJELENTKEZÉS
            setMessage(data.message);
            console.log('Kapott token:', data.token);
            console.log('Felhasználói adatok:', data.user);

            // A tokent elmentjük a böngésző localStorage-ába.
            // Így az oldal újratöltése után is bejelentkezve marad a felhasználó.
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // TODO: Itt lehetne a felhasználót átirányítani a főoldalra
            // pl. window.location.href = '/dashboard';
            
            // Ürítjük az űrlapot
            setFormData({ email: '', password: '', rememberMe: false });

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
                            <input type="checkbox" id="rememberMe" name="rememberMe" checked={formData.rememberMe} onChange={handleChange} />
                            <label htmlFor="rememberMe">Emlékezz rám</label>
                        </div>
                        <a href="/elfelejtett-jelszo">Elfelejtetted a jelszavad?</a>
                    </div>
                    
                    {/* Visszajelző üzenetek */}
                    {message && <p className={styles.successMessage}>{message}</p>}
                    {error && <p className={styles.errorMessage}>{error}</p>}

                    <button type="submit" className={styles.submitButton} disabled={isLoading}>
                        {isLoading ? 'Bejelentkezés...' : 'Bejelentkezés'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// Adjunk hozzá stílusokat a visszajelző üzenetekhez a LoginPage.module.css-hez
// Ez a rész ugyanaz, mint a regisztrációnál, de ide is be kell másolni.
const LoginPageStyles = `
.successMessage {
    color: #2ecc71;
    background-color: rgba(46, 204, 113, 0.1);
    padding: 0.75rem;
    border-radius: 5px;
    text-align: center;
    margin-bottom: 1.5rem;
}
.errorMessage {
    color: #e74c3c;
    background-color: rgba(231, 76, 60, 0.1);
    padding: 0.75rem;
    border-radius: 5px;
    text-align: center;
    margin-bottom: 1.5rem;
}
.submitButton:disabled {
    background-color: #95a5a6;
    cursor: not-allowed;
}
`;

// Dinamikusan hozzáadjuk a stílusokat a dokumentumhoz
const styleSheet = document.createElement("style");
styleSheet.innerText = LoginPageStyles.replace(/\./g, `.${styles.LoginPage} .`);
document.head.appendChild(styleSheet);


export default LoginPage;