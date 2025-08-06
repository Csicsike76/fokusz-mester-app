import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import SubjectPage from './pages/SubjectPage';
import QuizPage from './pages/QuizPage';
import './App.css';

function App() {
  return (
    // A BrowserRouter van legkívül
    <BrowserRouter>
      {/* Az AuthProvider van belül, így hozzáfér a router adataihoz is, ha kell */}
      <AuthProvider>
        {/* A Layout veszi körbe az oldalakat, hogy a Navbar mindig látszódjon */}
        <Layout>
          {/* A Routes határozza meg, melyik URL melyik oldalt töltse be */}
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/bejelentkezes" element={<LoginPage />} />
            <Route path="/regisztracio" element={<RegistrationPage />} />
            <Route path="/targy/:subjectName/:grade" element={<SubjectPage />} />
            <Route path="/kviz/:quizId" element={<QuizPage />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;