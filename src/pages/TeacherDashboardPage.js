import React from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './TeacherDashboardPage.module.css'; // Létrehozzuk a saját stíluslapját

const TeacherDashboardPage = () => {
    const { user } = useAuth();

    return (
        <div className={styles.dashboardContainer}>
            <header className={styles.header}>
                <h1>Tanári Irányítópult</h1>
                <p>Üdvözlünk, {user?.username}!</p>
            </header>
            
            <div className={styles.content}>
                <h2>Osztályaim</h2>
                {/* Ide jön majd az osztályok listája */}
                <p>Jelenleg nincsenek osztályaid.</p>

                <hr className={styles.divider} />

                <h2>Új Osztály Létrehozása</h2>
                {/* Ide jön majd az űrlap az új osztály létrehozásához */}
                <p>Ez a funkció hamarosan elérhető lesz.</p>
            </div>
        </div>
    );
};

export default TeacherDashboardPage;