// Fájl: src/pages/ContentPage.js (VÉGLEGES JAVÍTÁS)

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import styles from './ContentPage.module.css';
import { API_URL } from '../config/api';

// --- Komponensek importálása ---
import SingleChoiceQuestion from '../components/SingleChoiceQuestion';
import WorkshopContent from '../components/WorkshopContent/WorkshopContent';
import TopicSelector from '../components/TopicSelector/TopicSelector';
import GoalPlannerTool from '../components/GoalPlannerTool/GoalPlannerTool';

// =================================================================
// BELSŐ NÉZET KOMPONENSEK
// =================================================================

// ---- Karakterválasztós eszköz nézet ----
const CharacterSelectionView = ({ contentData, onSelectCharacter }) => (
  <div className={styles.characterSelection}>
    <h2 className={styles.mainTitle}>{contentData.title}</h2>
    <p className={styles.subTitle}>{contentData.description}</p>
    <div className={styles.characterGrid}>
      {Object.keys(contentData.characters).map(key => {
        const character = contentData.characters[key];
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

// ---- Kvíz nézet ----
const QuizView = ({ contentData }) => {
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    setUserAnswers({});
    setShowResults(false);
    setScore(0);
  }, [contentData]);

  const questions = Array.isArray(contentData?.questions) ? contentData.questions : [];

  const handleAnswerChange = (id, val) => {
    if (showResults) return;
    setUserAnswers(prev => ({ ...prev, [id]: val }));
  };

  const handleSubmit = () => {
    let sc = 0;
    questions.forEach((q, idx) => {
      const id = q.id ?? idx;
      const correctAnswer = q.answer || (q.answers ? q.answers[q.correct] : undefined);
      if (userAnswers[id] === correctAnswer) sc++;
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

  const allAnswered = questions.length > 0 && questions.every((q, idx) => {
    const id = q.id ?? idx;
    return userAnswers[id] !== undefined;
  });

  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;

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
            return (
              <SingleChoiceQuestion
                key={id}
                question={{ ...q, id }}
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
              <p><strong>Eredményed:</strong> {score} / {questions.length} ({pct}%)</p>
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

// ---- Általános eszköz nézet ----
const GenericToolView = ({ contentData }) => (
  <div className={styles.genericToolContainer}>
    <h1 className={styles.mainTitle}>{contentData.title}</h1>
    <p className={styles.subTitle}>{contentData.description}</p>
    <div className={styles.workInProgress}>
      <p>Ez az eszköz még fejlesztés alatt áll.</p>
    </div>
  </div>
);


// =================================================================
// FŐ KOMPONENS
// =================================================================

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
      if (!res.ok) throw new Error(`Hálózati hiba: ${res.statusText}`);
      const data = await res.json();
      if (!data.success || !data.data) {
        throw new Error(data.message || 'Az adatok hiányosak.');
      }
      setContentData(data.data);
    } catch (err) {
      setError(err.message);
      console.error("Hiba a tartalom betöltésekor:", err);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
    setActiveChat(null);
  }, [fetchData, slug]);

  const handleCharacterSelect = (charKey) => {
    setActiveChat(charKey);
    setMessages([{ text: `Szia! Én ${contentData.characters[charKey].name} vagyok. Kérdezz tőlem!`, sender: 'tutor' }]);
  };

  const handleSend = () => {
    const userMessage = userInput.trim();
    if (userMessage === '' || !activeChat) return;
    const newMessages = [...messages, { text: userMessage, sender: 'user' }];
    setMessages(newMessages);
    setUserInput('');
    const systemPrompt = contentData?.characters[activeChat]?.prompt || 'Viselkedj segítőkész tanárként.';
    const conversationHistory = newMessages.map((msg) => `${msg.sender === 'user' ? 'Diák' : 'Tutor'}: ${msg.text}`).join('\n');
    const fullPrompt = `${systemPrompt}\n\nA beszélgetés eddig:\n${conversationHistory}\nTutor:`;
    navigator.clipboard.writeText(fullPrompt.trim()).then(() => {
      setMessages((prev) => [...prev, { text: '✅ A kérdésedet a vágólapra másoltam! Nyisd meg a Geminit, illeszd be, majd a választ írd be ide a folytatáshoz.', sender: 'tutor' }]);
      window.open('https://gemini.google.com/app', '_blank');
    });
  };

  const handleGoBack = () => {
    setActiveChat(null);
    setMessages([]);
  };

  const renderContent = () => {
    if (!contentData) return null;

    if (activeChat) {
      return (
        <div className={styles.chatContainer}>
          <div className={styles.chatHeader}>
            <h3>Beszélgetés: {contentData.characters[activeChat].name}</h3>
            <button onClick={handleGoBack} className={styles.backButton}>Vissza</button>
          </div>
          <div className={styles.messages}>
            {messages.map((msg, idx) => (<div key={idx} className={`${styles.message} ${styles[msg.sender]}`}>{msg.text}</div>))}
          </div>
          <div className={styles.inputArea}>
            <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Írd be a kérdésed..." onKeyPress={(e) => e.key === 'Enter' && handleSend()} />
            <button onClick={handleSend}>Küldés</button>
          </div>
        </div>
      );
    }

    // === JAVÍTÁS: A SPECIÁLIS ESZKÖZÖK ELLENŐRZÉSE ÉS HELYES MEGJELENÍTÉSE ===
    const isGoalPlanner = contentData.toolData?.type === 'goal-planner';
    if (isGoalPlanner) {
      // A Célkitűzőt egy közös konténerbe tesszük a címmel és leírással,
      // és a helyes `toolData` prop-ot adjuk át neki.
      return (
        <div className={styles.genericToolContainer}>
          <h1 className={styles.mainTitle}>{contentData.title}</h1>
          <p className={styles.subTitle}>{contentData.description}</p>
          <hr style={{border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '1.5rem 0'}} />
          <GoalPlannerTool toolData={contentData.toolData} />
        </div>
      );
    }
    // ======================================================================

    const hasTopics = contentData.topics && Array.isArray(contentData.topics) && contentData.topics.length > 0;
    const hasCharacters = contentData.characters && typeof contentData.characters === 'object' && Object.keys(contentData.characters).length > 0;
    const isWorkshop = contentData.questions && contentData.questions.length > 0 && contentData.questions[0].content !== undefined;

    if (hasTopics || (contentData.category === 'premium_tool' && hasCharacters)) {
        return <TopicSelector data={contentData} />;
    } 
    
    if (contentData.category === 'free_tool' && hasCharacters) {
        return <CharacterSelectionView contentData={contentData} onSelectCharacter={handleCharacterSelect} />;
    }

    if (isWorkshop) {
        return <WorkshopContent sections={contentData.questions} />;
    } 

    switch (contentData.category) {
      case 'free_lesson':
      case 'premium_lesson':
        return <QuizView contentData={contentData} />;
      default:
        return <GenericToolView contentData={contentData} />;
    }
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
        {renderContent()}
      </div>
    </div>
  );
};

export default ContentPage;