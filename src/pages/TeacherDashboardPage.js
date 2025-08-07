import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './TeacherDashboardPage.module.css';

const API_URL = 'https://fokusz-mester-backend.onrender.com';

const TeacherDashboardPage = () => {
    const { user, token } = useAuth();
    
    // Állapot a meglévő osztályok tárolására
    const [myClasses, setMyClasses] = useState([]);
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);

    // Állapotok az űrlaphoz
    const [className, setClassName] = useState('');
    const [maxStudents, setMaxStudents] = useState(30);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoadingCreate, setIsLoadingCreate] = useState(false);

    // --- OSZTÁLYOK LEKÉRDEZÉSE FUNKCIÓ ---
    const fetchClasses = useCallback(async () => {
        if (!token) return;
        setIsLoadingClasses(true);
        try {
            const response = await fetch(`${API_URL}/api/teacher/classes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Hiba a lekérdezés során.');
            setMyClasses(data.classes);
        } catch (err) {
            setError('Hiba az osztályok betöltésekor: ' + err.message);
        } finally {
            setIsLoadingClasses(false);
        }
    }, [token]);

    // Az oldal betöltésekor lefuttatjuk az osztályok lekérdezését
    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);


    // --- OSZTÁLY LÉTREHOZÁSA FUNKCIÓ ---
    const handleCreateClass = async (e) => {
        e.preventDefault();
        setIsLoadingCreate(true);
        setMessage('');
        setError('');
        try {
            const response = await fetch(`${API_URL}/api/classes/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ className, maxStudents: Number(maxStudents) }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            setMessage(`Siker! Az új osztály kódja: ${data.class.class_code}.`);
            setClassName('');
            
            // SIKERES LÉTREHOZÁS UTÁN ÚJRA LEKÉRJÜK AZ OSZTÁLYLISTÁT!
            fetchClasses();

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoadingCreate(false);
        }
    };

    return (
        <div className={styles.dashboardContainer}>
            <header className={styles.header}>
                <h1>Tanári Irányítópult</h1>
                <p>Üdvözlünk, {user?.username}!</p>
            </header>
            
            <div className={styles.content}>
                <section>
                    <h2>Osztályaim</h2>
                    {isLoadingClasses ? (
                        <p>Osztályok betöltése...</p>
                    ) : myClasses.length === 0 ? (
                        <p>Jelenleg nincsenek osztályaid.</p>
                    ) : (
                        <ul className={styles.classList}>
                            {myClasses.map(cls => (
                                <li key={cls.id} className={styles.classItem}>
                                    <span className={styles.className}>{cls.class_name}</span>
                                    <span className={styles.classCode}>Kód: {cls.class_code}</span>
                                    {/* Ide jöhetnek majd további adatok, pl. diákszám */}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <hr className={styles.divider} />

                <section>
                    <h2>Új Osztály Létrehozása</h2>
                    <form onSubmit={handleCreateClass} className={styles.form}>
                        {/* ... (az űrlap input mezői változatlanok) ... */}
                        
                        {message && <p className={styles.successMessage}>{message}</p>}
                        {error && <p className={styles.errorMessage}>{error}</p>}

                        <button type="submit" className={styles.button} disabled={isLoadingCreate}>
                            {isLoadingCreate ? 'Létrehozás...' : 'Osztály Létrehozása'}
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
};

export default TeacherDashboardPage;