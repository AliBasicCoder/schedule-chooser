import React from 'react';
import type { Route } from './+types/home';
import { ScheduleProvider, useSchedule } from '../context/ScheduleContext';
import { Navbar } from '../components/Navbar';
import { ToastContainer } from '../components/ToastContainer';
import { SessionPickerModal } from '../components/SessionPickerModal';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { ImportScreen } from '../components/import/ImportScreen';
import { SetupScreen } from '../components/setup/SetupScreen';
import { ResultsScreen } from '../components/results/ResultsScreen';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Schedule Optimizer · Find Your Perfect Schedule' },
    {
      name: 'description',
      content:
        'Student Schedule Optimizer — find your perfect conflict-free class schedule with smart ranking and interactive constraints.',
    },
  ];
}

function MainContent() {
  const { currentScreen } = useSchedule();

  return (
    <main className="min-h-[calc(100vh-64px)]">
      {currentScreen === 'import' && <ImportScreen />}
      {currentScreen === 'setup' && <SetupScreen />}
      {currentScreen === 'results' && <ResultsScreen />}
    </main>
  );
}

export default function Home() {
  return (
    <ScheduleProvider>
      <div className="relative min-h-screen">
        <Navbar />
        <MainContent />
        <ToastContainer />
        <SessionPickerModal />
        <LoadingOverlay />
      </div>
    </ScheduleProvider>
  );
}
