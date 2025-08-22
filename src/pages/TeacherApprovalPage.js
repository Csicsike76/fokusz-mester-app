// src/pages/TeacherApprovalPage.js

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './SimpleMessagePage.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://fokusz-mester-backend.onrender.com';

const TeacherApprovalPage = () => {
    const { userId } = useParams();
    const { auth } = useAuth();
    const navigate = useNavigate();

    const [message, setMessage] = useState('Azonosítási állapot ellenőrzése...');
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        // JAVÍTÁS: Ne csinálj semmit, amíg az auth állapot betöltődik
        if (auth.loading) {
            return;
        }

        const approveTeacher = async () => {
            // JAVÍTÁS: A 'role' ellenőrzése, nem egy fix email címé
            if (!auth.isAuthenticated || auth.user.role !== 'admin') {
                setMessage('A jóváhagyáshoz adminisztrátori fiókkal kell bejelentkezned. Átirányítás...');
                setIsError(true);
                setTimeout(() => navigate('/bejelentkezes'), 3000);
                return;
            }

            try {
                setMessage('Admin jogosultság rendben. Jóváhagyás küldése...');
                const response = await fetch(`${API_URL}/api/approve-teacher/${userId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${auth.token}`,
                    },
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    setMessage(data.message || 'A tanári fiók sikeresen jóváhagyva.');
                    setIsError(false);
                } else {
                    throw new Error(data.message || 'Hiba a jóváhagyás során.');
                }
            } catch (error) {
                setMessage(`Hiba: ${error.message}`);
                setIsError(true);
            }
        };

        approveTeacher();
    }, [userId, auth, navigate]);

    return (
        <div className={styles.container}>
            <div className={styles.messageBox}>
                <h1>Tanári Regisztráció Jóváhagyása</h1>
                {auth.loading ? (
                    <p>Kérlek, várj...</p>
                ) : (
                    <>
                        <p className={isError ? styles.errorText : styles.successText}>
                            {message}
                        </p>
                        <Link to={isError ? "/bejelentkezes" : "/"} className={styles.loginButton}>
                            {isError ? "Tovább a bejelentkezéshez" : "Vissza a főoldalra"}
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
};

export default TeacherApprovalPage;