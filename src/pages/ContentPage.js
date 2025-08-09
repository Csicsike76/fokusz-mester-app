// src/pages/ContentPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import styles from './ContentPage.module.css'; // Egy új, központi CSS fájl

const API_URL = 'http://localhost:3001';

// A különálló nézetek komponensei
const CharacterSelectionView = ({ toolData, onSelectCharacter }) => (
    <div className={styles.characterSelection}>
        <h2 className={styles.mainTitle}>{toolData.title}</h2>
        <p className={styles.subTitle}>{toolData.description}</p>
        <div className={styles.characterGrid}>
            {Object.keys(toolData.characters).map(key => {
                const character = toolData.characters[key];
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

const QuizView = ({ contentData }) => (
    <div className={styles.quizContainer}>
        <h1 className={styles.mainTitle}>{contentData.title}</h1>
        <p className={styles.subTitle}>{contentData.description}</p>
        <div className={styles.workInProgress}>
            <p>A kvíz funkció még fejlesztés alatt áll.</p>
            <p>A kérdések hamarosan itt fognak megjelenni.</p>
        </div>
    </div>
);

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
            const response = await fetch(`${API_URL}/api/quiz/${correctedSlug}`);
            if (!response.ok) throw new Error('Hálózati hiba');
            const data = await response.json();
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
        setMessages([{ text: `Szia! Én ${contentData.characters[charKey].name} vagyok. Kérdezz tőlem!`, sender: 'tutor' }]);
    };
    
    const handleSend = () => {
        const userMessage = userInput.trim();
        if (userMessage === '' || !activeChat) return;
        const newMessages = [...messages, { text: userMessage, sender: 'user' }];
        setMessages(newMessages);
        setUserInput('');
        const systemPrompt = contentData?.characters[activeChat]?.prompt || "Viselkedj segítőkész tanárként.";
        const conversationHistory = newMessages.map(msg => `${msg.sender === 'user' ? 'Diák' : 'Tutor'}: ${msg.text}`).join('\n');
        const fullPrompt = `${systemPrompt}\n\nA beszélgetés eddig:\n${conversationHistory}\nTutor:`;
        navigator.clipboard.writeText(fullPrompt.trim()).then(() => {
            setMessages(prev => [...prev, { text: "✅ A kérdésedet a vágólapra másoltam! Nyisd meg a Geminit, illeszd be, majd a választ írd be ide a folytatáshoz.", sender: 'tutor' }]);
            window.open('https://gemini.google.com/app', '_blank');
        });
    };

    const handleGoBack = () => {
        setActiveChat(null);
        setMessages([]);
    }

    const renderContent = () => {
        if (!activeChat) {
            // Döntés a kategória alapján
            switch (contentData.category) {
                case 'free_tool':
                case 'premium_tool':
                    // Ha a tool-nak van 'characters' mezője, a karakterválasztót mutatjuk
                    if (contentData.characters) {
                        return <CharacterSelectionView toolData={contentData} onSelectCharacter={handleCharacterSelect} />;
                    }
                    // Különben egy általános eszköznézetet
                    return <GenericToolView contentData={contentData} />;
                
                case 'free_lesson':
                case 'premium_lesson':
                    return <QuizView contentData={contentData} />;

                default:
                    return <GenericToolView contentData={contentData} />;
            }
        }

        // Chat nézet renderelése (csak karakterválasztós eszközöknél érhető el)
        return (
            <div className={styles.chatContainer}>
                <div className={styles.chatHeader}>
                    <h3>Beszélgetés: {contentData.characters[activeChat].name}</h3>
                    <button onClick={handleGoBack} className={styles.backButton}>Vissza a karakterválasztáshoz</button>
                </div>
                <div className={styles.messages}>
                    {messages.map((msg, index) => (
                        <div key={index} className={`${styles.message} ${styles[msg.sender]}`}>{msg.text}</div>
                    ))}
                </div>
                <div className={styles.inputArea}>
                    <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Írd be a kérdésed..." onKeyPress={(e) => e.key === 'Enter' && handleSend()} />
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
                {renderContent()}
            </div>
        </div>
    );
};

export default ContentPage;