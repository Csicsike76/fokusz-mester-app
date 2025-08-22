// src/pages/TeacherApprovalPage.js

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './SimpleMessagePage.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://fokusz-mester-backend.onrender.com';
const MY_EMAIL = process.env.REACT_APP_MY_TEACHER_EMAIL || '19perro76@gmail.com';

const TeacherApprovalPage = () => {
    const { userId } = useParams();
    const { auth } = useAuth(); 
    const navigate = useNavigate();

    const [message, setMessage] = useState('Jóváhagyás folyamatban...');
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const approveTeacher = async () => {
            if (!auth?.isAuthenticated || auth?.user?.email !== MY_EMAIL) {
                setMessage('A jóváhagyáshoz a megfelelő e-mail címről kell bejelentkezned.');
                setIsError(true);
                setIsLoading(false);
                setTimeout(() => navigate('/bejelentkezes'), 3000);
                return;
            }

            try {
                const response = await fetch(`${API_URL}/api/approve-teacher/${userId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${auth.token}`,
                    },
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    setMessage(data.message || 'A jóváhagyás sikeresen megtörtént.');
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
    }, [userId, auth, navigate]);

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
