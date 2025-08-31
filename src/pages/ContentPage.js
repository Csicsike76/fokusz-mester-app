// Fájl: src/pages/ContentPage.js (TELJES, JAVÍTOTT ÉS BIZTONSÁGOS VERZIÓ)

import React, { useState, useEffect, useCallback } from 'react';
// JAVÍTÁS: useNavigate importálása az átirányításhoz
import { Link, useParams, useNavigate } from 'react-router-dom';
import styles from './ContentPage.module.css';
import { API_URL } from '../config/api';
// JAVÍTÁS: useAuth importálása a jogosultság-ellenőrzéshez
import { useAuth } from '../context/AuthContext';

// --- Komponensek importálása (VÁLTOZATLAN) ---
import SingleChoiceQuestion from '../components/SingleChoiceQuestion';
import WorkshopContent from '../components/WorkshopContent/WorkshopContent';
import TopicSelector from '../components/TopicSelector/TopicSelector';
import GoalPlannerTool from '../components/GoalPlannerTool/GoalPlannerTool';
import PromptGeneratorTool from '../components/PromptGeneratorTool/PromptGeneratorTool';
import PreloadedPromptLauncher from '../components/PreloadedPromptLauncher/PreloadedPromptLauncher';
import MultiChoicePromptGenerator from '../components/MultiChoicePromptGenerator/MultiChoicePromptGenerator';
import ExamSimulatorTool from '../components/ExamSimulatorTool/ExamSimulatorTool';
import MultiInputPromptGenerator from '../components/MultiInputPromptGenerator/MultiInputPromptGenerator';
import HubPageTool from '../components/HubPageTool/HubPageTool';

// =================================================================
// BELSŐ NÉZET KOMPONENSEK (VÁLTOZATLAN)
// =================================================================

// ---- Tananyag nézet (kétoszlopos) ----
const LessonView = ({ title, toc, sections }) => (
    <div className={styles.lessonContainer}>
        <nav className={styles.lessonToc}>
            <h2>Tartalomjegyzék</h2>
            <ul>
                {toc.map(chapter => (
                    <li key={chapter.id}>
                        <a href={`#${chapter.id}`}>{chapter.title}</a>
                        {chapter.subheadings && chapter.subheadings.length > 0 && (
                            <ul>
                                {chapter.subheadings.map(sub => (
                                    <li key={sub.id}><a href={`#${sub.id}`}>{sub.title}</a></li>
                                ))}
                            </ul>
                        )}
                    </li>
                ))}
            </ul>
        </nav>
        <main className={styles.lessonMainContent}>
            <h1>{title}</h1>
            <WorkshopContent sections={sections} />
        </main>
    </div>
);


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
      <p>Ismeretlen adatformátum.</p>
    </div>
  </div>
);


