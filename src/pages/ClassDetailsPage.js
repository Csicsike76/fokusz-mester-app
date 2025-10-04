// src/pages/ClassDetailsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './ClassDetailsPage.module.css'; // Fontos, hogy importálja a stílusokat

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const ClassDetailsPage = () => {
    const { classId } = useParams();
    const { token } = useAuth();
    const navigate = useNavigate();

    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [progress, setProgress] = useState([]);
    const [isLoadingStudents, setIsLoadingStudents] = useState(true);
    const [isLoadingProgress, setIsLoadingProgress] = useState(false);
    const [error, setError] = useState('');

    const fetchStudents = useCallback(async () => {
        if (!token || !classId) return;
        setIsLoadingStudents(true);
        try {
            const response = await fetch(`${API_URL}/api/teacher/class/${classId}/students`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Hiba a diákok betöltésekor.');
            setStudents(data.students);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoadingStudents(false);
        }
    }, [token, classId]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    const handleSelectStudent = async (student) => {
        if (selectedStudent?.id === student.id) {
            setSelectedStudent(null);
            setProgress([]);
            return;
        }

        setSelectedStudent(student);
        setIsLoadingProgress(true);
        setError('');
        try {
            const response = await fetch(`${API_URL}/api/teacher/student/${student.id}/progress`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Hiba a haladási adatok betöltésekor.');
            setProgress(data.progress);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoadingProgress(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('hu-HU', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className={styles.container}>
            <button onClick={() => navigate('/dashboard/teacher')} className={styles.backButton}>
                &larr; Vissza az Irányítópultra
            </button>
            <h1>Osztály Részletei</h1>
            
            {error && <p className={styles.errorMessage}>{error}</p>}

            <div className={styles.mainContent}>
                <div className={styles.studentListSection}>
                    <h2>Diákok</h2>
                    {isLoadingStudents ? <p>Betöltés...</p> : (
                        <ul className={styles.studentList}>
                            {students.map(student => (
                                <li 
                                    key={student.id} 
                                    onClick={() => handleSelectStudent(student)}
                                    className={selectedStudent?.id === student.id ? styles.selected : ''}
                                >
                                    {student.real_name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className={styles.progressSection}>
                    <h2>Kiválasztott Diák Haladása</h2>
                    {!selectedStudent ? (
                        <p className={styles.placeholder}>Válassz egy diákot a listából a haladás megtekintéséhez.</p>
                    ) : isLoadingProgress ? (
                        <p>Haladási adatok betöltése...</p>
                    ) : (
                        <div className={styles.progressDetails}>
                            <h3>{selectedStudent.real_name} naplója</h3>
                            
                            {/* ÚJ KONTÉNER A TÁBLÁZAT KÖRÉ */}
                            <div className={styles.tableWrapper}>
                                {progress.length === 0 ? <p>Nincs rögzített aktivitás.</p> : (
                                    <table className={styles.progressTable}>
                                        <thead>
                                            <tr>
                                                <th>Dátum</th>
                                                <th>Típus</th>
                                                <th>Tananyag/Kvíz</th>
                                                <th>Eredmény</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {progress.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{formatDate(item.completed_at || item.started_at)}</td>
                                                    <td>{item.activity_type === 'quiz_completed' ? '📝 Kvíz' : '📖 Lecke'}</td>
                                                    <td>
                                                        <Link to={`/tananyag/${item.quiz_slug || item.lesson_slug}`}>
                                                            {item.curriculum_title || (item.quiz_slug || item.lesson_slug)}
                                                        </Link>
                                                    </td>
                                                    <td>
                                                        {item.activity_type === 'quiz_completed' 
                                                            ? `${parseFloat(item.score_percentage).toFixed(0)}%`
                                                            : 'Megtekintve'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div> {/* .tableWrapper vége */}

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClassDetailsPage;