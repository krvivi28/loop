import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Tour } from './components/Tour';
import { checkReminders } from './lib/notifications';
import { applyTheme } from './lib/theme';
import Coach from './pages/Coach';
import Food from './pages/Food';
import Settings from './pages/Settings';
import Stack from './pages/Stack';
import Stats from './pages/Stats';
import Today from './pages/Today';
import Onboarding from './pages/Onboarding';
import { useApp } from './state/AppContext';
import { useRef } from 'react';

export default function App() {
  const { data, user } = useApp();
  const { theme, accentColor } = data.settings;

  useEffect(() => {
    applyTheme(theme, accentColor);
    localStorage.setItem('fitstack:theme', theme);
    localStorage.setItem('fitstack:accent', accentColor);
  }, [theme, accentColor]);

  // Reminder loop: checks every 30 s while the app is open.
  const latest = useRef(data);
  latest.current = data;
  useEffect(() => {
    const tick = () => checkReminders(latest.current);
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, []);

  if (!user.onboarded) return <Onboarding />;

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Today />} />
          <Route path="stack" element={<Stack />} />
          <Route path="food" element={<Food />} />
          <Route path="stats" element={<Stats />} />
          <Route path="coach" element={<Coach />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Today />} />
        </Route>
      </Routes>
      <Tour open={!user.tourSeen} />
    </>
  );
}
