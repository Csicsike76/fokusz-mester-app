// src/App.js

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import SubjectPage from './pages/SubjectPage';
import ContentPage from './pages/ContentPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import TeacherApprovalPage from './pages/TeacherApprovalPage';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import TeacherDashboardPage from './pages/TeacherDashboardPage';
import ProfilePage from './pages/ProfilePage';
import HelpCenterPage from './pages/HelpCenterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import InteraktivMatematika from './pages/InteraktivMatematika';

// --- JAVÍTOTT IMPORT SOROK ---
// A programot a helyes helyre, a belső 'src' mappába irányítjuk.
import AiContentWizard from './src/App'; // Feltételezve, hogy az AiContentWizard logikája az App.tsx-ben van
import './src/App.css'; // És a hozzá tartozó CSS

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="bejelentkezes" element={<LoginPage />} />
            <Route path="regisztracio" element={<RegistrationPage />} />
            <Route path="interaktiv-matematika" element={<InteraktivMatematika />} />
            
            {/* EZ AZ ÚJ ÚTVONAL AZ AI GENERÁTORNAK */}
            <Route path="ai-generator" element={<AiContentWizard />} />

            <Route path="targy/:subjectName" element={<SubjectPage />} />
            <Route path="tananyag/:slug" element={<ContentPage />} />
            <Route path="verify-email/:token" element={<EmailVerificationPage />} />
            <Route path="approve-teacher/:userId" element={<TeacherApprovalPage />} />
            <Route path="sugo" element={<HelpCenterPage />} />
            <Route path="elfelejtett-jelszo" element={<ForgotPasswordPage />} />
            <Route path="reset-password/:token" element={<ResetPasswordPage />} />

            <Route element={<ProtectedRoute allowedRoles={['student', 'teacher']} />}>
              <Route path="profil" element={<ProfilePage />} />
            </Route>
            
            <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
              <Route path="dashboard/teacher" element={<TeacherDashboardPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;