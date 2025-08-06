import React from 'react';
import { useParams } from 'react-router-dom';
import { curriculum } from '../data/curriculumData';
import ConditionalLink from '../components/ConditionalLink/ConditionalLink'; // Az új komponenst használjuk

const SubjectPage = () => {
  const { subjectName, grade } = useParams();
  
  const subjectData = curriculum[subjectName];
  const gradeData = subjectData?.grades[grade];

  if (!subjectData || !gradeData) {
    return <h2>A keresett tananyag nem található.</h2>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>{subjectData.title} - {gradeData.title}</h1>
      <p>Válassz az alábbi témakörök közül a gyakorláshoz.</p>
      
      <div className="card-container">
        {gradeData.topics.map(topic => (
          <div className="card" key={topic.id}>
            <h3>{topic.title}</h3>
            <p>Itt jöhet egy rövid leírás a témakörről...</p>
            <ConditionalLink to={`/kviz/${topic.quizId}`} className="quiz-link">
              Gyakorló Kvíz →
            </ConditionalLink>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubjectPage;