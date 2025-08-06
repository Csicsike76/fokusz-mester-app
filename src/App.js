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
    <BrowserRouter>
      <AuthProvider>
        {/* A Routes most már közvetlenül az AuthProvider-ben van */}
        <Routes>
          {/* Létrehozunk egy "layout" útvonalat, ami a Navbar-t és a többi keret-elemet tartalmazza */}
          <Route path="/" element={<Layout />}>
            {/* Ezek a "gyermek" útvonalak fognak megjelenni az Outlet helyén */}
            <Route index element={<HomePage />} />
            <Route path="bejelentkezes" element={<LoginPage />} />
            <Route path="regisztracio" element={<RegistrationPage />} />
            <Route path="targy/:subjectName/:grade" element={<SubjectPage />} />
            <Route path="kviz/:quizId" element={<QuizPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;