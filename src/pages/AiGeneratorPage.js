// src/pages/AiGeneratorPage.js
import React from 'react';

const AiGeneratorPage = () => {
  // Fontos: Az 'src' linket cseréld majd ki arra a pontos linkre, amit küldök!
  const generatorUrl = "https://fokusz-mester-ai-varazslo.netlify.app"; 

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      <iframe
        src={generatorUrl}
        title="AI Tartalom Varázsló"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
      />
    </div>
  );
};

export default AiGeneratorPage;