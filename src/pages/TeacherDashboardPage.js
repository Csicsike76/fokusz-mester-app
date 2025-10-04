import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './TeacherDashboardPage.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const TeacherDashboardPage = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const { classId: urlClassId } = useParams();

    const [myClasses, setMyClasses] = useState([]);
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);
    const [className, setClassName] = useState('');
    const [maxStudents, setMaxStudents] = useState(30);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    const [studentsInSelectedClass, setStudentsInSelectedClass] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [progress, setProgress] = useState([]);
    const [isLoadingStudentsInClass, setIsLoadingStudentsInClass] = useState(false);
    const [isLoadingProgress, setIsLoadingProgress] = useState(false);

    const fetchClasses = useCallback(async () => {
        if (!token) return;
        setIsLoadingClasses(true);
        try {
            const response = await fetch(`${API_URL}/api/teacher/classes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Hiba az osztályok betöltése során.');
            setMyClasses(data.classes);
        } catch (err) {
            setError('Hiba az osztályok betöltésekor: ' + err.message);
        } finally {
            setIsLoadingClasses(false);
        }
    }, [token]);

    const fetchStudentProgress = useCallback(async (studentId) => {
        if (!token || !studentId) return;
        setIsLoadingProgress(true);
        try {
            const response = await fetch(`${API_URL}/api/teacher/student/${studentId}/progress`, {
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
    }, [token]);

    const fetchStudentsInClass = useCallback(async (classId) => {
        if (!token || !classId) return;
        setIsLoadingStudentsInClass(true);
        try {
            const response = await fetch(`${API_URL}/api/teacher/class/${classId}/students`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Hiba a diákok betöltésekor.');
            setStudentsInSelectedClass(data.students);
            if (!selectedStudent && data.students.length > 0) {
                setSelectedStudent(data.students[0]);
                fetchStudentProgress(data.students[0].id); 
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoadingStudentsInClass(false);
        }
    }, [token, selectedStudent, fetchStudentProgress]);

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
        if (urlClassId) {
            fetchStudentsInClass(urlClassId);
        }
    }, [fetchClasses, paymentSuccess, urlClassId, fetchStudentsInClass]);

    const handleSelectStudent = (student) => {
        if (selectedStudent?.id === student.id) {
            setSelectedStudent(null);
            setProgress([]);
        } else {
            setSelectedStudent(student);
            fetchStudentProgress(student.id);
        }
    };

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

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        return (
            <div className={styles.dateCellContent}> {/* ÚJ: Konténer a dátum elemeknek */}
                <div className={styles.dateYear}>{year}</div>
                <div className={styles.dateMonthDay}>{month}. {day}.</div>
                <div className={styles.dateTime}>{hours}:{minutes}</div>
            </div>
        );
    };

    if (urlClassId) {
        return (
            <div className={styles.dashboardContainer}>
                <button onClick={() => navigate('/dashboard/teacher')} className={styles.backButton}>
                    &larr; Vissza az Irányítópultra
                </button>
                <h1>Osztály Részletei</h1>
                
                {error && <p className={styles.errorMessage}>{error}</p>}

                <div className={styles.classDetailsContentWrapper}>
                    <div className={styles.mainContent}>
                        <div className={styles.studentListSection}>
                            <h2>Diákok</h2>
                            {isLoadingStudentsInClass ? <p>Betöltés...</p> : (
                                <ul className={styles.studentList}>
                                    {studentsInSelectedClass.map(student => (
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
                            ) : (
                                <div className={styles.progressDetails}>
                                    <h3>{selectedStudent.real_name} naplója</h3>
                                    
                                    <div className={styles.studentProgressTableContainer}>
                                        {isLoadingProgress ? <p>Haladási adatok betöltése...</p> : progress.length === 0 ? <p>Nincs rögzített aktivitás.</p> : (
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
                                    </div>

                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.dashboardContainer}>
            <header className={styles.header}>
                <h1>Tanári Irányítópult</h1>
                <p>Üdvözlünk, {user?.real_name || user?.username}!</p>
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
                                    <div className={styles.classInfo}>
                                        <span className={styles.className}>{cls.class_name}</span>
                                        <span className={styles.studentCount}>
                                            {cls.student_count} / {cls.max_students} fő
                                        </span>
                                        <span className={styles.classCode}>Kód: {cls.class_code}</span>
                                    </div>
                                    <Link to={`/dashboard/teacher/class/${cls.id}`} className={styles.detailsButton}>
                                        Részletek
                                    </Link>
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
                                name="className"
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
                                name="maxStudents"
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