import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Protected from './components/auth/Protected';
import AdminOnly from './components/auth/AdminOnly';
import ScrollToTop from './components/layout/ScrollToTop';
import ErrorBoundary from './components/common/ErrorBoundary';
import PWAInstallPrompt from './components/common/PWAInstallPrompt';

// Route-level Code Splitting for optimal initial bundle & fast FCP/LCP
const HomePage = lazy(() => import('./pages/HomePage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const PlansPage = lazy(() => import('./pages/PlansPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const DepositPage = lazy(() => import('./pages/DepositPage'));
const WithdrawPage = lazy(() => import('./pages/WithdrawPage'));
const LuckyWheelPage = lazy(() => import('./pages/LuckyWheelPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SecurityPage = lazy(() => import('./pages/SecurityPage'));
const GenericSettingsPage = lazy(() => import('./pages/GenericSettingsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const NewsPage = lazy(() => import('./pages/NewsPage'));
const CheckinPage = lazy(() => import('./pages/CheckinPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const LogoutPage = lazy(() => import('./pages/LogoutPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

const PageFallback = () => (
  <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
    <div style={{ width: 28, height: 28, border: '3px solid rgba(203,78,255,0.2)', borderTopColor: '#ce2bff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <ScrollToTop />
      <PWAInstallPrompt />
      <Suspense fallback={<PageFallback />}>
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
      </Suspense>
    </ErrorBoundary>
  );
}
