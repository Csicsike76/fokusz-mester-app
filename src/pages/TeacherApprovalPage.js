import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './SimpleMessagePage.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://fokusz-mester-backend.onrender.com';

const TeacherApprovalPage = () => {
    const { userId } = useParams();
    const { auth } = useAuth();
    const navigate = useNavigate();

    const [message, setMessage] = useState('Jóváhagyás folyamatban...');
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Csak akkor fusson le a logika, ha van userId és az auth állapot már betöltődött
        if (!userId || auth.loading) {
            return;
        }

        const approveTeacher = async () => {
            if (!auth.isAuthenticated || auth.user.role !== 'admin') {
                setMessage('A jóváhagyáshoz be kell jelentkezned adminisztrátori fiókkal. Átirányítás a bejelentkezéshez...');
                setIsError(true);
                setIsLoading(false);
                setTimeout(() => navigate('/bejelentkezes'), 3000);
                return;
            }

            try {
                setMessage('Adminisztrátori jogosultság ellenőrizve. Jóváhagyás küldése...');
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
                    throw new Error(data.message || 'Ismeretlen hiba történt a jóváhagyás során.');
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