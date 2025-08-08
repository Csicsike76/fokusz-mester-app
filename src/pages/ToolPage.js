import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import styles from './ToolPage.module.css';

const API_URL = 'https://fokusz-mester-backend.onrender.com';

const ToolPage = () => {
    const { slug } = useParams();
    const [toolData, setToolData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [activeChat, setActiveChat] = useState(null);

    const fetchToolData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/tool/${slug}`);
            const data = await response.json();
            if (!data.success) throw new Error('Hiba az eszköz adatainak betöltésekor.');
            setToolData(data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        fetchToolData();
    }, [fetchToolData]);

    const startChat = (charKey) => {
        setActiveChat(charKey);
        setMessages([
            { text: `Szia! Én ${toolData.characters[charKey].name} vagyok. Kérdezz tőlem!`, sender: 'tutor' }
        ]);
    };

    const handleSend = () => {
        const userMessage = userInput.trim();
        if (userMessage === '' || !activeChat) return;

        const newMessages = [...messages, { text: userMessage, sender: 'user' }];
        setMessages(newMessages);
        setUserInput('');

        const systemPrompt = toolData?.characters[activeChat]?.prompt || "Viselkedj segítőkész tanárként.";
        const conversationHistory = newMessages.map(msg => `${msg.sender === 'user' ? 'Diák' : 'Tutor'}: ${msg.text}`).join('\n');
        const fullPrompt = `${systemPrompt}\n\nA beszélgetés eddig:\n${conversationHistory}\nTutor:`;

        navigator.clipboard.writeText(fullPrompt.trim()).then(() => {
            setMessages(prev => [...prev, { text: "✅ A kérdésedet a vágólapra másoltam! Nyisd meg a Geminit, illeszd be, majd a választ írd be ide a folytatáshoz.", sender: 'tutor' }]);
            window.open('https://gemini.google.com/app', '_blank');
        });
    };

    if (isLoading) return <div className={styles.container}>Eszköz betöltése...</div>;
    if (!toolData) return <div className={styles.container}>Hiba: Az eszköz adatai nem találhatóak.</div>;

    if (!activeChat) {
        return (
            <div className={styles.container}>
                <div className={styles.selectionHeader}>
                    <h1>{toolData.title}</h1>
                    <p>Válassz egy karaktert! A rendszer a vágólapodra másolja a "lelkét" (a promptot), és megnyitja a Geminit. Ott már csak be kell illesztened (Ctrl+V)!</p>
                </div>
                <div className={styles.characterGrid}>
                    {toolData.characters && Object.keys(toolData.characters).map(charKey => {
                        const char = toolData.characters[charKey];
                        return (
                            <div key={charKey} className={`${styles.charCard} ${styles[char.color]}`}>
                                <img src={char.imageUrl} alt={char.name} className={styles.charImage} />
                                <h3>{char.name}</h3>
                                <p className={styles.charTitle}>{char.title}</p>
                                <p className={styles.charQuote}>"{char.quote}"</p>
                                <button onClick={() => startChat(charKey)} className={styles.chatButton}>
                                    Beszélgetek {char.name}-val →
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.chatContainer}>
                <div className={styles.chatHeader}>
                    <h3>Beszélgetés: {toolData.characters[activeChat].name}</h3>
                    <button onClick={() => setActiveChat(null)} className={styles.backButton}>Vissza</button>
                </div>
                <div className={styles.messages}>
                    {messages.map((msg, index) => (
                        <div key={index} className={`${styles.message} ${styles[msg.sender]}`}>
                            {msg.text}
                        </div>
                    ))}
                </div>
                <div className={styles.inputArea}>
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Írd be a kérdésed vagy a kapott választ..."
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button onClick={handleSend}>Küldés</button>
                </div>
            </div>
        </div>
    );
};

export default ToolPage;