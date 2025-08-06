import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
// A Link komponenst innen is eltávolítjuk
import SingleChoiceQuestion from '../components/SingleChoiceQuestion';
import MultipleChoiceQuestion from '../components/MultipleChoiceQuestion';
import EnteredAnswerQuestion from '../components/EnteredAnswerQuestion';

const QuizPage = () => {
  const { quizId } = useParams(); 
  const [quizData, setQuizData] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const quizModule = await import(`../data/quizzes/${quizId}.json`);
        setQuizData(quizModule.default);
        setError(null);
      } catch (err) {
        console.error("Hiba a kvíz betöltése közben:", err);
        setError(`A(z) "${quizId}.json" nevű kvízfájl nem található a "src/data/quizzes" mappában.`);
        setQuizData(null); 
      }
    };

    fetchQuiz();
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setShowResults(false);
  }, [quizId]);

  const handleAnswerChange = (questionId, answer) => {
    setUserAnswers(prevAnswers => {
      const question = quizData.questions.find(q => q.id === questionId);
      if (question.type === 'multiple-choice') {
        const existingAnswers = prevAnswers[questionId] || [];
        if (existingAnswers.includes(answer)) {
          return { ...prevAnswers, [questionId]: existingAnswers.filter(a => a !== answer) };
        } else {
          return { ...prevAnswers, [questionId]: [...existingAnswers, answer] };
        }
      }
      return { ...prevAnswers, [questionId]: answer };
    });
  };

  const calculateScore = () => {
    let score = 0;
    quizData.questions.forEach(question => {
      const userAnswer = userAnswers[question.id];
      if (!userAnswer) return;

      if (question.type === 'single-choice') {
        if (userAnswer === question.answer) {
          score++;
        }
      } else if (question.type === 'entered-answer') {
        if (new RegExp(question.answerRegex, 'i').test(userAnswer)) {
          score++;
        }
      } else if (question.type === 'multiple-choice') {
        if (JSON.stringify([...userAnswer].sort()) === JSON.stringify([...question.answer].sort())) {
          score++;
        }
      }
    });
    return score;
  };

  const handleSubmit = () => setShowResults(true);

  const renderQuestion = () => {
    const question = quizData.questions[currentQuestionIndex];
    switch (question.type) {
      case 'single-choice':
        return <SingleChoiceQuestion question={question} onAnswerChange={handleAnswerChange} />;
      case 'multiple-choice':
        return <MultipleChoiceQuestion question={question} onAnswerChange={handleAnswerChange} />;
      case 'entered-answer':
        return <EnteredAnswerQuestion question={question} onAnswerChange={handleAnswerChange} />;
      default:
        return null;
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  if (error) {
    return <div style={{ padding: '2rem', color: 'red' }}>Hiba: {error}</div>;
  }

  if (!quizData) {
    return <div style={{ padding: '2rem' }}>Kvíz betöltése...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>{quizData.title}</h1>
      {!showResults ? (
        <div>
          {renderQuestion()}
          <div className="navigation" style={{ marginTop: '20px' }}>
            <button onClick={handleBack} disabled={currentQuestionIndex === 0}>Vissza</button>
            {currentQuestionIndex < quizData.questions.length - 1 ? (
              <button onClick={handleNext}>Következő</button>
            ) : (
              <button onClick={handleSubmit}>Beadás</button>
            )}
          </div>
        </div>
      ) : (
        <div>
          <h2>Eredményed: {calculateScore()} / {quizData.questions.length}</h2>
          {/* A vissza a főoldalra link is <a> tag lett */}
          <a href="/" target="_blank" rel="noopener noreferrer">Vissza a főoldalra</a>
        </div>
      )}
    </div>
  );
};

export default QuizPage;