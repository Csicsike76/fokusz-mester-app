import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './TeacherDashboardPage.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const TeacherDashboardPage = () => {
    const { user, token } = useAuth();
    
    const [myClasses, setMyClasses] = useState([]);
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);
    const [className, setClassName] = useState('');
    const [maxStudents, setMaxStudents] = useState(30);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

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

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        if (queryParams.get("class_creation_success")) {
            setMessage("Sikeres fizetés! Az új osztályod létrejött és hamarosan megjelenik a listában.");
            setPaymentSuccess(true);
            window.history.replaceState(null, '', window.location.pathname);
        } else if (queryParams.get("class_creation_canceled")) {
            setError("A fizetési folyamatot megszakítottad. Az osztály nem jött létre.");
            window.history.replaceState(null, '', window.location.pathname);
        }
        
        fetchClasses();
    }, [fetchClasses, paymentSuccess]);

    const handleCreateClass = async (e) => {
        e.preventDefault();
        setIsRedirecting(true);
        setMessage('');
        setError('');
        try {
            const response = await fetch(`${API_URL}/api/teacher/create-class-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ className, maxStudents: Number(maxStudents) }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            if (data.url) {
                window.location.href = data.url;
            }

        } catch (err) {
            setError(err.message);
            setIsRedirecting(false);
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
                                    <div>
                                        <span className={styles.className}>{cls.class_name}</span>
                                        <span className={styles.studentCount}>
                                            {cls.student_count} / {cls.max_students} fő
                                        </span>
                                    </div>
                                    <span className={styles.classCode}>Kód: {cls.class_code}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <hr className={styles.divider} />

                <section>
                    <h2>Új Osztály Létrehozása</h2>
                    <form onSubmit={handleCreateClass} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label htmlFor="className">Osztály Neve:</label>
                            <input
                                type="text"
                                id="className"
                                value={className}
                                onChange={(e) => setClassName(e.target.value)}
                                placeholder="Pl.: 9.A Matek Csoport"
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="maxStudents">Maximális Létszám (5-30):</label>
                            <input
                                type="number"
                                id="maxStudents"
                                value={maxStudents}
                                onChange={(e) => setMaxStudents(e.target.value)}
                                min="5"
                                max="30"
                                required
                            />
                        </div>
                        
                        {message && <p className={styles.successMessage}>{message}</p>}
                        {error && <p className={styles.errorMessage}>{error}</p>}

                        <button type="submit" className={styles.button} disabled={isRedirecting}>
                            {isRedirecting ? 'Átirányítás a fizetéshez...' : 'Tovább a fizetéshez (4200 RON/év)'}
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
};

export default TeacherDashboardPage;