import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
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
            if (!data.success) {
                throw new Error(data.message || 'A kvíz betöltése sikertelen.');
            }
            setQuiz(data.quiz);
        } catch (err) {
            setError(err.message);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        fetchQuiz();
    }, [fetchQuiz]);

    // JAVÍTÁS ITT: A függvény neve most már helyesen 'handleAnswerChange'
    const handleAnswerChange = (questionId, selectedAnswer) => {
        setUserAnswers(prev => ({ ...prev, [questionId]: selectedAnswer }));
    };

    const handleSubmit = () => {
        let currentScore = 0;
        if (quiz && quiz.questions) {
            quiz.questions.forEach(q => {
                try {
                    // A válasz egy sima string, nem kell parse-olni
                    const correctAnswer = q.answer;
                    if (userAnswers[q.id] === correctAnswer) {
                        currentScore++;
                    }
                } catch (e) {
                    console.error("Hiba a válasz feldolgozása közben:", e);
                }
            });
        }
        setScore(currentScore);
        setShowResults(true);
    };

    if (isLoading) return <div className={styles.container}><p>Kvíz betöltése...</p></div>;
    if (error) return <div className={styles.container}><p className={styles.error}>{error}</p></div>;
    if (!quiz) return <div className={styles.container}><p>A kvíz nem található.</p></div>;

    if (showResults) {
        const totalQuestions = quiz.questions ? quiz.questions.length : 0;
        const percentage = totalQuestions > 0 ? ((score / totalQuestions) * 100).toFixed(1) : 0;
        return (
            <div className={styles.container}>
                <div className={styles.quizBox}>
                    <div className={styles.results}>
                        <h1>Kvíz Eredmény</h1>
                        <h2>{quiz.title}</h2>
                        <p>Eredményed: {score} / {totalQuestions}</p>
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
                {quiz.questions && quiz.questions.map((q) => {
                    if (q.question_type === 'single-choice') {
                        return (
                            <SingleChoiceQuestion
                                key={q.id}
                                question={q}
                                userAnswer={userAnswers[q.id]}
                                onAnswerChange={handleAnswerChange}
                            />
                        );
                    }
                    // Ide jöhet a többi kérdéstípus
                    return <p key={q.id}>Ismeretlen kérdéstípus: {q.question_type}</p>;
                })}
                <button onClick={handleSubmit} className={styles.submitButton}>Kvíz beküldése</button>
            </div>
        </div>
    );
};

export default QuizPage;