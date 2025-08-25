import { useState } from "react";

function SzamokIrasaOlvasasa() {
  const htmlContent = `
    <p>A természetes számokat a tízes számrendszerben írjuk le.
    Minden számjegy helyi értéke tízzel nő, ha eggyel balra lépünk.
    Például a 325-ben: a 3 a százasok helyén áll, a 2 a tízesekén, az 5 az egyesekén.</p>
  `;

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAISummary = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/api/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: htmlContent })
      });
      const data = await res.json();
      setSummary(data.summary);
    } catch (err) {
      setSummary("⚠️ Hiba történt az AI összefoglaló lekérésekor.");
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>1.1 Számok írása, olvasása</h2>
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />

      <button onClick={handleAISummary} disabled={loading}>
        {loading ? "Generálás..." : "AI Összefoglaló"}
      </button>

      {summary && (
        <div className="ai-summary">
          <strong>Tanulnivaló:</strong>
          <p>{summary}</p>
        </div>
      )}
    </div>
  );
}

export default SzamokIrasaOlvasasa;
