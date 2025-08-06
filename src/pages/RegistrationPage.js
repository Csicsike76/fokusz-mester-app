import React, { useState } from 'react';
import styles from './RegistrationPage.module.css';

const RegistrationPage = () => {
    // Állapot (state) a szerepkör tárolására
    const [role, setRole] = useState('student'); // Alapértelmezett: Tanuló

    // Állapot a többi űrlap adat tárolására
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

    // Kezelő függvény az input mezők változásához
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    // Kezelő függvény a szerepkör változásához
    const handleRoleChange = (e) => {
        setRole(e.target.value);
    };

    // Kezelő függvény a "Regisztrálás" gomb lenyomásakor
    const handleSubmit = (e) => {
        e.preventDefault(); // Megakadályozza az oldal újratöltését
        
        if (formData.password !== formData.passwordConfirm) {
            alert("A jelszavak nem egyeznek!");
            return;
        }

        if (!formData.termsAccepted) {
            alert("El kell fogadnod a felhasználási feltételeket!");
            return;
        }

        // Itt gyűjtjük össze a releváns adatokat a szerepkör alapján
        const registrationData = {
            role,
            username: formData.username,
            email: formData.email,
            password: formData.password,
            referralCode: formData.referralCode,
            // Csak akkor küldjük a kódokat, ha a szerepkör releváns
            ...(role === 'teacher' && { vipCode: formData.vipCode }),
            ...((role === 'student' || role === 'class') && { classCode: formData.classCode }),
        };

        console.log("Regisztrációs adatok a szervernek:", registrationData);
        // TODO: Itt kell majd meghívni a fetch/axios kérést, ami elküldi
        // az adatokat a backend API-nak.
        alert("Regisztráció sikeres! (Konzolban látod az adatokat)");
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.formContainer}>
                <h1>Regisztráció</h1>
                <form onSubmit={handleSubmit}>
                    {/* Szerepkör kiválasztása */}
                    <div className={styles.formGroup}>
                        <label>Szerepkör kiválasztása:</label>
                        <div className={styles.roleSelection}>
                            <label><input type="radio" value="student" checked={role === 'student'} onChange={handleRoleChange} /> Tanuló</label>
                            <label><input type="radio" value="teacher" checked={role === 'teacher'} onChange={handleRoleChange} /> Tanár</label>
                            <label><input type="radio" value="class" checked={role === 'class'} onChange={handleRoleChange} /> Osztályregisztráció</label>
                        </div>
                    </div>

                    {/* Alap mezők */}
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

                    {/* DINAMIKUS MEZŐK A SZEREPKÖR ALAPJÁN */}
                    
                    {/* VIP Kód (csak tanárnál) */}
                    {role === 'teacher' && (
                        <div className={`${styles.formGroup} ${styles.conditionalField}`}>
                            <label htmlFor="vipCode">VIP kód (csak tanároknak)</label>
                            <input type="text" id="vipCode" name="vipCode" value={formData.vipCode} onChange={handleChange} required />
                        </div>
                    )}
                    
                    {/* Osztálykód (tanulónál és osztályregisztrációnál) */}
                    {(role === 'student' || role === 'class') && (
                        <div className={`${styles.formGroup} ${styles.conditionalField}`}>
                            <label htmlFor="classCode">{role === 'class' ? 'Add meg a létrehozandó osztálykódot!' : 'Osztálykód (ha van)'}</label>
                            <input type="text" id="classCode" name="classCode" value={formData.classCode} onChange={handleChange} />
                        </div>
                    )}
                    
                    {/* Ajánlókód (opcionális, mindig látszik) */}
                    <div className={styles.formGroup}>
                        <label htmlFor="referralCode">Ajánlókód (opcionális)</label>
                        <input type="text" id="referralCode" name="referralCode" value={formData.referralCode} onChange={handleChange} />
                    </div>

                    {/* ÁSZF */}
                    <div className={`${styles.formGroup} ${styles.checkboxGroup}`}>
                        <input type="checkbox" id="termsAccepted" name="termsAccepted" checked={formData.termsAccepted} onChange={handleChange} />
                        <label htmlFor="termsAccepted">Elfogadom az Általános Szerződési Feltételeket</label>
                    </div>

                    <button type="submit" className={styles.submitButton}>Regisztrálás</button>
                </form>
            </div>
        </div>
    );
};

export default RegistrationPage;