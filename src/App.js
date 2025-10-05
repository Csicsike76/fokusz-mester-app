// src/App.js

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { HelmetProvider } from 'react-helmet-async'; // HOZZÁADVA: HelmetProvider importálása

import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import SubjectPage from './pages/SubjectPage';
import ContentPage from './pages/ContentPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import TeacherDashboardPage from './pages/TeacherDashboardPage';
import ProfilePage from './pages/ProfilePage';
import HelpCenterPage from './pages/HelpCenterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import InteraktivMatematika from './pages/InteraktivMatematika';
import ContactPage from './pages/ContactPage';
import AdminPage from './pages/AdminPage';
import ClassDetailsPage from './pages/ClassDetailsPage';
import AszfPage from './pages/AszfPage';
import AdatkezelesiPage from './pages/AdatkezelesiPage';
import DownloadGuidePage from './pages/DownloadGuidePage'; 
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <HelmetProvider> {/* HOZZÁADVA: HelmetProvider becsomagolja az alkalmazást */}
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="bejelentkezes" element={<LoginPage />} />
              <Route path="regisztracio" element={<RegistrationPage />} />
              <Route path="interaktiv-matematika" element={<InteraktivMatematika />} />

              <Route path="targy/:subjectName" element={<SubjectPage />} />
              <Route path="tananyag/:slug" element={<ContentPage />} />
              
              <Route path="verify-email/:token" element={<EmailVerificationPage />} />
              <Route path="sugo" element={<HelpCenterPage />} />
              <Route path="kapcsolat" element={<ContactPage />} />
              <Route path="elfelejtett-jelszo" element={<ForgotPasswordPage />} />
              <Route path="reset-password/:token" element={<ResetPasswordPage />} />

              {/* ÚTVONALAK A JOGI DOKUMENTUMOKHOZ */}
              <Route path="aszf" element={<AszfPage />} />
              <Route path="adatkezeles" element={<AdatkezelesiPage />} />

              {/* MÓDOSÍTOTT ÚTVONAL A TELEPÍTÉSI ÚTMUTATÓHOZ */}
              <Route path="alkalmazas-letoltese" element={<DownloadGuidePage />} />

              <Route element={<ProtectedRoute allowedRoles={['student', 'teacher', 'admin']} />}>
                <Route path="profil" element={<ProfilePage />} />
              </Route>
              
              <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
                <Route path="dashboard/teacher" element={<TeacherDashboardPage />} />
                <Route path="dashboard/teacher/class/:classId" element={<ClassDetailsPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="admin" element={<AdminPage />} />
              </Route>

            </Route>
          </Routes>
        </HelmetProvider> {/* HOZZÁADVA: HelmetProvider vége */}
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;