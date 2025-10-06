// src/pages/ContentPage.js

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import styles from './ContentPage.module.css';
import quizStyles from './QuizPage.module.css';
import { API_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
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
import LessonView from '../components/LessonView/LessonView';

const CharacterSelectionView = ({ contentData, onSelectCharacter }) => (
  <div className={styles.characterSelection}>
    <h2 className={styles.mainTitle}>{contentData.title}</h2>
    <p className={styles.subTitle}>{contentData.description}</p>
    <div className={styles.characterGrid}>
      {Object.keys(contentData.characters).map(key => {
        const character = contentData.characters[key];
        return (
          <div key={key} className={styles.characterCard} style={{ backgroundColor: character.color }}>
            <img src={character.imageUrl || '/images/default-avatar.png'} alt={character.name} className={styles.characterImage} />
            <h3 className={styles.characterName}>{character.name}</h3>
            <p className={styles.characterTitle}>{character.title}</p>
            <p className={styles.characterQuote}>"{character.quote}"</p>
            <button className={styles.characterButton} onClick={() => onSelectCharacter(key)}>
              Beszélgetek {character.name}-val →
            </button>
          </div>
        );
      })}
    </div>
  </div>
);

const GenericToolView = ({ contentData }) => (
  <div className={styles.genericToolContainer}>
    <h1 className={styles.mainTitle}>{contentData.title}</h1>
    <p className={styles.subTitle}>{contentData.description}</p>
    <div className={styles.workInProgress}>
      <p>Ismeretlen adatformátum.</p>
    </div>
  </div>
);

const QuizView = ({ contentData, slug, token, isTeacherMode, onRestart }) => {
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(isTeacherMode);
  const [score, setScore] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [activeQuestions, setActiveQuestions] = useState([]);
  const allQuestions = useMemo(
    () =>
      Array.isArray(contentData?.questions)
        ? contentData.questions.map((q, i) => ({ ...q, originalId: q.id || i }))
        : [],
    [contentData]
  );
  const questionCounts = useMemo(
    () => ({
      easy: allQuestions.filter(q => q.difficulty === 'easy').length,
      medium: allQuestions.filter(q => q.difficulty === 'easy' || q.difficulty === 'medium').length,
      hard: allQuestions.length,
    }),
    [allQuestions]
  );

  useEffect(() => {
    if (isTeacherMode && !selectedDifficulty) {
      setSelectedDifficulty('hard');
    }
  }, [isTeacherMode, selectedDifficulty]);

  useEffect(() => {
    if (!selectedDifficulty) return;
    let filtered = [];
    if (selectedDifficulty === 'easy') {
      filtered = allQuestions.filter(q => q.difficulty === 'easy');
      if (filtered.length < 8 && filtered.length > 0) {
        const mediumNeeded = 8 - filtered.length;
        const mediumQuestions = allQuestions.filter(q => q.difficulty === 'medium');
        filtered = [...filtered, ...mediumQuestions.sort(() => 0.5 - Math.random()).slice(0, mediumNeeded)];
      }
    } else if (selectedDifficulty === 'medium') {
      filtered = allQuestions.filter(q => q.difficulty === 'easy' || q.difficulty === 'medium');
    } else {
      filtered = [...allQuestions];
    }
    const shuffled = filtered.sort(() => 0.5 - Math.random());
    let finalQuestions = [];
    if (selectedDifficulty === 'easy') finalQuestions = shuffled.slice(0, 8);
    else if (selectedDifficulty === 'medium') finalQuestions = shuffled.slice(0, 15);
    else finalQuestions = shuffled;
    setActiveQuestions(finalQuestions);
    setUserAnswers({});
    setShowResults(isTeacherMode);
    setScore(0);
  }, [selectedDifficulty, allQuestions, isTeacherMode]);

  const handleAnswerChange = (id, val) => {
    if (showResults) return;
    setUserAnswers(prev => ({ ...prev, [id]: val }));
  };

  const handleSubmit = async () => {
    let sc = 0;
    activeQuestions.forEach(q => {
      const correctAnswer = q.answer || (q.answers ? q.answers[q.correct] : undefined);
      if (userAnswers[q.originalId] === correctAnswer) sc++;
    });
    setScore(sc);
    setShowResults(true);
    if (token) {
      setIsSaving(true);
      try {
        await fetch(`${API_URL}/api/quiz/submit-result`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ slug: slug, score: sc, totalQuestions: activeQuestions.length, level: selectedDifficulty }),
        });
      } catch (error) {
        console.error('Hiba az eredmény mentésekor:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleRestart = () => {
    setSelectedDifficulty(null);
    onRestart();
  };

  if (!selectedDifficulty && !isTeacherMode) {
    return (
      <div className={quizStyles.container}>
        <div className={quizStyles.quizBox}>
          <h1>Válassz Nehézségi Szintet!</h1>
          <p>Mérd fel a tudásod a számodra megfelelő szinten.</p>
          <hr className={quizStyles.hr} />
          <div className={quizStyles.difficultyGrid}>
            <button
              onClick={() => setSelectedDifficulty('easy')}
              className={quizStyles.difficultyButton}
              disabled={questionCounts.easy === 0}
            >
              <h3>👶 Könnyű</h3>
              <p>{questionCounts.easy > 0 ? `8 kérdés a bemelegítéshez` : `Nincs könnyű kérdés`}</p>
            </button>
            <button
              onClick={() => setSelectedDifficulty('medium')}
              className={quizStyles.difficultyButton}
              disabled={questionCounts.medium === 0}
            >
              <h3>🎓 Közepes</h3>
              <p>{questionCounts.medium > 0 ? `15 kérdés az elmélyítéshez` : `Nincs közepes kérdés`}</p>
            </button>
            <button
              onClick={() => setSelectedDifficulty('hard')}
              className={quizStyles.difficultyButton}
              disabled={questionCounts.hard === 0}
            >
              <h3>👑 Profi</h3>
              <p>{questionCounts.hard > 0 ? `Az összes kérdés a kihívásért` : `Nincs elérhető kérdés`}</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const allAnswered = activeQuestions.length > 0 && activeQuestions.every(q => userAnswers[q.originalId] !== undefined);
  const pct = activeQuestions.length ? Math.round((score / activeQuestions.length) * 100) : 0;
  let resultsTone = quizStyles.bad;
  if (pct >= 80) resultsTone = quizStyles.good;
    else if (pct >= 50) resultsTone = quizStyles.ok;

  return (
    <div className={quizStyles.container}>
      <div className={quizStyles.quizBox}>
        <h1>
          {contentData.title}{' '}
          {selectedDifficulty && <span className={quizStyles.difficultyTag} data-level={selectedDifficulty}>{selectedDifficulty}</span>}
        </h1>
        <p>{contentData.description}</p>
        <hr className={quizStyles.hr} />
        {activeQuestions.length === 0 && selectedDifficulty ? (
          <div className={quizStyles.workInProgress}>
            <p>Ehhez a nehézségi szinthez nem található elegendő kérdés. Próbálj másikat!</p>
            <button onClick={handleRestart} className={quizStyles.restartButton} style={{ marginTop: '1rem' }}>
              Vissza a választáshoz
            </button>
          </div>
        ) : (
          <>
            {activeQuestions.map(q => (
              <SingleChoiceQuestion
                key={q.originalId}
                question={{ ...q, id: q.originalId }}
                userAnswer={userAnswers[q.originalId]}
                onAnswerChange={handleAnswerChange}
                showResults={showResults}
              />
            ))}
            {!showResults ? (
              <button onClick={handleSubmit} className={quizStyles.submitButton} disabled={!allAnswered}>
                Kvíz beküldése
              </button>
            ) : (
              !isTeacherMode && (
                <div className={`${quizStyles.resultsBox} ${resultsTone}`}>
                  <p>
                    <strong>Eredményed:</strong> {score} / {activeQuestions.length}
                  </p>
                  <p>
                    <strong>Százalék:</strong> {pct}%
                  </p>
                  {isSaving && <p>Eredmény mentése...</p>}
                  <div className={styles.resultsActions}>
                    <button onClick={handleRestart} className={quizStyles.restartButton}>
                      Új kvíz
                    </button>
                    <Link to="/" className={quizStyles.backButton}>
                      Vissza a főoldalra
                    </Link>
                  </div>
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
};

const ContentPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { canUsePremium, token, isTeacherMode } = useAuth();
  const [contentData, setContentData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [restartKey, setRestartKey] = useState(Date.now());

  const isActualQuiz = slug.includes('kviz');


  const inactivityTimer = useRef(null);

  const resetInactivityTimer = useCallback(() => {
    clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      if (isActualQuiz) { 
        setRestartKey(Date.now());
      } else {
        navigate('/');
      }
    }, 2 * 60 * 1000);
  }, [navigate, slug, isActualQuiz]);

  useEffect(() => {
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll'];
    activityEvents.forEach(event => window.addEventListener(event, resetInactivityTimer));
    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimer.current);
      activityEvents.forEach(event => window.removeEventListener(event, resetInactivityTimer));
    };
  }, [resetInactivityTimer]);

  const fetchData = useCallback(async () => {
    try {
      const correctedSlug = slug.replace(/_/g, '-');
      let fetchUrl;

      // A fetch URL-t a slug alapján kell helyesen összeállítani.
      // Ha a slug 'kviz'-zel kezdődik, akkor a kvíz API végpontra mutat.
      // EGYÉBKÉNT pedig a normál tananyag/kontent API végpontra mutat.
      // Ezt a logikát finomítjuk, hogy az összes kategóriát figyelembe vegye a lekérdezésnél.
      if (correctedSlug.startsWith('kviz-')) {
          fetchUrl = `${API_URL}/api/quiz/${correctedSlug}`;
      } else {
          // Ha nem kvíz, akkor megpróbáljuk a /api/content/ végponton.
          fetchUrl = `${API_URL}/api/content/${correctedSlug}`;
      }
      
      const res = await fetch(fetchUrl); 
      if (!res.ok) {
        // HIBA JAVÍTÁS: Ha az első végpont nem jó (pl. 404), akkor megpróbáljuk a másik releváns végpontot.
        // Ez a fallback mechanizmus segíti, hogy a ContentPage megtalálja a tartalmat,
        // ha a slug nem egyértelműen kvíz vagy nem kvíz.
        let fallbackUrl;
        if (correctedSlug.startsWith('kviz-')) {
            // Ha kvíznek gondoltuk, de 404, próbáljuk contentként is
            fallbackUrl = `${API_URL}/api/content/${correctedSlug}`;
        } else {
            // Ha contentnek gondoltuk, de 404, próbáljuk kvízként is (ritkább eset)
            fallbackUrl = `${API_URL}/api/quiz/${correctedSlug}`;
        }
        
        const fallbackRes = await fetch(fallbackUrl);
        if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            if (fallbackData.success && fallbackData.data) {
                return fallbackData.data;
            }
        }
        // Ha egyik sem működik, dobjuk az eredeti (vagy fallback) hibát
        throw new Error(`Hálózati hiba: ${res.statusText || fallbackRes.statusText}`);
      }
      const data = await res.json();
      // HIBA JAVÍTÁS: Ellenőrizzük, hogy a data.data létezik-e, mielőtt hozzáférnénk
      if (!data.success || data.data === undefined || data.data === null) throw new Error(data.message || 'Az adatok hiányosak.');
      return data.data;
    } catch (err) {
      console.error('Hiba a tartalom betöltésekor:', err);
      throw err;
    }
  }, [slug]);

  useEffect(() => {
    const loadAndCheckContent = async () => {
      setIsLoading(true);
      setError('');
      setContentData(null);
      try {
        const data = await fetchData();
        if (data) {
          // HIBA JAVÍTÁS: A prémium kategóriákat egyértelműen listázzuk, ahogy a prompt is megadta
          const premiumCategories = ['premium_course', 'workshop', 'ai', 'hub_page', 'premium_lesson', 'premium_tool'];
          const isPremiumContent = data.category && premiumCategories.includes(data.category);
          
          if (isPremiumContent && !canUsePremium) {
            navigate('/bejelentkezes', {
              state: {
                from: window.location.pathname,
                message: 'A tartalom megtekintéséhez bejelentkezés és prémium hozzáférés szükséges.',
              },
            });
            return;
          }
          setContentData(data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadAndCheckContent();
  }, [slug, canUsePremium, navigate, fetchData, restartKey]);

  // --- Schema.org Markup generálása ---
  const generateSchemaMarkup = useCallback((data) => {
    if (!data) return null;

    let schema = {};
    const currentUrl = `https://fokuszmester.com/tananyag/${slug}`;

    // A Schema.org típusok logikáját is finomítjuk, hogy pontosabban illeszkedjenek a kategóriákhoz.
    // Használjuk a `data.category` mezőt a pontosabb típusválasztáshoz.
    if (data.category === 'premium_course' || data.category === 'premium_lesson') {
        schema = {
            "@context": "https://schema.org",
            "@type": "Course",
            "name": data.title,
            "description": data.description || "Oktatási tananyag a Fókusz Mester platformon.",
            "url": currentUrl,
            "provider": {
                "@type": "EducationalOrganization",
                "name": "Fókusz Mester",
                "url": "https://fokuszmester.com/",
                "logo": "https://fokuszmester.com/assets/fokuszmester-logo.png"
            },
            "educationalLevel": `${data.grade || ''} osztály`,
            "learningResourceType": "tananyag",
            "keywords": data.keywords || (data.title ? data.title.split(' ').join(', ') : '')
        };
    } else if (data.questions && data.questions.length > 0 && isActualQuiz) { // Kvízek
        schema = {
            "@context": "https://schema.org",
            "@type": "Quiz",
            "name": data.title,
            "description": data.description || "Interaktív kvíz a Fókusz Mester platformon.",
            "url": currentUrl,
            "about": {
                "@type": "Thing",
                "name": data.subject || "Matematika"
            },
            "author": {
                "@type": "EducationalOrganization",
                "name": "Fókusz Mester"
            },
            "educationalLevel": `${data.grade || ''} osztály`,
            "educationalUse": "formative assessment",
            "timeRequired": "PT10M",
            "question": data.questions.map(q => ({
                "@type": "Question",
                "name": q.question,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": q.answers ? q.answers[q.correct] : q.answer
                }
            }))
        };
    } else if (data.category && (data.category.includes('tool') || data.category === 'free_tool' || data.category === 'workshop' || data.category === 'hub_page' || data.category === 'ai')) { // Eszközök és Hub oldalak
        schema = {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": data.title,
            "description": data.description || "Online tanulást segítő eszköz a Fókusz Mestertől.",
            "url": currentUrl,
            "applicationCategory": "EducationalSoftware",
            "operatingSystem": "Web",
            "provider": {
                "@type": "EducationalOrganization",
                "name": "Fókusz Mester"
            }
        };
    }

    return schema;
  }, [slug, isActualQuiz]);

  const pageSchema = useMemo(() => generateSchemaMarkup(contentData), [contentData, generateSchemaMarkup]);


  const renderTheContent = () => {
    let componentToRender;
    let isLessonLayout = false;
    const data = contentData;

    if (!data) {
        return <div className={styles.container}>A tartalom nem elérhető.</div>;
    }

    if (data.toc) {
      componentToRender = <LessonView lessonData={data} />;
      isLessonLayout = true;
    } else {
      const toolType = data.toolData?.type;
      switch (toolType) {
        case 'hub-page':
          componentToRender = <HubPageTool toolData={data.toolData} />;
          break;
        case 'goal-planner':
          componentToRender = (
            <div className={styles.genericToolContainer}>
              <h1 className={styles.mainTitle}>{data.title}</h1>
              <p className={styles.subTitle}>{data.description}</p>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '1.5rem 0' }} />
              <GoalPlannerTool toolData={data.toolData} />
            </div>
          );
          break;
        case 'prompt-generator':
          componentToRender = <PromptGeneratorTool toolData={data.toolData} />;
          break;
        case 'preloaded-prompt-launcher':
          componentToRender = <PreloadedPromptLauncher toolData={data.toolData} />;
          break;
        case 'multi-choice-prompt-generator':
          componentToRender = <MultiChoicePromptGenerator toolData={data.toolData} />;
          break;
        case 'exam-simulator':
          componentToRender = <ExamSimulatorTool toolData={data.toolData} />;
          break;
        case 'multi-input-prompt-generator':
          componentToRender = <MultiInputPromptGenerator toolData={data.toolData} />;
          break;
        default: {
          const hasTopics = data.content && data.content.topics;
          const hasCharacters = data.characters && typeof data.characters === 'object' && Object.keys(data.characters).length > 0;
          const isWorkshop = data.questions && data.questions.length > 0 && data.questions[0].content !== undefined; 

          if (hasTopics) {
            componentToRender = <TopicSelector data={data} />;
          } else if (data.category === 'free_tool' && hasCharacters) {
            componentToRender = <CharacterSelectionView contentData={data} />;
          } else if (isWorkshop) {
            componentToRender = <WorkshopContent sections={data.questions} />;
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
        <div className={styles.contentWrapper}>{componentToRender}</div>
      </div>
    );
  };

  return (
    <>
      <Helmet>
        {contentData && pageSchema && Object.keys(pageSchema).length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify(pageSchema)}
          </script>
        )}
        <title>{contentData?.title ? `${contentData.title} | Fókusz Mester` : 'Fókusz Mester'}</title>
        <meta name="description" content={contentData?.description || "Interaktív online oktatási platform matematika, fizika és mesterséges intelligencia tananyagokkal, kvízekkel és eszközökkel."} />
      </Helmet>
      {isActualQuiz ? (
        <QuizView
          key={restartKey}
          contentData={contentData}
          slug={slug}
          token={token}
          isTeacherMode={isTeacherMode}
          onRestart={() => setRestartKey(Date.now())}
        />
      ) : (
        renderTheContent()
      )}
    </>
  );
};

export default ContentPage;