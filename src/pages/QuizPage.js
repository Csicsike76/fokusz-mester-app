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
      if (!data.success) {
        throw new Error(data.message || 'A kvíz betöltése sikertelen.');
      }
      setQuiz(data.quiz);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  const handleAnswerChange = (questionId, selectedAnswer) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: selectedAnswer }));
  };

  const handleSubmit = () => {
    // Ellenőrizzük, hogy minden kérdésre válaszolt-e a tanuló
    if (quiz.questions.some(q => !userAnswers[q.id])) {
      alert('Kérlek, válaszolj mindegyik kérdésre!');
      return;
    }

    let currentScore = 0;
    quiz.questions.forEach(q => {
      if (userAnswers[q.id] === q.answer) {
        currentScore++;
      }
    });

    setScore(currentScore);
    setShowResults(true);
  };

  if (isLoading) return <div className={styles.container}><p>Kvíz betöltése...</p></div>;
  if (error) return <div className={styles.container}><p className={styles.error}>{error}</p></div>;
  if (!quiz) return <div className={styles.container}><p>A kvíz nem található.</p></div>;

  if (showResults) {
    const totalQuestions = quiz.questions.length;
    const percentage = ((score / totalQuestions) * 100).toFixed(0);
    return (
      <div className={styles.container}>
        <h1>Kvíz Eredmény</h1>
        <h2>{quiz.title}</h2>
        <p>Eredményed: {score} / {totalQuestions}</p>
        <p>Százalék: {percentage}%</p>
        <Link to="/" className={styles.backButton}>Vissza a főoldalra</Link>
        <hr/>
        {quiz.questions.map(q => (
          <SingleChoiceQuestion
            key={q.id}
            question={q}
            userAnswer={userAnswers[q.id]}
            onAnswerChange={handleAnswerChange}
            showResults={true}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>{quiz.title}</h1>
      <hr />
      {quiz.questions.map(q => (
        <SingleChoiceQuestion
          key={q.id}
          question={q}
          userAnswer={userAnswers[q.id]}
          onAnswerChange={handleAnswerChange}
          showResults={false}
        />
      ))}
      <button onClick={handleSubmit} className={styles.submitButton}>Kvíz beküldése</button>
    </div>
  );
};

export default QuizPage;
