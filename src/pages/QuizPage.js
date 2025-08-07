import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styles from './QuizPage.module.css';

const API_URL = 'https://fokusz-mester-backend.onrender.com';

const QuizPage = () => {
    const { slug } = useParams();
    const [quiz, setQuiz] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userAnswers, setUserAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState(0);

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const response = await fetch(`${API_URL}/api/quiz/${slug}`);
                const data = await response.json();
                if (!data.success) throw new Error(data.message);
                setQuiz(data.quiz);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchQuiz();
    }, [slug]);

    const handleAnswerSelect = (questionId, selectedOption) => {
        setUserAnswers(prev => ({
            ...prev,
            [questionId]: selectedOption
        }));
    };

    const handleSubmit = () => {
        let currentScore = 0;
        quiz.questions.forEach(q => {
            // A válaszokat JSON-ként tároljuk, ezért parse-olni kell
            const correctAnswer = JSON.parse(q.answer);
            if (userAnswers[q.id] === correctAnswer) {
                currentScore++;
            }
        });
        setScore(currentScore);
        setShowResults(true);
    };

    if (isLoading) return <div className={styles.container}>Kvíz betöltése...</div>;
    if (!quiz) return <div className={styles.container}>A kvíz nem található.</div>;

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