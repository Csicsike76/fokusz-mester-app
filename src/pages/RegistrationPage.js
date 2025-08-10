import React, { useState, useEffect } from 'react';
import styles from './RegistrationPage.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

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
        specialCode: '',
        termsAccepted: false,
    });
    
    // ÚJ: Állapot a jelszóval kapcsolatos hibák tárolására
    const [passwordError, setPasswordError] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // ÚJ: Figyeljük a jelszó mezők változását, és azonnal validálunk
    useEffect(() => {
        // Jelszó erősségének ellenőrzése
        if (formData.password) {
            const hasLowercase = /[a-z]/.test(formData.password);
            const hasUppercase = /[A-Z]/.test(formData.password);
            const hasNumber = /[0-9]/.test(formData.password);
            const hasSymbol = /[^A-Za-z0-9]/.test(formData.password);
            const isLongEnough = formData.password.length >= 8;

            if (!isLongEnough || !hasLowercase || !hasUppercase || !hasNumber || !hasSymbol) {
                setPasswordError('A jelszónak legalább 8 karakter hosszúnak kell lennie, és tartalmaznia kell kisbetűt, nagybetűt, számot és speciális karaktert.');
            } else {
                setPasswordError('');
            }
        } else {
            setPasswordError('');
        }

        // Jelszó egyezésének ellenőrzése
        if (formData.passwordConfirm && formData.password !== formData.passwordConfirm) {
            if (!passwordError) { // Csak akkor írjuk felül, ha nincs már erősségi hiba
                setPasswordError('A két jelszó nem egyezik!');
            }
        }

    }, [formData.password, formData.passwordConfirm, passwordError]);


    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({ ...prevData, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleRoleChange = (e) => { setRole(e.target.value); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        // Az űrlap elküldése előtt is ellenőrzünk
        if (passwordError) {
            setError(passwordError);
            return;
        }
        if (formData.password !== formData.passwordConfirm) {
            setError("A jelszavak nem egyeznek!");
            return;
        }
        if (!formData.termsAccepted) {
            setError("El kell fogadnod a felhasználási feltételeket!");
            return;
        }

        setIsLoading(true);

        const registrationData = {
            role,
            username: formData.username,
            email: formData.email,
            password: formData.password,
            referralCode: formData.referralCode.trim(),
            vipCode: formData.vipCode.trim(),
            classCode: formData.classCode.trim(),
            specialCode: formData.specialCode.trim(),
        };

        try {
            const response = await fetch(`${API_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registrationData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Ismeretlen hiba történt.');
            }

            setMessage(data.message);
            setFormData({
                username: '', email: '', password: '', passwordConfirm: '',
                vipCode: '', referralCode: '', classCode: '', specialCode: '', termsAccepted: false
            });
            setRole('student');

        } catch (err) {
            setError(err.message);
            console.error("Regisztrációs hiba:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.formContainer}>
                <h1>Regisztráció</h1>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label>Szerepkör kiválasztása:</label>
                        <div className={styles.roleSelection}>
                            <label><input type="radio" value="student" checked={role === 'student'} onChange={handleRoleChange} /> Tanuló</label>
                            <label><input type="radio" value="teacher" checked={role === 'teacher'} onChange={handleRoleChange} /> Tanár</label>
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
                    {/* ÚJ: A jelszó hibaüzenet megjelenítése */}
                    {passwordError && <p className={styles.errorMessage}>{passwordError}</p>}
                    
                    {role === 'teacher' && (
                        <div className={`${styles.formGroup} ${styles.conditionalField}`}>
                            <label htmlFor="vipCode">VIP kód (csak tanároknak)</label>
                            <input type="text" id="vipCode" name="vipCode" value={formData.vipCode} onChange={handleChange} required />
                        </div>
                    )}
                    {role === 'student' && (
                        <div className={`${styles.formGroup} ${styles.conditionalField}`}>
                            <label htmlFor="classCode">Osztálykód (ha van)</label>
                            <input type="text" id="classCode" name="classCode" value={formData.classCode} onChange={handleChange} />
                        </div>
                    )}
                    <div className={styles.formGroup}>
                        <label htmlFor="referralCode">Ajánlókód (opcionális)</label>
                        <input type="text" id="referralCode" name="referralCode" value={formData.referralCode} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="specialCode">Speciális Hozzáférési Kód (ha van)</label>
                        <input type="text" id="specialCode" name="specialCode" value={formData.specialCode} onChange={handleChange} />
                    </div>
                    <div className={`${styles.formGroup} ${styles.checkboxGroup}`}>
                        <input type="checkbox" id="termsAccepted" name="termsAccepted" checked={formData.termsAccepted} onChange={handleChange} />
                        <label htmlFor="termsAccepted">Elfogadom az Általános Szerződési Feltételeket</label>
                    </div>

                    {message && <p className={styles.successMessage}>{message}</p>}
                    {error && <p className={styles.errorMessage}>{error}</p>}

                    {/* MÓDOSÍTVA: A gomb le van tiltva, ha hiba van a jelszóval */}
                    <button type="submit" className={styles.submitButton} disabled={isLoading || passwordError}>
                        {isLoading ? 'Regisztrálás...' : 'Regisztrálás'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RegistrationPage;