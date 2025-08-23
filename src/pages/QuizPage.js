// Fájl: src/pages/QuizPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './QuizPage.module.css';

import SingleChoiceQuestion from '../components/SingleChoiceQuestion/SingleChoiceQuestion';
import WorkshopContent from '../components/WorkshopContent/WorkshopContent';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const QuizPage = () => {
    const { slug } = useParams();
    const [curriculum, setCurriculum] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [userAnswers, setUserAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState(0);

    const fetchCurriculum = useCallback(async () => {
        try {
            setIsLoading(true);
            setError('');
            const response = await fetch(`${API_URL}/api/quiz/${slug}`);
            if (!response.ok) throw new Error(`HTTP hiba! Státusz: ${response.status}`);
            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'A tananyag betöltése sikertelen.');
            setCurriculum(data.data);
        } catch (err) {
            setError(err.message);
            console.error("Fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        fetchCurriculum();
    }, [fetchCurriculum]);

    const isWorkshop = curriculum?.questions?.[0]?.content !== undefined;
    const isQuiz = curriculum?.questions?.[0]?.options !== undefined || curriculum?.questions?.[0]?.answers !== undefined;

    const handleAnswerChange = (questionId, selectedAnswer) => {
        if (showResults) return;
        setUserAnswers(prev => ({ ...prev, [questionId]: selectedAnswer }));
    };
    
    const handleSubmit = () => {
        let currentScore = 0;
        if (isQuiz && curriculum?.questions) {
            curriculum.questions.forEach((q, index) => {
                const questionId = q.id || index;
                const correctAnswer = q.answer || (q.answers ? q.answers[q.correct] : undefined);
                if (userAnswers[questionId] === correctAnswer) {
                    currentScore++;
                }
            });
        }
        setScore(currentScore);
        setShowResults(true);
    };

    const handleRestart = () => {
        setUserAnswers({});
        setShowResults(false);
        setScore(0);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    const allAnswered = isQuiz && curriculum?.questions?.length > 0 &&
        curriculum.questions.every((q, index) => userAnswers[q.id || index] !== undefined);

    if (isLoading) return <div className={styles.container}><div className={styles.quizBox}><p>Tananyag betöltése...</p></div></div>;
    if (error) return <div className={styles.container}><div className={styles.quizBox}><p className={styles.error}>{error}</p></div></div>;
    if (!curriculum) return <div className={styles.container}><div className={styles.quizBox}><p>A tananyag nem található.</p></div></div>;

    const totalQuestions = curriculum?.questions?.length || 0;
    const pct = totalQuestions ? Math.round((score / totalQuestions) * 100) : 0;
    let resultsTone = styles.bad;
    if (pct >= 80) resultsTone = styles.good;
    else if (pct >= 50) resultsTone = styles.ok;

    return (
        <div className={styles.container}>
            <div className={styles.quizBox}>
                <h1>{curriculum.title}</h1>
                <p>{curriculum.description}</p>
                <hr className={styles.hr} />

                {isWorkshop && <WorkshopContent sections={curriculum.questions} />}
                
                {isQuiz && curriculum.questions.map((q, index) => (
                    <SingleChoiceQuestion
                        key={q.id || index}
                        question={{ ...q, id: q.id || index }}
                        userAnswer={userAnswers[q.id || index]}
                        onAnswerChange={handleAnswerChange}
                        showResults={showResults}
                    />
                ))}

                {isQuiz && !showResults && totalQuestions > 0 && (
                    <button onClick={handleSubmit} className={styles.submitButton} disabled={!allAnswered}>
                        Kvíz beküldése
                    </button>
                )}

                {isQuiz && showResults && (
                    <div className={`${styles.resultsBox} ${resultsTone}`}>
                        <p><strong>Eredményed:</strong> {score} / {totalQuestions}</p>
                        <p><strong>Százalék:</strong> {pct}%</p>
                        <div className={styles.resultsActions}>
                            <button onClick={handleRestart} className={styles.restartButton}>Újrakezd</button>
                            <Link to="/" className={styles.backButton}>Vissza a főoldalra</Link>
                        </div>
                    </div>
                )}

                {!isQuiz && !isWorkshop && (
                    <p>Ehhez a leckéhez még nincs tartalom (kérdés vagy szekció) csatolva.</p>
                )}
            </div>
        </div>
    );
};

export default QuizPage;