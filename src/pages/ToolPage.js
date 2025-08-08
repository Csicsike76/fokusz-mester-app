import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styles from './ToolPage.module.css';

const API_URL = 'https://fokusz-mester-backend.onrender.com';

const ToolPage = () => {
    const { slug } = useParams();
    const [toolData, setToolData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedChar, setSelectedChar] = useState('');
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');

    useEffect(() => {
        const fetchToolData = async () => {
            try {
                const response = await fetch(`${API_URL}/api/tool/${slug}`);
                const data = await response.json();
                if (!data.success) throw new Error('Hiba az eszköz adatainak betöltésekor.');
                setToolData(data.data);
                if (data.data && data.data.prompts) {
                    const firstChar = Object.keys(data.data.prompts)[0];
                    setSelectedChar(firstChar);
                }
                setMessages([{ text: 'Szia! Válassz egy karaktert, és kérdezz tőle!', sender: 'tutor' }]);
            } catch (error) {
                console.error(error);
                setMessages([{ text: 'Hiba történt az eszköz betöltése közben.', sender: 'tutor' }]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchToolData();
    }, [slug]);

    const handleSend = () => {
        const userMessage = userInput.trim();
        if (userMessage === '') return;

        const newMessages = [...messages, { text: userMessage, sender: 'user' }];
        setMessages(newMessages);
setUserInput('');

        const systemPrompt = toolData?.prompts[selectedChar] || "Viselkedj segítőkész tanárként.";
        const conversationHistory = newMessages.map(msg => `${msg.sender === 'user' ? 'Diák' : 'Tutor'}: ${msg.text}`).join('\n');
        const fullPrompt = `${systemPrompt}\n\nA beszélgetés eddig:\n${conversationHistory}\nTutor:`;

        navigator.clipboard.writeText(fullPrompt.trim()).then(() => {
            setMessages(prev => [...prev, { text: "✅ A kérdésedet a vágólapra másoltam! Nyisd meg a Geminit, illeszd be (Ctrl+V), majd a választ írd be ide a folytatáshoz.", sender: 'tutor' }]);
            window.open('https://gemini.google.com/app', '_blank');
        }).catch(err => {
            setMessages(prev => [...prev, { text: "Hiba a másolás során. Kérlek, próbáld újra!", sender: 'tutor' }]);
        });
    };

    if (isLoading) return <div className={styles.chatContainer}>Betöltés...</div>;
    if (!toolData) return <div className={styles.chatContainer}>Hiba: Az eszköz adatai nem találhatóak.</div>;

    return (
        <div className={styles.chatContainer}>
            <div className={styles.header}>
                <h1>{toolData?.title || "Csevegő"}</h1>
                <div className={styles.charSelector}>
                    <span>Kivel beszélgetsz?</span>
                    <select value={selectedChar} onChange={(e) => setSelectedChar(e.target.value)}>
                        {toolData.prompts && Object.keys(toolData.prompts).map(char => (
                            <option key={char} value={char}>{char.charAt(0).toUpperCase() + char.slice(1)}</option>
                        ))}
                    </select>
                </div>
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
    );
};

export default ToolPage;