import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Protected from './components/auth/Protected';
import AdminOnly from './components/auth/AdminOnly';
import ScrollToTop from './components/layout/ScrollToTop';
import ErrorBoundary from './components/common/ErrorBoundary';
import PWAInstallPrompt from './components/common/PWAInstallPrompt';

import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import TasksPage from './pages/TasksPage';
import PlansPage from './pages/PlansPage';
import TeamPage from './pages/TeamPage';
import WalletPage from './pages/WalletPage';
import DepositPage from './pages/DepositPage';
import WithdrawPage from './pages/WithdrawPage';
import LuckyWheelPage from './pages/LuckyWheelPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import SecurityPage from './pages/SecurityPage';
import GenericSettingsPage from './pages/GenericSettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import NewsPage from './pages/NewsPage';
import CheckinPage from './pages/CheckinPage';
import SupportPage from './pages/SupportPage';
import LogoutPage from './pages/LogoutPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <ErrorBoundary>
      <ScrollToTop />
      <PWAInstallPrompt />
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />

          <Route path="/" element={<Protected><HomePage /></Protected>} />
          <Route path="/home" element={<Protected><HomePage /></Protected>} />
          <Route path="/tasks" element={<Protected><TasksPage /></Protected>} />
          <Route path="/plans" element={<Protected><PlansPage /></Protected>} />
          <Route path="/team" element={<Protected><TeamPage /></Protected>} />
          <Route path="/wallet" element={<Protected><WalletPage /></Protected>} />
          <Route path="/deposit" element={<Protected><DepositPage /></Protected>} />
          <Route path="/recharge" element={<Protected><DepositPage /></Protected>} />
          <Route path="/withdraw" element={<Protected><WithdrawPage /></Protected>} />
          <Route path="/lucky-wheel" element={<Protected><LuckyWheelPage /></Protected>} />
          <Route path="/checkin" element={<Protected><CheckinPage /></Protected>} />
          <Route path="/daily-checkin" element={<Protected><CheckinPage /></Protected>} />
          <Route path="/news" element={<Protected><NewsPage /></Protected>} />
          <Route path="/news-center" element={<Protected><NewsPage /></Protected>} />
          <Route path="/notifications" element={<Protected><NotificationsPage /></Protected>} />
          <Route path="/support" element={<Protected><SupportPage /></Protected>} />
          <Route path="/help" element={<Protected><SupportPage /></Protected>} />
          <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
          <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
          <Route path="/settings/profile" element={<Protected><ProfilePage /></Protected>} />
          <Route path="/settings/security" element={<Protected><SecurityPage /></Protected>} />
          <Route path="/settings/notifications" element={<Protected><NotificationsPage /></Protected>} />
          <Route path="/settings/support" element={<Protected><SupportPage /></Protected>} />
          <Route
            path="/settings/language"
            element={
              <Protected>
                <GenericSettingsPage
                  title="Language & Region"
                  desc="Configure language and regional currency preferences."
                  type="language"
                />
              </Protected>
            }
          />

          <Route path="/admin" element={<AdminOnly><AdminPage /></AdminOnly>} />
          <Route path="/logout" element={<LogoutPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </ErrorBoundary>
  );
}
