import React, { useState } from 'react';
import styles from './LoginPage.module.css';

const LoginPage = () => {
    // Állapot (state) az űrlap adatok tárolására
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false,
    });

    // Kezelő függvény az input mezők változásához
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    // Kezelő függvény a "Bejelentkezés" gomb lenyomásakor
    const handleSubmit = (e) => {
        e.preventDefault(); // Megakadályozza az oldal újratöltését

        const loginData = {
            email: formData.email,
            password: formData.password,
        };

        console.log("Bejelentkezési adatok a szervernek:", loginData);
        // TODO: Itt kell majd meghívni a fetch/axios kérést, ami elküldi
        // az adatokat a backend API-nak a hitelesítéshez.
        alert("Bejelentkezés sikeres! (Konzolban látod az adatokat)");
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
                    
                    <button type="submit" className={styles.submitButton}>Bejelentkezés</button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;