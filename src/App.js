import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import SubjectPage from './pages/SubjectPage';
import QuizPage from './pages/QuizPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import TeacherApprovalPage from './pages/TeacherApprovalPage';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import TeacherDashboardPage from './pages/TeacherDashboardPage';
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
            <Route path="targy/:subjectName/:grade" element={<SubjectPage />} />
            <Route path="kviz/:slug" element={<QuizPage />} />
            <Route path="verify-email/:token" element={<EmailVerificationPage />} />
            <Route path="approve-teacher/:userId" element={<TeacherApprovalPage />} />

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