import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './TeacherDashboardPage.module.css';

const API_URL = 'https://fokusz-mester-backend.onrender.com';

const TeacherDashboardPage = () => {
    const { user, token } = useAuth(); // A 'token'-re is szükségünk lesz a hitelesített kéréshez
    
    // Állapotok az űrlaphoz
    const [className, setClassName] = useState('');
    const [maxStudents, setMaxStudents] = useState(30);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // TODO: Itt kell majd lekérni és tárolni a tanár meglévő osztályait
    // const [myClasses, setMyClasses] = useState([]);

    const handleCreateClass = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await fetch(`${API_URL}/api/classes/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // A JWT tokent a 'Authorization' headerben küldjük el!
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ className, maxStudents: Number(maxStudents) }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Hiba történt az osztály létrehozása során.');
            }

            setMessage(`Siker! Az új osztály kódja: ${data.class.class_code}. Oszd meg a diákjaiddal!`);
            setClassName(''); // Ürítjük az űrlapot
            // TODO: Itt kellene frissíteni az 'myClasses' listát
            
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
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
                    <p>Jelenleg nincsenek osztályaid.</p>
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
                            <label htmlFor="maxStudents">Maximális Létszám (5-50):</label>
                            <input
                                type="number"
                                id="maxStudents"
                                value={maxStudents}
                                onChange={(e) => setMaxStudents(e.target.value)}
                                min="5"
                                max="50"
                                required
                            />
                        </div>
                        
                        {/* Visszajelző üzenetek */}
                        {message && <p className={styles.successMessage}>{message}</p>}
                        {error && <p className={styles.errorMessage}>{error}</p>}

                        <button type="submit" className={styles.button} disabled={isLoading}>
                            {isLoading ? 'Létrehozás...' : 'Osztály Létrehozása'}
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
};

export default TeacherDashboardPage;