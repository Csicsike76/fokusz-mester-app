import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './SimpleMessagePage.module.css';

const API_URL = 'https://fokusz-mester-backend.onrender.com';

const TeacherApprovalPage = () => {
    const { userId } = useParams();
    const [message, setMessage] = useState('Jóváhagyás folyamatban...');
    const [error, setError] = useState(false);

    useEffect(() => {
        if (userId) {
            const approveTeacher = async () => {
                try {
                    // A fetch hívás a backend API-ra mutat
                    const response = await fetch(`${API_URL}/api/approve-teacher/${userId}`);
                    const data = await response.json();
                    
                    if (!response.ok || !data.success) {
                        throw new Error(data.message || 'A jóváhagyás sikertelen.');
                    }
                    
                    setMessage(data.message);
                    setError(false);

                } catch (err) {
                    setMessage(err.message);
                    setError(true);
                }
            };
            approveTeacher();
        }
    }, [userId]);

    return (
        <div className={styles.container}>
            <div className={`${styles.messageBox} ${error ? styles.error : styles.success}`}>
                <h1>{error ? 'Hiba' : 'Siker!'}</h1>
                <p>{message}</p>
                <Link to="/" className={styles.button}>
                    Vissza a főoldalra
                </Link>
            </div>
        </div>
    );
};

export default TeacherApprovalPage;