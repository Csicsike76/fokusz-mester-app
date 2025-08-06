import React, { useState } from 'react';
import styles from './RegistrationPage.module.css';

// A backend URL-jét egy változóba tesszük
const API_URL = 'https://fokusz-mester-backend.onrender.com';

const RegistrationPage = () => {
    const [role, setRole] = useState('student');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        passwordConfirm: '',
        vipCode: '',
        referralCode: '',
        classCode: '',
        termsAccepted: false,
    });
    // Állapotok a felhasználói visszajelzéshez
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({ ...prevData, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleRoleChange = (e) => { setRole(e.target.value); };

    // A TELJES, JAVÍTOTT handleSubmit FÜGGVÉNY
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (formData.password !== formData.passwordConfirm) {
            setError("A jelszavak nem egyeznek!");
            return;
        }
        if (!formData.termsAccepted) {
            setError("El kell fogadnod a felhasználási feltételeket!");
            return;
        }

        setIsLoading(true); // Töltés jelzése

        const registrationData = {
            role,
            username: formData.username,
            email: formData.email,
            password: formData.password,
            referralCode: formData.referralCode,
            ...(role === 'teacher' && { vipCode: formData.vipCode }),
            ...((role === 'student' || role === 'class') && { classCode: formData.classCode }),
        };

        try {
            const response = await fetch(`${API_URL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(registrationData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Ismeretlen hiba történt.');
            }

            // Sikeres regisztráció: üzenet beállítása és űrlap ürítése
            setMessage(data.message);
            setFormData({
                username: '', email: '', password: '', passwordConfirm: '',
                vipCode: '', referralCode: '', classCode: '', termsAccepted: false
            });
            setRole('student');

        } catch (err) {
            // Hiba esetén a hibaüzenet beállítása
            setError(err.message);
            console.error("Regisztrációs hiba:", err);
        } finally {
            // A töltés jelzésének leállítása, akár sikeres, akár nem
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.formContainer}>
                <h1>Regisztráció</h1>
                <form onSubmit={handleSubmit}>
                    {/* ... A form többi része változatlan ... */}
                    <div className={styles.formGroup}>
                        <label>Szerepkör kiválasztása:</label>
                        <div className={styles.roleSelection}>
                            <label><input type="radio" value="student" checked={role === 'student'} onChange={handleRoleChange} /> Tanuló</label>
                            <label><input type="radio" value="teacher" checked={role === 'teacher'} onChange={handleRoleChange} /> Tanár</label>
                            <label><input type="radio" value="class" checked={role === 'class'} onChange={handleRoleChange} /> Osztályregisztráció</label>
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="username">Felhasználónév</label>
                        <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="email">E-mail cím</label>
                        <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="password">Jelszó</label>
                        <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="passwordConfirm">Jelszó megerősítése</label>
                        <input type="password" id="passwordConfirm" name="passwordConfirm" value={formData.passwordConfirm} onChange={handleChange} required />
                    </div>
                    {role === 'teacher' && (
                        <div className={`${styles.formGroup} ${styles.conditionalField}`}>
                            <label htmlFor="vipCode">VIP kód (csak tanároknak)</label>
                            <input type="text" id="vipCode" name="vipCode" value={formData.vipCode} onChange={handleChange} required />
                        </div>
                    )}
                    {(role === 'student' || role === 'class') && (
                        <div className={`${styles.formGroup} ${styles.conditionalField}`}>
                            <label htmlFor="classCode">{role === 'class' ? 'Add meg a létrehozandó osztálykódot!' : 'Osztálykód (ha van)'}</label>
                            <input type="text" id="classCode" name="classCode" value={formData.classCode} onChange={handleChange} />
                        </div>
                    )}
                    <div className={styles.formGroup}>
                        <label htmlFor="referralCode">Ajánlókód (opcionális)</label>
                        <input type="text" id="referralCode" name="referralCode" value={formData.referralCode} onChange={handleChange} />
                    </div>
                    <div className={`${styles.formGroup} ${styles.checkboxGroup}`}>
                        <input type="checkbox" id="termsAccepted" name="termsAccepted" checked={formData.termsAccepted} onChange={handleChange} />
                        <label htmlFor="termsAccepted">Elfogadom az Általános Szerződési Feltételeket</label>
                    </div>

                    {/* Visszajelző üzenetek */}
                    {message && <p className={styles.successMessage}>{message}</p>}
                    {error && <p className={styles.errorMessage}>{error}</p>}

                    <button type="submit" className={styles.submitButton} disabled={isLoading}>
                        {isLoading ? 'Regisztrálás...' : 'Regisztrálás'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RegistrationPage;