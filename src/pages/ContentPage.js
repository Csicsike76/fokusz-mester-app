// src/pages/ContentPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom'; // Link hozzáadva
import styles from './ContentPage.module.css';
import { API_URL } from '../config/api';
import SingleChoiceQuestion from '../components/SingleChoiceQuestion';

// ---- Karakterválasztós eszköz nézet ----
const CharacterSelectionView = ({ toolData, onSelectCharacter }) => (
  <div className={styles.characterSelection}>
    <h2 className={styles.mainTitle}>{toolData.title}</h2>
    <p className={styles.subTitle}>{toolData.description}</p>
    <div className={styles.characterGrid}>
      {Object.keys(toolData.characters).map(key => {
        const character = toolData.characters[key];
        return (
          <div
            key={key}
            className={styles.characterCard}
            style={{ backgroundColor: character.color }}
          >
            <img
              src={character.imageUrl || '/images/default-avatar.png'}
              alt={character.name}
              className={styles.characterImage}
            />
            <h3 className={styles.characterName}>{character.name}</h3>
            <p className={styles.characterTitle}>{character.title}</p>
            <p className={styles.characterQuote}>"{character.quote}"</p>
            <button
              className={styles.characterButton}
              onClick={() => onSelectCharacter(key)}
            >
              Beszélgetek {character.name}-val →
            </button>
          </div>
        );
      })}
    </div>
  </div>
);

// ---- VALÓDI kvíz nézet (a contentData.questions alapján) ----
const QuizView = ({ contentData }) => {
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const questions = Array.isArray(contentData?.questions)
    ? contentData.questions
    : [];

  const handleAnswerChange = (id, val) => {
    if (showResults) return;
    setUserAnswers(prev => ({ ...prev, [id]: val }));
  };

  const handleSubmit = () => {
    let sc = 0;
    questions.forEach((q, idx) => {
      const id = q.id ?? idx;
      if (userAnswers[id] === q.answer) sc++;
    });
    setScore(sc);
    setShowResults(true);
  };

  const handleRestart = () => {
    setUserAnswers({});
    setShowResults(false);
    setScore(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const allAnswered =
    questions.length > 0 &&
    questions.every((q, idx) => {
      const id = q.id ?? idx;
      return userAnswers[id] !== undefined;
    });

  const pct = questions.length
    ? Math.round((score / questions.length) * 100)
    : 0;

  return (
    <div className={styles.quizContainer}>
      <h1 className={styles.mainTitle}>{contentData.title}</h1>
      <p className={styles.subTitle}>{contentData.description}</p>

      {questions.length === 0 ? (
        <div className={styles.workInProgress}>
          <p>Ehhez a leckéhez még nincs kérdéslista csatolva.</p>
        </div>
      ) : (
        <>
          {questions.map((q, idx) => {
            const id = q.id ?? idx;
            const question = { ...q, id };
            return (
              <SingleChoiceQuestion
                key={id}
                question={question}
                userAnswer={userAnswers[id]}
                onAnswerChange={handleAnswerChange}
                showResults={showResults}
              />
            );
          })}

          {!showResults ? (
            <button onClick={handleSubmit} disabled={!allAnswered}>
              Kvíz beküldése
            </button>
          ) : (
            <div className={styles.workInProgress}>
              <p>
                <strong>Eredményed:</strong> {score} / {questions.length} ({pct}
                %)
              </p>
              <div style={{ marginTop: '1rem' }}>
                <button onClick={handleRestart}>Újrakezd</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ---- Általános eszköz placeholder ----
const GenericToolView = ({ contentData }) => (
  <div className={styles.genericToolContainer}>
    <h1 className={styles.mainTitle}>{contentData.title}</h1>
    <p className={styles.subTitle}>{contentData.description}</p>
    <div className={styles.workInProgress}>
      <p>Ez az eszköz még fejlesztés alatt áll.</p>
    </div>
  </div>
);

const ContentPage = () => {
  const { slug } = useParams();
  const [contentData, setContentData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const correctedSlug = slug.replace(/_/g, '-');
      const res = await fetch(`${API_URL}/api/quiz/${correctedSlug}`);
      if (!res.ok) throw new Error('Hálózati hiba');
      const data = await res.json();
      if (!data.success || !data.data) {
        throw new Error(data.message || 'Az adatok hiányosak.');
      }
      setContentData(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCharacterSelect = (charKey) => {
    setActiveChat(charKey);
    setMessages([
      {
        text: `Szia! Én ${contentData.characters[charKey].name} vagyok. Kérdezz tőlem!`,
        sender: 'tutor',
      },
    ]);
  };

  const handleSend = () => {
    const userMessage = userInput.trim();
    if (userMessage === '' || !activeChat) return;
    const newMessages = [...messages, { text: userMessage, sender: 'user' }];
    setMessages(newMessages);
    setUserInput('');

    const systemPrompt =
      contentData?.characters[activeChat]?.prompt ||
      'Viselkedj segítőkész tanárként.';
    const conversationHistory = newMessages
      .map((msg) => `${msg.sender === 'user' ? 'Diák' : 'Tutor'}: ${msg.text}`)
      .join('\n');
    const fullPrompt = `${systemPrompt}\n\nA beszélgetés eddig:\n${conversationHistory}\nTutor:`;
    navigator.clipboard.writeText(fullPrompt.trim()).then(() => {
      setMessages((prev) => [
        ...prev,
        {
          text:
            '✅ A kérdésedet a vágólapra másoltam! Nyisd meg a Geminit, illeszd be, majd a választ írd be ide a folytatáshoz.',
          sender: 'tutor',
        },
      ]);
      window.open('https://gemini.google.com/app', '_blank');
    });
  };

  const handleGoBack = () => {
    setActiveChat(null);
    setMessages([]);
  };

  const renderContent = () => {
    if (!activeChat) {
      switch (contentData.category) {
        case 'free_tool':
        case 'premium_tool':
          if (contentData.characters) {
            return (
              <CharacterSelectionView
                toolData={contentData}
                onSelectCharacter={handleCharacterSelect}
              />
            );
          }
          return <GenericToolView contentData={contentData} />;

        case 'free_lesson':
        case 'premium_lesson':
          return <QuizView contentData={contentData} />;

        default:
          return <GenericToolView contentData={contentData} />;
      }
    }

    return (
      <div className={styles.chatContainer}>
        <div className={styles.chatHeader}>
          <h3>Beszélgetés: {contentData.characters[activeChat].name}</h3>
          <button onClick={handleGoBack} className={styles.backButton}>
            Vissza a karakterválasztáshoz
          </button>
        </div>
        <div className={styles.messages}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`${styles.message} ${styles[msg.sender]}`}
            >
              {msg.text}
            </div>
          ))}
        </div>
        <div className={styles.inputArea}>
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Írd be a kérdésed..."
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend}>Küldés</button>
        </div>
      </div>
    );
  };

  if (isLoading) return <div className={styles.container}>Adatok betöltése...</div>;
  if (error) return <div className={styles.container}>{error}</div>;
  if (!contentData) return <div className={styles.container}>A tartalom nem található.</div>;

  return (
    <div className={styles.container}>
      <div className={styles.backgroundOverlay}></div>
      <video autoPlay loop muted className={styles.backgroundVideo}>
        <source src="/videos/bg-video.mp4" type="video/mp4" />
      </video>
      <div className={styles.contentWrapper}>
        {/* ÚJ: Vissza a főoldalra gomb */}
        <Link to="/" className={styles.backToHomeButton}>← Vissza a Főoldalra</Link>
        {renderContent()}
      </div>
    </div>
  );
};

export default ContentPage;