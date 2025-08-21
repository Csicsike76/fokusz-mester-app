import { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { saveAs } from 'file-saver';
import './App.css';

// Prompt sablonok és Típusdefiníciók
const promptTemplates = {
    default: `Készíts 3 különböző, részletes és tartalmas közösségi média posztot a következő témában: [IDE ÍRD A TÉMÁT]. A posztok hangvétele legyen [IDE ÍRD A HANGVÉTELT]. Minden javaslat legyen legalább 3-4 mondat hosszú. Optimalizáld őket a következő platformokra: [IDE ÍRD A PLATFORMOKAT]. ***FONTOS: A válaszod kizárólag magyar nyelven íródjon!***`,
    reelsScript: `Írj egy részletes, lépésről-lépésre kidolgozott forgatókönyvet egy 15-20 másodperces Instagram Reels videóhoz a következő témában: [IDE ÍRD A TÉMÁT]. A forgatókönyv tartalmazza a vizuális elemeket (Vizuális:), a narrációt (Narráció:) és a képernyőn megjelenő szövegeket (Szöveg:). A stílus legyen dinamikus és szórakozató. Ne spórolj a karakterekkel. ***FONTOS: A válaszod kizárólag magyar nyelven íródjon!***`,
    blogOutline: `Készíts egy részletes, mélyreható vázlatot egy blogbejegyzéshez a következő címmel: [IDE ÍRD A CÍMET]. A vázlat tartalmazza a főbb fejezetcímeket és minden fejezeten belül 3-4 részletesen kifejtett kulcspontot, amiről a fejezetnek szólnia kell. ***FONTOS: A válaszod kizárólag magyar nyelven íródjon!***`,
    productDescription: `Írj egy meggyőző, részletes és SEO-barát termékleírást a következő termékhez: [IDE ÍRD A TERMÉK NEVÉT ÉS FŐBB TULAJDONSÁGAIT]. A leírás legyen legalább 100 szó hosszú, emelje ki a termék 3 fő előnyét, és szólítsa meg a célközönséget: [IDE ÍRD A CÉLKÖZÖNSÉGET]. ***FONTOS: A válaszod kizárólag magyar nyelven íródjon!***`
};
type HistoryItem = { id: number; timestamp: string; type: 'text' | 'image'; results: string[]; isFavorite: boolean; tags: string[]; };

function App() {
    // Állapotok
    const [theme, setTheme] = useState<string>(localStorage.getItem('theme') || 'light');
    const [fontSize, setFontSize] = useState<number>(Number(localStorage.getItem('fontSize')) || 16);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
    const [topic, setTopic] = useState<string>('');
    const [style, setStyle] = useState<string>('Professzionális');
    const [platforms, setPlatforms] = useState<{ [key: string]: boolean }>({ Facebook: true, Instagram: false, LinkedIn: false, TikTok: false, Telegram: false });
    const [results, setResults] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(false);
    const [customPrompt, setCustomPrompt] = useState<string>(promptTemplates.default);
    const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('default');
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
    const [processingStatus, setProcessingStatus] = useState<string>('');
    const [processingProgress, setProcessingProgress] = useState<number>(0);
    const [imageResults, setImageResults] = useState<string[]>([]);
    const [imageError, setImageError] = useState<string>('');
    const [refiningState, setRefiningState] = useState<{ index: number; type: 'text' | 'image' } | null>(null);
    const [refinementInput, setRefinementInput] = useState<string>('');
    const [historySearchTerm, setHistorySearchTerm] = useState<string>('');
    const [tagInput, setTagInput] = useState<string>('');

    // Effect-ek
    useEffect(() => { document.body.className = theme === 'dark' ? 'dark-theme' : ''; localStorage.setItem('theme', theme); }, [theme]);
    useEffect(() => { document.documentElement.style.fontSize = `${fontSize}px`; localStorage.setItem('fontSize', fontSize.toString()); }, [fontSize]);
    useEffect(() => {
        const savedHistory = localStorage.getItem('generationHistory');
        if (savedHistory) {
            try {
                let parsedHistory = JSON.parse(savedHistory);
                const migratedHistory = parsedHistory.map((item: any) => {
                    if (!item.tags) {
                        return { ...item, tags: [] };
                    }
                    return item;
                });
                setHistory(migratedHistory);
            } catch (e) {
                console.error("Hiba az előzmények betöltésekor:", e);
                setHistory([]);
            }
        }
    }, []);

    // Segédfüggvények
    const saveHistory = (newHistory: HistoryItem[]) => { setHistory(newHistory); localStorage.setItem('generationHistory', JSON.stringify(newHistory)); };
    const addToHistory = (type: 'text' | 'image', results: string[]) => { if (results.length === 0) return; const newItem: HistoryItem = { id: Date.now(), timestamp: new Date().toLocaleString('hu-HU'), type, results, isFavorite: false, tags: [] }; const updatedHistory = [newItem, ...history]; saveHistory(updatedHistory); };
    const toggleFavorite = (id: number) => { const updatedHistory = history.map(item => item.id === id ? { ...item, isFavorite: !item.isFavorite } : item); saveHistory(updatedHistory); };
    const handleAddTag = (id: number) => { if (tagInput.trim() === '') return; const updatedHistory = history.map(item => item.id === id ? { ...item, tags: [...item.tags, tagInput.trim()] } : item); saveHistory(updatedHistory); setTagInput(''); };
    const handleRemoveTag = (id: number, tagToRemove: string) => { const updatedHistory = history.map(item => item.id === id ? { ...item, tags: item.tags.filter(tag => tag !== tagToRemove) } : item); saveHistory(updatedHistory); };
    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
    const increaseFontSize = () => setFontSize(prev => Math.min(prev + 1, 24));
    const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 1, 12));
    const copyToClipboard = (text: string, format: 'plain' | 'formatted') => { let textToCopy = text; if (format === 'plain') { textToCopy = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/__/g, '').replace(/_/g, ''); } navigator.clipboard.writeText(textToCopy); alert(`Szöveg a vágólapra másolva (${format === 'plain' ? 'formázás nélkül' : 'formázással'})!`); };
    const handlePlatformChange = (e: React.ChangeEvent<HTMLInputElement>) => setPlatforms(prev => ({ ...prev, [e.target.name]: e.target.checked }));
    const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => { const key = e.target.value as keyof typeof promptTemplates; setSelectedTemplateKey(key); setCustomPrompt(promptTemplates[key]); };
    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => { if (event.target.files) { setImageFiles(Array.from(event.target.files)); setImageError(''); setImageResults([]); } };
    const handleExportHistory = () => { if (history.length === 0) { alert("Nincs mit exportálni."); return; } const dataStr = JSON.stringify(history, null, 2); const dataBlob = new Blob([dataStr], { type: "application/json" }); const url = URL.createObjectURL(dataBlob); const link = document.createElement("a"); link.href = url; link.download = `fokusz-mester-elozmenyek_${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); };
    const handleImportHistory = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (!confirm("Biztosan felülírja a jelenlegi előzményeket? Ez a művelet nem vonható vissza.")) return; const reader = new FileReader(); reader.onload = (e) => { try { const text = e.target?.result; if (typeof text !== 'string') throw new Error("A fájl hibás."); const importedHistory = JSON.parse(text); if (Array.isArray(importedHistory) && (importedHistory.length === 0 || importedHistory[0].id)) { saveHistory(importedHistory); alert("Előzmények sikeresen importálva!"); } else { throw new Error("Hibás formátum."); } } catch (error) { alert(`Hiba az importálás során: ${error instanceof Error ? error.message : "Ismeretlen hiba."}`); } }; reader.readAsText(file); event.target.value = ''; };

    const generateContent = async (prompt: string, type: 'text' | 'image', setResultsFunc: React.Dispatch<React.SetStateAction<string[]>>, setErrorFunc: React.Dispatch<React.SetStateAction<string>>, setIsLoadingFunc: React.Dispatch<React.SetStateAction<boolean>>) => {
        const apiKey = import.meta.env.VITE_API_KEY; if (!apiKey) { setErrorFunc('API kulcs nincs beállítva.'); setIsLoadingFunc(false); return; }
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
            const responseData = await response.json(); if (!response.ok) { throw new Error(responseData?.error?.message || `API hiba`); }
            const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textResponse) { const newResults = textResponse.split('---').map((item: string) => item.trim()).filter(item => item); setResultsFunc(newResults); addToHistory(type, newResults); } else { throw new Error("Az AI nem adott érvényes választ."); }
        } catch (err: any) { setErrorFunc(`Hiba a generálás során: ${err.message}`); } finally { setIsLoadingFunc(false); }
    };
    
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault(); setIsLoading(true); setResults([]); setError(''); let finalPrompt = '';
        if (isAdvancedMode) {
            finalPrompt = customPrompt; if (!finalPrompt.includes("kizárólag magyar nyelven")) { finalPrompt += "\n***FONTOS: A válaszod kizárólag magyar nyelven íródjon!***"; }
        } else {
            const selectedPlatforms = Object.keys(platforms).filter(p => platforms[p as keyof typeof platforms]);
            if (selectedPlatforms.length === 0) { setError('Kérlek, válassz legalább egy platformot!'); setIsLoading(false); return; }
            finalPrompt = `Készíts 3 különböző, részletes és tartalmas közösségi média posztot a következő témában: "${topic}". A poszt hangvétele legyen ${style}. Minden javaslat legyen legalább 3-4 mondat hosszú. Optimalizáld őket a következő platformokra: ${selectedPlatforms.join(', ')}. Válaszaidat "---" jellel válaszd el. ***FONTOS: A válaszod kizárólag magyar nyelven íródjon!***`;
        }
        await generateContent(finalPrompt, 'text', setResults, setError, setIsLoading);
    };

    const handleImageAnalysisAndGeneration = async () => {
        if (imageFiles.length === 0) { setImageError('Kérlek, válassz ki legalább egy képfájlt!'); return; }
        setIsProcessingImage(true); setImageError(''); setImageResults([]); setProcessingProgress(0); let combinedText = '';
        try {
            let commonLines = new Set<string>();
            if (imageFiles.length > 1) {
                setProcessingStatus('Ismétlődő elemek elemzése (1/2)...'); const text1 = (await Tesseract.recognize(imageFiles[0], 'hun')).data.text;
                setProcessingStatus('Ismétlődő elemek elemzése (2/2)...'); const text2 = (await Tesseract.recognize(imageFiles[1], 'hun')).data.text;
                const lines1 = new Set(text1.split('\n').filter(line => line.trim() !== '')); const lines2 = text2.split('\n').filter(line => line.trim() !== '');
                lines2.forEach(line => { if (lines1.has(line)) { commonLines.add(line); } });
            }
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i]; setProcessingStatus(`Releváns tartalom kinyerése: ${i + 1}/${imageFiles.length} kép...`);
                const result = await Tesseract.recognize(file, 'hun', { logger: m => { if (m.status === 'recognizing text') { setProcessingProgress(Math.round(m.progress * 100)); } } });
                const allLines = result.data.text.split('\n'); const uniqueLines = allLines.filter(line => !commonLines.has(line));
                combinedText += uniqueLines.join('\n') + '\n\n';
            }
            if (!combinedText.trim()) { throw new Error("Nem sikerült egyedi szöveget kiolvasni a képekből."); }
            setProcessingStatus('Tartalom generálása az AI segítségével...'); setProcessingProgress(0);
            const reelsPrompt = `A következő, több képből kinyert, előre megtisztított szöveg egy hosszabb kvíz vagy oktatási anyag releváns tartalmát tartalmazza: "${combinedText}". Készíts ebből egy összefüggő, több részes Reels/TikTok videósorozat-tervet, vagy 3-5 különálló, de tematikusan kapcsolódó videó ötletet. Minden ötlet legyen részletesen kidolgozva. Minden ötlethez írj egy komplett forgatókönyvet a vizuális elemekkel és a narrációval. A stílus legyen figyelemfelkeltő és dinamikus. Válaszaidat "---" jellel válaszd el. ***FONTOS: A válaszod kizárólag magyar nyelven íródjon!***`;
            await generateContent(reelsPrompt, 'image', setImageResults, setImageError, setIsProcessingImage);
        } catch (err: any) {
            setImageError(err.message || "Ismeretlen hiba történt."); setIsProcessingImage(false);
        } finally {
            setProcessingStatus(''); setProcessingProgress(0);
        }
    };
    
    const handleRefineResult = async (index: number, type: 'text' | 'image') => {
        const originalResults = type === 'text' ? results : imageResults;
        const originalText = originalResults[index];
        if (!refinementInput.trim()) { alert('Kérlek, írj be egy finomítási utasítást!'); return; }
        const setIsLoadingFunc = type === 'text' ? setIsLoading : setIsProcessingImage;
        const setErrorFunc = type === 'text' ? setError : setImageError;
        setIsLoadingFunc(true); setErrorFunc('');
        const refinePrompt = `A következő szövegen végezz el egy módosítást. Eredeti szöveg: "${originalText}". A kért módosítás: "${refinementInput}". A válaszodban CSAK a végleges, módosított szöveg szerepeljen, mindenféle extra magyarázat vagy körítés nélkül. ***FONTOS: A válaszod kizárólag magyar nyelven íródjon!***`;
        const apiKey = import.meta.env.VITE_API_KEY;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: refinePrompt }] }] }) });
            const responseData = await response.json(); if (!response.ok) throw new Error(responseData?.error?.message || `API hiba`);
            const refinedText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (refinedText) {
                const updateFunction = type === 'text' ? setResults : setImageResults;
                updateFunction((prevResults: string[]) => { const newResults = [...prevResults]; newResults[index] = refinedText.trim(); return newResults; });
                setRefiningState(null); setRefinementInput('');
            } else { throw new Error("Az AI nem adott érvényes választ a finomításra."); }
        } catch (err: any) { setErrorFunc(`Hiba a finomítás során: ${err.message}`); } finally { setIsLoadingFunc(false); }
    };

    const handleGenerateImage = (text: string) => {
        const canvas = document.createElement('canvas'); const context = canvas.getContext('2d'); if (!context) return;
        const width = 1080; const height = 1920; canvas.width = width; canvas.height = height;
        const gradient = context.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#CD2A3E'); gradient.addColorStop(0.5, '#FFFFFF'); gradient.addColorStop(1, '#436A45');
        context.fillStyle = gradient; context.fillRect(0, 0, width, height);
        context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        let fontSize = 80; context.font = `bold ${fontSize}px Arial`;
        const words = text.replace(/\*\*/g, '').replace(/\*/g, '').split(' '); let line = '';
        let lines: string[] = [];
        const maxWidth = width - 100;
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' '; const metrics = context.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) { lines.push(line); line = words[n] + ' '; } else { line = testLine; }
        }
        lines.push(line);
        while (lines.length * (fontSize * 1.2) > height - 100 && fontSize > 20) {
            fontSize -= 5; context.font = `bold ${fontSize}px Arial`; line = ''; lines = [];
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' '; const metrics = context.measureText(testLine);
                const testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) { lines.push(line); line = words[n] + ' '; } else { line = testLine; }
            }
            lines.push(line);
        }
        const lineHeight = fontSize * 1.2; const totalHeight = lines.length * lineHeight;
        let y = (height - totalHeight) / 2 + lineHeight / 2;
        for (let i = 0; i < lines.length; i++) { context.fillText(lines[i], width / 2, y); y += lineHeight; }
        canvas.toBlob((blob) => { if (blob) saveAs(blob, 'fokusz-mester-poszt.png'); });
    };

    const filteredHistory = history.filter(item => {
        const isInTab = activeTab === 'favorites' ? item.isFavorite : true; if (!historySearchTerm) return isInTab;
        const searchTerm = historySearchTerm.toLowerCase();
        const contentMatch = item.results.some(res => res.toLowerCase().includes(searchTerm));
        const tagMatch = item.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        return isInTab && (contentMatch || tagMatch);
    });

    return (
        <>
            <div className="controls-panel">
                <button className="control-button" onClick={() => setIsHelpModalOpen(true)} title="Súgó">?</button>
                <button className="control-button" onClick={() => setIsHistoryModalOpen(true)} title="Előzmények">🕒</button>
                <button className="control-button" onClick={decreaseFontSize} title="Betűméret csökkentése">A-</button>
                <button className="control-button" onClick={increaseFontSize} title="Betűméret növelése">A+</button>
                <button className="control-button" onClick={toggleTheme} title="Sötét/Világos Mód Váltása">{theme === 'light' ? '🌙' : '☀️'}</button>
            </div>

            {isHelpModalOpen && (
                <div className="help-modal-overlay" onClick={() => setIsHelpModalOpen(false)}>
                    <div className="help-modal" onClick={e => e.stopPropagation()}>
                        <div className="help-modal-header"><h3>Súgóközpont</h3><button className="close-button" onClick={() => setIsHelpModalOpen(false)}>&times;</button></div>
                        <div className="help-content">
                            <h4>Üdvözöljük a Fókusz Mester Mobilban!</h4>
                            <p>Ez az alkalmazás az Ön személyes tartalomgeneráló asszisztense. Használja a bal oldali panelt szöveges ötletek, a jobb oldalit pedig képek alapján történő tartalomgyártáshoz.</p>
                            <h4>Szöveges Generátor</h4>
                            <p><strong>Alap Mód:</strong> Adja meg a poszt témáját, válasszon stílust és platformot, majd kattintson a generálás gombra.</p>
                            <p><strong>Haladó Mód:</strong> Kapcsolja be a "Haladó Mód"-ot a teljes kontrollért! Válasszon sablont (pl. Reels forgatókönyv, blog vázlat) vagy írjon teljesen egyedi parancsot a mesterséges intelligenciának.</p>
                            <h4>Képből Tartalom Varázsló</h4>
                            <p>Töltsön fel egy vagy több képet (pl. egy kvízről készült képernyőképeket). A program intelligensen kiszűri a felesleges, ismétlődő elemeket, és csak a releváns szövegből készít videó ötleteket.</p>
                            <h4>Eredmények Kezelése</h4>
                            <ul>
                                <li><strong>Finomítás:</strong> Minden eredménykártyánál lehetősége van az ötletet tovább csiszolni egyedi utasításokkal.</li>
                                <li><strong>Másolás:</strong> A piros gomb a tiszta szöveget, a szürke `{"</>"}` ikon a formázott (pl. félkövér) változatot másolja.</li>
                                <li><strong>Kép generálása:</strong> A kék gombbal a generált szövegből egy letölthető, nemzeti színű kép-sablont készíthet.</li>
                            </ul>
                            <h4>Előzmények és Archívum (🕒)</h4>
                            <p>Minden generált tartalom automatikusan elmentődik. Az Előzmények ablakban visszanézheti, kedvencnek jelölheti (★), egyedi címkékkel láthatja el és kereshet is közöttük. Az Import/Export gombokkal biztonsági mentést készíthet az archívumáról.</p>
                        </div>
                    </div>
                </div>
            )}
            
            {isHistoryModalOpen && (
                <div className="history-modal-overlay" onClick={() => setIsHistoryModalOpen(false)}>
                    <div className="history-modal" onClick={e => e.stopPropagation()}>
                        <div className="history-modal-header"><h3>Előzmények és Kedvencek</h3><button className="close-button" onClick={() => setIsHistoryModalOpen(false)}>&times;</button></div>
                        <div className="history-tabs">
                            <button className={`tab-button ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Összes Előzmény ({history.length})</button>
                            <button className={`tab-button ${activeTab === 'favorites' ? 'active' : ''}`} onClick={() => setActiveTab('favorites')}>Kedvencek ({history.filter(i => i.isFavorite).length})</button>
                        </div>
                        <div className="search-bar-container"><input type="text" className="search-input" placeholder="Keresés az előzményekben..." value={historySearchTerm} onChange={e => setHistorySearchTerm(e.target.value)} /></div>
                        <div className="history-list">
                            {filteredHistory.map(item => (
                                <div key={item.id} className="history-item">
                                    <div className="history-item-header">
                                        <div className="history-item-content">
                                            <div className="history-item-date">{item.timestamp} ({item.type === 'text' ? 'Szöveges' : 'Képes'})</div>
                                            <div className="history-item-preview">{item.results[0].substring(0, 100)}...</div>
                                        </div>
                                        <button className={`favorite-button ${item.isFavorite ? 'is-favorite' : ''}`} onClick={() => toggleFavorite(item.id)} title="Kedvencnek jelölés">★</button>
                                    </div>
                                    <div className="tags-input">
                                        <div className="tags-container">{item.tags.map(tag => (<span key={tag} className="tag">{tag} <button style={{all: 'unset', cursor: 'pointer', marginLeft: '4px'}} onClick={() => handleRemoveTag(item.id, tag)}>&times;</button></span>))}</div>
                                        <input type="text" placeholder="Új címke (Enter)" onKeyDown={e => { if (e.key === 'Enter') { handleAddTag(item.id); (e.target as HTMLInputElement).value = ''; e.preventDefault(); } }} onChange={e => setTagInput(e.target.value)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="history-modal-footer">
                            <label htmlFor="import-history" className="import-label">Importálás...</label>
                            <input id="import-history" type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportHistory} />
                            <button className="footer-button" onClick={handleExportHistory}>Exportálás</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="video-background"><video autoPlay loop muted id="bg-video"><source src="/background-video.mp4" type="video/mp4" /></video></div>
            
            <div className="dashboard-container">
                <div className="function-card">
                    <h1>Fókusz Mester Mobil</h1>
                    <div className="advanced-mode-toggle">
                        <label htmlFor="advanced-switch">Haladó Mód</label>
                        <label className="toggle-switch">
                            <input type="checkbox" id="advanced-switch" checked={isAdvancedMode} onChange={() => setIsAdvancedMode(prev => !prev)} />
                            <span className="slider"></span>
                        </label>
                    </div>
                    <form onSubmit={handleSubmit}>
                        {isAdvancedMode ? (
                            <>
                                <div className="form-group"><label htmlFor="template-select">Válassz egy sablont:</label><select id="template-select" value={selectedTemplateKey} onChange={handleTemplateChange}><option value="default">Általános Poszt</option><option value="reelsScript">Reels Forgatókönyv</option><option value="blogOutline">Blog Vázlat</option><option value="productDescription">Termékleírás</option></select></div>
                                <div className="form-group"><textarea className="prompt-textarea" value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} /></div>
                            </>
                        ) : (
                            <>
                                <div className="form-group"><label htmlFor="topic">1. Mi a poszt témája?</label><input type="text" id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Pl. új kézműves kávézó" required /></div>
                                <div className="form-group"><label htmlFor="style">2. Milyen stílusban?</label><select id="style" value={style} onChange={(e) => setStyle(e.target.value)}><option>Professzionális</option><option>Barátságos</option><option>Humoros</option><option>Motiváló</option></select></div>
                                <div className="form-group"><label>3. Melyik platformra?</label><div className="checkbox-group"><div className="checkbox-item"><input type="checkbox" id="facebook" name="Facebook" checked={platforms.Facebook} onChange={handlePlatformChange} /><label htmlFor="facebook">Facebook</label></div><div className="checkbox-item"><input type="checkbox" id="instagram" name="Instagram" checked={platforms.Instagram} onChange={handlePlatformChange} /><label htmlFor="instagram">Instagram</label></div><div className="checkbox-item"><input type="checkbox" id="linkedin" name="LinkedIn" checked={platforms.LinkedIn} onChange={handlePlatformChange} /><label htmlFor="linkedin">LinkedIn</label></div><div className="checkbox-item"><input type="checkbox" id="tiktok" name="TikTok" checked={platforms.TikTok} onChange={handlePlatformChange} /><label htmlFor="tiktok">TikTok</label></div><div className="checkbox-item"><input type="checkbox" id="telegram" name="Telegram" checked={platforms.Telegram} onChange={handlePlatformChange} /><label htmlFor="telegram">Telegram</label></div></div></div>
                            </>
                        )}
                        <button type="submit" disabled={isLoading || (isAdvancedMode ? !customPrompt : !topic)}>
                            {isLoading ? 'Generálás...' : 'Ötletek Generálása'}
                        </button>
                    </form>
                    {error && <p style={{ color: '#CD2A3E', textAlign: 'center', marginTop: '1rem', fontWeight: 'bold' }}>{error}</p>}
                    <div className="results">{results.map((result, index) => (<div key={index} className="result-card"><p>{result}</p><button className="image-gen-button" onClick={() => handleGenerateImage(result)}>Kép generálása</button><button className="copy-formatted-button" onClick={() => copyToClipboard(result, 'formatted')} title="Másolás formázással">{"</>"}</button><button className="copy-button" onClick={() => copyToClipboard(result, 'plain')}>Másolás</button><button className="footer-button" style={{position: 'absolute', bottom: '15px', right: '15px', width: 'auto'}} onClick={() => setRefiningState({index, type: 'text'})}>Finomítás</button>{refiningState?.index === index && refiningState?.type === 'text' && (<div className="refinement-controls"><input type="text" className="refinement-input" placeholder="Pl. Legyen viccesebb..." value={refinementInput} onChange={(e) => setRefinementInput(e.target.value)} /><button className="refinement-button" onClick={() => handleRefineResult(index, 'text')}>OK</button><button className="refinement-button" style={{backgroundColor: '#6c757d'}} onClick={() => setRefiningState(null)}>Mégse</button></div>)}</div>))}</div>
                </div>
                <div className="function-card">
                    <h2>Képből Tartalom Varázsló</h2>
                    <div className="image-wizard">
                        <label htmlFor="image-upload" className="file-upload-label">1. Képfájlok kiválasztása...</label>
                        <input id="image-upload" type="file" accept="image/*" multiple onChange={handleImageChange} />
                        {imageFiles.length > 0 && <p className="file-name">{imageFiles.length} kép kiválasztva</p>}
                        <button onClick={handleImageAnalysisAndGeneration} disabled={imageFiles.length === 0 || isProcessingImage} style={{marginTop: '1rem'}}>{isProcessingImage ? 'Feldolgozás...' : '2. Reels Videó Ötletek Készítése'}</button>
                        {isProcessingImage && (<><p className="processing-status">{processingStatus}</p>{processingProgress > 0 && (<div className="progress-container"><div className="progress-bar" style={{ width: `${processingProgress}%` }}></div></div>)}</>)}
                    </div>
                    {imageError && <p style={{ color: '#CD2A3E', textAlign: 'center', marginTop: '1rem', fontWeight: 'bold' }}>{imageError}</p>}
                    <div className="results">{imageResults.map((result, index) => (<div key={index} className="result-card"><p>{result}</p><button className="image-gen-button" onClick={() => handleGenerateImage(result)}>Kép generálása</button><button className="copy-formatted-button" onClick={() => copyToClipboard(result, 'formatted')} title="Másolás formázással">{"</>"}</button><button className="copy-button" onClick={() => copyToClipboard(result, 'plain')}>Másolás</button><button className="footer-button" style={{position: 'absolute', bottom: '15px', right: '15px', width: 'auto'}} onClick={() => setRefiningState({index, type: 'image'})}>Finomítás</button>{refiningState?.index === index && refiningState?.type === 'image' && (<div className="refinement-controls"><input type="text" className="refinement-input" placeholder="Pl. Adj hozzá több emojit..." value={refinementInput} onChange={(e) => setRefinementInput(e.target.value)} /><button className="refinement-button" onClick={() => handleRefineResult(index, 'image')}>OK</button><button className="refinement-button" style={{backgroundColor: '#6c757d'}} onClick={() => setRefiningState(null)}>Mégse</button></div>)}</div>))}</div>
                </div>
            </div>
        </>
    );
}

export default App;