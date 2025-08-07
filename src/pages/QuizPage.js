import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import styles from './QuizPage.module.css';
import SingleChoiceQuestion from '../components/SingleChoiceQuestion'; // Importáljuk az új komponenst

const API_URL = 'https://fokusz-mester-backend.onrender.com';

const QuizPage = () => {
    const { slug } = useParams();
    const [quiz, setQuiz] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userAnswers, setUserAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState(0);
    const [error, setError] = useState('');

    const fetchQuiz = useCallback(async () => {
        // ... (ez a rész változatlan)
    }, [slug]);

    useEffect(() => {
        fetchQuiz();
    }, [fetchQuiz]);

    const handleAnswerChange = (questionId, selectedAnswer) => {
        setUserAnswers(prev => ({ ...prev, [questionId]: selectedAnswer }));
    };

    const handleSubmit = () => {
        let currentScore = 0;
        quiz.questions.forEach(q => {
            const correctAnswer = JSON.parse(q.answer);
            if (userAnswers[q.id] === correctAnswer) {
                currentScore++;
            }
        });
        setScore(currentScore);
        setShowResults(true);
    };

    if (isLoading) return <div className={styles.container}>Kvíz betöltése...</div>;
    if (error || !quiz) return <div className={styles.container}><p>{error || "A kvíz nem található."}</p></div>;

    if (showResults) {
        const percentage = quiz.questions.length > 0 ? ((score / quiz.questions.length) * 100).toFixed(1) : 0;
        return (
            <div className={styles.container}>
                <div className={styles.quizBox}>
                    <div className={styles.results}>
                        <h1>Kvíz Eredmény</h1>
                        <h2>{quiz.title}</h2>
                        <p>Eredményed: {score} / {quiz.questions.length}</p>
                        <p>Százalék: {percentage}%</p>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className={styles.container}>
            <div className={styles.quizBox}>
                <h1>{quiz.title}</h1>
                <hr/>
                {quiz.questions.map((q) => (
                    <div key={q.id} className={styles.questionBlock}>
                        <p>{q.description}</p>
                        <div className={styles.options}>
                            {JSON.parse(q.options).map((option, index) => (
                                <label key={index} className={`${styles.optionLabel} ${userAnswers[q.id] === option ? styles.selected : ''}`}>
                                    <input
                                        type="radio"
                                        name={`question-${q.id}`}
                                        value={option}
                                        checked={userAnswers[q.id] === option}
                                        onChange={() => handleAnswerSelect(q.id, option)}
                                        style={{ display: 'none' }}
                                    />
                                    {option}
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
                <button onClick={handleSubmit} className={styles.submitButton}>Kvíz beküldése</button>
            </div>
        </div>
    );
};

export default QuizPage;