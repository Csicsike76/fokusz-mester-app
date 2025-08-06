import React from 'react';
// Az importot javítottuk itt:
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import SubjectPage from './pages/SubjectPage';
import QuizPage from './pages/QuizPage';
import RegistrationPage from './pages/RegistrationPage'; 
import LoginPage from './pages/LoginPage'; 
import './App.css'; 

function App() {
  return (
    // A komponenst is javítottuk itt:
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/targy/:subjectName/:grade" element={<SubjectPage />} />
          <Route path="/kviz/:quizId" element={<QuizPage />} />
          <Route path="/regisztracio" element={<RegistrationPage />} />
          <Route path="/bejelentkezes" element={<LoginPage />} />  
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;