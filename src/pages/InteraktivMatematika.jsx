import React, { useEffect, useState } from 'react';
import { fetchTananyag } from '../utils/fetchTananyag';
import { Link } from 'react-router-dom';

const InteraktivMatematika = () => {
  const [tananyag, setTananyag] = useState(null);

  useEffect(() => {
    fetchTananyag('interaktav-matematika-gyljtemany.json')
      .then(data => setTananyag(data));
  }, []);

  if (!tananyag) return <p>Betöltés...</p>;

  return (
    <div>
      <h1>{tananyag.title}</h1>
      <p>{tananyag.description}</p>

      {tananyag.questions.map((section, index) => (
        <div key={index}>
          <h2>{section.title}</h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {section.cards.map((card, idx) => (
              <Link
                key={idx}
                to={`/tananyag/${card.link}`}
                style={{
                  border: '1px solid #ccc',
                  padding: '10px',
                  borderRadius: '5px',
                  textDecoration: 'none',
                  color: 'black',
                }}
              >
                {card.text}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default InteraktivMatematika;
