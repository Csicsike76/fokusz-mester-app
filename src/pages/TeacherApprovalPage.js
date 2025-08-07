import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './SimpleMessagePage.module.css'; // Ugyanazt a stíluslapot használjuk

const API_URL = 'https://fokusz-mester-backend.onrender.com';

const TeacherApprovalPage = () => {
    const { userId } = useParams(); // Kiolvassuk az user ID-t az URL-ből
    const [message, setMessage] = useState('Jóváhagyás folyamatban...');
    const [error, setError] = useState(false);

    useEffect(() => {
        if (userId) {
            const approveTeacher = async () => {
                try {
                    const response = await fetch(`${API_URL}/api/approve-teacher/${userId}`);
                    
                    if (!response.ok) {
                        throw new Error('A jóváhagyás sikertelen.');
                    }
                    
                    setMessage('A tanári fiók sikeresen aktiválva lett.');
                    setError(false);

                } catch (err) {
                    setMessage('A jóváhagyási link érvénytelen vagy hiba történt.');
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