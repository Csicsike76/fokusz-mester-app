import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Új import az átirányításhoz
import { useAuth } from '../context/AuthContext'; // A központi állapot (Context) importálása
import styles from './LoginPage.module.css';

// A backend API URL-jét egy konstansban tároljuk a könnyebb módosíthatóság érdekében.
const API_URL = 'https://fokusz-mester-backend.onrender.com';

const LoginPage = () => {
    // Állapotok (state-ek) az űrlap adatainak és a visszajelzéseknek
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Behúzzuk a "login" függvényt a központi AuthContext-ből
    const { login } = useAuth(); 
    // Behúzzuk a "navigate" függvényt az átirányításhoz
    const navigate = useNavigate();

    // Ez a függvény frissíti az állapotot, ahogy a felhasználó gépel
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({ ...prevData, [name]: value }));
    };

    // Ez a függvény fut le, amikor a felhasználó a "Bejelentkezés" gombra kattint
    const handleSubmit = async (e) => {
        e.preventDefault(); // Megakadályozzuk az oldal újratöltését
        setError(''); // Töröljük a korábbi hibaüzeneteket
        setIsLoading(true); // Elindítjuk a "töltés" állapotot

        try {
            // Elküldjük az adatokat a backend /api/login végpontjára
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email, password: formData.password }),
            });

            // Beolvassuk a backend válaszát
            const data = await response.json();

            // Ha a backend hibát jelzett (pl. rossz jelszó), akkor hibát dobunk
            if (!response.ok) {
                throw new Error(data.message || 'Sikertelen bejelentkezés.');
            }
            
            // Ha a bejelentkezés sikeres:
            // 1. Meghívjuk a központi "login" függvényt a kapott felhasználói adatokkal és a tokennel.
            //    Ez frissíti a globális állapotot ÉS elmenti az adatokat a localStorage-ba.
            login(data.user, data.token);

            // 2. Átirányítjuk a felhasználót a főoldalra ('/').
            navigate('/');

        } catch (err) {
            // Hiba esetén beállítjuk a hibaüzenetet, hogy megjelenjen a felhasználónak
            setError(err.message);
            console.error("Bejelentkezési hiba:", err);
        } finally {
            // Befejezzük a "töltés" állapotot, akár sikeres volt a kérés, akár nem
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
                            <input type="checkbox" id="rememberMe" name="rememberMe" />
                            <label htmlFor="rememberMe">Emlékezz rám</label>
                        </div>
                        <a href="/elfelejtett-jelszo">Elfelejtetted a jelszavad?</a>
                    </div>
                    
                    {/* Itt jelenik meg a hibaüzenet, ha van */}
                    {error && <p className={styles.errorMessage}>{error}</p>}

                    {/* A gomb letiltva, amíg a bejelentkezés folyamatban van */}
                    <button type="submit" className={styles.submitButton} disabled={isLoading}>
                        {isLoading ? 'Bejelentkezés...' : 'Bejelentkezés'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;