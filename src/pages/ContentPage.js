// src/pages/ContentPage.js

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async'; // HOZZÁADVA: Helmet importálása
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

  const inactivityTimer = useRef(null);

  const resetInactivityTimer = useCallback(() => {
    clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      const isActualQuiz = slug.includes('kviz');
      if (isActualQuiz) {
        setRestartKey(Date.now());
      } else {
        navigate('/');
      }
    }, 2 * 60 * 1000);
  }, [navigate, slug]);

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
      // Módosítva: A lekérdezés most már képes a .json kiterjesztésű fájlokat is kezelni a backendről.
      // Feltételezzük, hogy a backend tudja, hogy ha nincs kiterjesztés, akkor '.json' a default.
      // Ha a backendnek szüksége van a .json kiterjesztésre, akkor azt itt hozzá kell adni.
      const fetchUrl = slug.endsWith('.json') ? `${API_URL}/api/tananyag/${correctedSlug}` : `${API_URL}/api/quiz/${correctedSlug}`;
      const res = await fetch(fetchUrl); 
      if (!res.ok) throw new Error(`Hálózati hiba: ${res.statusText}`);
      const data = await res.json();
      if (!data.success || !data.data) throw new Error(data.message || 'Az adatok hiányosak.');
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
          const isPremiumContent =
            data.category &&
            (data.category.startsWith('premium_') ||
              data.category === 'workshop' ||
              data.category === 'premium_course' ||
              data.category === 'premium_tool');
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
    const currentUrl = `https://fokuszmester.com/tananyag/${slug}`; // Az aktuális lecke URL-je

    if (data.toc) { // Ha egy LessonView típusú tananyag
        schema = {
            "@context": "https://schema.org",
            "@type": "Course", // Vagy EducationalMaterial, de Course jobban passzol a leckékhez
            "name": data.title,
            "description": data.description || "Oktatási tananyag a Fókusz Mester platformon.",
            "url": currentUrl,
            "provider": {
                "@type": "EducationalOrganization",
                "name": "Fókusz Mester",
                "url": "https://fokuszmester.com/",
                "logo": "https://fokuszmester.com/assets/fokuszmester-logo.png" // Cseréld a valós logó URL-re
            },
            "educationalLevel": `${data.grade || ''} osztály`,
            "learningResourceType": "tananyag",
            "keywords": data.keywords || (data.title ? data.title.split(' ').join(', ') : '')
        };
        // Ha van TOC, akkor az egyes fejezetek CourseInstance-ként is megjelölhetők,
        // de az egyszerűség kedvéért most csak a fő Course-t jelöljük.
    } else if (data.questions && data.questions.length > 0) { // Ha kvíz
        schema = {
            "@context": "https://schema.org",
            "@type": "Quiz", // Vagy Exercise/Practice, de Quiz jobban illik
            "name": data.title,
            "description": data.description || "Interaktív kvíz a Fókusz Mester platformon.",
            "url": currentUrl,
            "about": {
                "@type": "Thing", // Vagy EducationalSubject
                "name": data.subject || "Matematika" // Feltételezve, hogy a data.subject mező tartalmazza a tárgyat
            },
            "author": {
                "@type": "EducationalOrganization",
                "name": "Fókusz Mester"
            },
            "educationalLevel": `${data.grade || ''} osztály`,
            "educationalUse": "formative assessment", // Formáló értékelés
            "timeRequired": "PT10M", // Becsült idő, pl. 10 perc. Ezt dinamikusan is lehetne generálni.
            "question": data.questions.map(q => ({ // Minden kérdés Question típusként
                "@type": "Question",
                "name": q.question,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": q.answers ? q.answers[q.correct] : q.answer // Megfelelő válasz kiválasztása
                }
            }))
        };
    } else if (data.category && data.category.includes('tool')) { // Ha eszköz (pl. PromptGeneratorTool)
        schema = {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication", // Vagy CreativeWork, de SoftwareApplication specifikusabb eszközökhöz
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
    // Kiegészíthető más tartalomtípusokkal (pl. karakterválasztó, workshop)

    return schema;
  }, [slug]); // Függőség hozzáadva: slug

  const pageSchema = useMemo(() => generateSchemaMarkup(contentData), [contentData, generateSchemaMarkup]);
  // --- END Schema.org Markup generálása ---


  const renderTheContent = () => {
    let componentToRender;
    let isLessonLayout = false;
    const data = contentData;

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
          const isWorkshop = data.questions && data.questions.length > 0 && data.questions[0].content !== undefined; // Itt gond lehet, ha a kvíz is questions-t használ

          if (hasTopics) {
            componentToRender = <TopicSelector data={data} />;
          } else if (data.category === 'free_tool' && hasCharacters) {
            componentToRender = <CharacterSelectionView contentData={data} />;
          } else if (isWorkshop) { // WORKSHOP tartalom kezelése
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
        {contentData && pageSchema && (
          <script type="application/ld+json">
            {JSON.stringify(pageSchema)}
          </script>
        )}
        <title>{contentData?.title ? `${contentData.title} | Fókusz Mester` : 'Fókusz Mester'}</title>
        <meta name="description" content={contentData?.description || "Interaktív online oktatási platform matematika, fizika és mesterséges intelligencia tananyagokkal, kvízekkel és eszközökkel."} />
        {/* Hozzáadhatók canonical link, Open Graph és Twitter Card meta tag-ek is. */}
      </Helmet>
      {renderTheContent()}
    </>
  );
};

export default ContentPage;