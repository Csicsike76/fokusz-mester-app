import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './QuizPage.module.css';
import SingleChoiceQuestion from '../components/SingleChoiceQuestion';

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
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_URL}/api/quiz/${slug}`);
            const data = await response.json();
            if (!data.success) { throw new Error(data.message || 'A kvíz betöltése sikertelen.'); }
            setQuiz(data.quiz);
        } catch (err) { setError(err.message); }
        finally { setIsLoading(false); }
    }, [slug]);

    useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

    const handleAnswerChange = (questionId, selectedAnswer) => {
        if (showResults) return; // Ha már megmutattuk az eredményt, ne lehessen változtatni
        setUserAnswers(prev => ({ ...prev, [questionId]: selectedAnswer }));
    };

    const handleSubmit = () => {
        let currentScore = 0;
        if (quiz && quiz.questions) {
            quiz.questions.forEach(q => {
                const correctAnswer = q.answer;
                if (userAnswers[q.id] === correctAnswer) {
                    currentScore++;
                }
            });
        }
        setScore(currentScore);
        setShowResults(true); // Ezzel aktiváljuk a kiértékelési nézetet
    };

    const allAnswered = quiz?.questions?.length === Object.keys(userAnswers).length;

    if (isLoading) return <div className={styles.container}><div className={styles.quizBox}><p>Kvíz betöltése...</p></div></div>;
    if (error) return <div className={styles.container}><div className={styles.quizBox}><p className={styles.error}>{error}</p></div></div>;
    if (!quiz) return <div className={styles.container}><div className={styles.quizBox}><p>A kvíz nem található.</p></div></div>;

    if (showResults) {
        // ... (az eredmény oldal változatlan)
    }
    
    return (
        <div className={styles.container}>
            <div className={styles.quizBox}>
                <h1>{quiz.title}</h1>
                <hr/>
                {quiz.questions && quiz.questions.map((q) => {
                    if (q.question_type === 'single-choice') {
                        return (
                            <SingleChoiceQuestion
                                key={q.id}
                                question={q}
                                userAnswer={userAnswers[q.id]}
                                onAnswerChange={handleAnswerChange}
                                showResults={showResults} // EZ A FONTOS RÉSZ
                            />
                        );
                    }
                    return <p key={q.id}>Ismeretlen kérdéstípus: {q.question_type}</p>;
                })}
                <button 
                    onClick={handleSubmit} 
                    className={styles.submitButton} 
                    disabled={!allAnswered} // Letiltjuk, amíg nincs minden kérdés megválaszolva
                >
                    Kvíz beküldése
                </button>
            </div>
        </div>
    );
};

export default QuizPage;