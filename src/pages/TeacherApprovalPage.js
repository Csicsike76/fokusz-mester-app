// src/pages/TeacherApprovalPage.js

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // 1. FONTOS: Behúzzuk az Auth kontextust
import styles from './SimpleMessagePage.module.css';

// Környezeti változóból olvassuk az API címet, de meghagyjuk a fix címet mint tartalék.
const API_URL = process.env.REACT_APP_API_URL || 'https://fokusz-mester-backend.onrender.com';

const TeacherApprovalPage = () => {
    const { userId } = useParams();
    const { auth } = useAuth(); // 2. Hozzáférés a bejelentkezési adatokhoz (token, user adatai)
    const navigate = useNavigate();

    const [message, setMessage] = useState('Jóváhagyás folyamatban...');
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const approveTeacher = async () => {
            // 3. ELLENŐRZÉS: Be van-e lépve a felhasználó ÉS admin-e?
            if (!auth.isAuthenticated || auth.user.role !== 'admin') {
                setMessage('A jóváhagyáshoz be kell jelentkezned adminisztrátori fiókkal.');
                setIsError(true);
                setIsLoading(false);
                // 3 másodperc után átirányítás a bejelentkezési oldalra
                setTimeout(() => navigate('/bejelentkezes'), 3000);
                return; // A funkció futása itt leáll
            }

            // Ha a fenti ellenőrzés sikeres, akkor elküldjük a kérést
            try {
                const response = await fetch(`${API_URL}/api/approve-teacher/${userId}`, {
                    method: 'POST', // 4. JAVÍTÁS: GET helyett POST metódust használunk
                    headers: {
                        'Content-Type': 'application/json',
                        // 5. LEGFONTOSABB RÉSZ: Elküldjük a tokent az azonosításhoz
                        'Authorization': `Bearer ${auth.token}`,
                    },
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    setMessage(data.message);
                    setIsError(false);
                } else {
                    throw new Error(data.message || 'Ismeretlen hiba történt.');
                }
            } catch (error) {
                setMessage(`Hiba: ${error.message}`);
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };

        approveTeacher();
    }, [userId, auth, navigate]); // Az useEffect figyel az `auth` állapot változására is

    return (
        <div className={styles.container}>
            <div className={styles.messageBox}>
                <h1>Tanári Regisztráció Jóváhagyása</h1>
                {isLoading ? (
                    <p>Kérlek, várj...</p>
                ) : (
                    <>
                        <p className={isError ? styles.errorText : styles.successText}>
                            {message}
                        </p>
                        <Link to="/" className={styles.loginButton}>
                            Vissza a főoldalra
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
};

export default TeacherApprovalPage;