// =================================================================
// FŐ KOMPONENS (JAVÍTOTT LOGIKÁVAL)
// =================================================================
const ContentPage = () => {
  const { slug } = useParams();
  // JAVÍTÁS: Hook-ok inicializálása
  const navigate = useNavigate();
  const { canUsePremium } = useAuth();

  const [contentData, setContentData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [error, setError] = useState('');

  // JAVÍTÁS: A fetchData most már visszaadja a letöltött adatot
  const fetchData = useCallback(async () => {
    try {
      const correctedSlug = slug.replace(/_/g, '-');
      const res = await fetch(`${API_URL}/api/quiz/${correctedSlug}`);
      if (!res.ok) throw new Error(`Hálózati hiba: ${res.statusText}`);
      const data = await res.json();
      if (!data.success || !data.data) {
        throw new Error(data.message || 'Az adatok hiányosak.');
      }
      return data.data; // FONTOS: Visszaadjuk az adatot
    } catch (err) {
      // Itt már nem állítunk state-et, mert azt a hívó kezeli
      console.error("Hiba a tartalom betöltésekor:", err);
      // Dobunk egy hibát, hogy a hívó el tudja kapni
      throw err;
    }
  }, [slug]);

  // JAVÍTÁS: Az useEffect most már a jogosultság-ellenőrzést is elvégzi
  useEffect(() => {
    const loadAndCheckContent = async () => {
      setIsLoading(true);
      setError('');
      setContentData(null);
      setActiveChat(null);

      try {
        const data = await fetchData();

        if (data) {
          // Prémium tartalom azonosítása
          const isPremiumContent = data.category && (
            data.category.startsWith('premium_') ||
            data.category === 'workshop' ||
            data.category === 'premium_course' ||
            data.category === 'premium_tool'
          );

          // A "KIDOBÓEMBER" LOGIKA:
          if (isPremiumContent && !canUsePremium) {
            console.warn("Hozzáférés megtagadva! Prémium tartalom. Átirányítás a bejelentkezési oldalra.");
            navigate('/bejelentkezes', {
              state: {
                from: window.location.pathname,
                message: "A tartalom megtekintéséhez bejelentkezés és prémium hozzáférés szükséges."
              }
            });
            return; // Megállítjuk a további végrehajtást
          }

          // Ha minden rendben, beállítjuk az adatot és leállítjuk a töltést
          setContentData(data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadAndCheckContent();
  }, [slug, canUsePremium, navigate, fetchData]); // Függőségek frissítve

  // A többi handler (handleCharacterSelect, stb.) VÁLTOZATLAN
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
  
  // A renderelési logika VÁLTOZATLAN
  if (isLoading) return <div className={styles.container}>Adatok betöltése...</div>;
  if (error) return <div className={styles.container}>{error}</div>;
  if (!contentData) return <div className={styles.container}>A tartalom nem elérhető.</div>;

  const renderTheContent = () => {
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
    
    const data = contentData;
    let componentToRender;
    let isLessonLayout = false;

    if (data.toc) {
        componentToRender = <LessonView title={data.title} toc={data.toc} sections={data.questions} />;
        isLessonLayout = true;
    } else {
        const toolType = data.toolData?.type;
        switch(toolType) {
            case 'hub-page': componentToRender = <HubPageTool toolData={data.toolData} />; break;
            case 'goal-planner': componentToRender = (<div className={styles.genericToolContainer}><h1 className={styles.mainTitle}>{data.title}</h1><p className={styles.subTitle}>{data.description}</p><hr style={{border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '1.5rem 0'}} /><GoalPlannerTool toolData={data.toolData} /></div>); break;
            case 'prompt-generator': componentToRender = <PromptGeneratorTool toolData={data.toolData} />; break;
            case 'preloaded-prompt-launcher': componentToRender = <PreloadedPromptLauncher toolData={data.toolData} />; break;
            case 'multi-choice-prompt-generator': componentToRender = <MultiChoicePromptGenerator toolData={data.toolData} />; break;
            case 'exam-simulator': componentToRender = <ExamSimulatorTool toolData={data.toolData} />; break;
            case 'multi-input-prompt-generator': componentToRender = <MultiInputPromptGenerator toolData={data.toolData} />; break;
            default: {
                const hasTopics = data.content && data.content.topics;
                const hasCharacters = data.characters && typeof data.characters === 'object' && Object.keys(data.characters).length > 0;
                const isWorkshop = data.questions && data.questions.length > 0 && data.questions[0].content !== undefined;

                if (hasTopics) {
                    componentToRender = <TopicSelector data={data} />;
                } else if (data.category === 'free_tool' && hasCharacters) {
                    componentToRender = <CharacterSelectionView contentData={data} onSelectCharacter={handleCharacterSelect} />;
                } else if (isWorkshop) {
                    componentToRender = <WorkshopContent sections={data.questions} />;
                } else if (data.category === 'free_lesson' || data.category === 'premium_lesson' || data.category === 'premium_course') {
                    componentToRender = <QuizView contentData={data} />;
                } else {
                    componentToRender = <GenericToolView contentData={data} />;
                }
            }
        }
    }
    
    const containerClassName = isLessonLayout ? styles.fullWidthContainer : styles.centeredContainer;

    return (
        <div className={containerClassName}>
            <div className={styles.backgroundOverlay}></div>
            <video autoPlay loop muted className={styles.backgroundVideo}>
                <source src="/videos/bg-video.mp4" type="video/mp4" />
            </video>
            <div className={styles.contentWrapper}>
                {componentToRender}
            </div>
        </div>
    );
  };

  return renderTheContent();
};

export default ContentPage;