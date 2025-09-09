import React, { useState, useEffect } from 'react';
import AvailabilityCalendar from './components/AvailabilityCalendar';
import CandidateList from './components/CandidateList';
import Login from './components/Login';
import AppointmentList from './components/AppointmentList';
import { DataProvider, useData } from './context/DataContext';

type TabType = 'calendar' | 'candidates' | 'appointments';

const MainApp: React.FC = () => {
  const { currentUser, logout, login, isLoading, fetchAppointmentsFromServer, fetchCandidatesFromServer } = useData();
  const [activeTab, setActiveTab] = useState<TabType>('calendar');

  useEffect(() => {
    if (activeTab === 'appointments') {
      fetchAppointmentsFromServer();
    } else if (activeTab === 'candidates') {
      fetchCandidatesFromServer();
    }
  }, [activeTab]); // intentionally omit functions from deps to avoid re-run on identity change

  if (!currentUser) {
    return <Login onLogin={login} isLoading={isLoading} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">
              WG Casting App
            </h1>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">Hey, {currentUser} :)</span>
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-700 touch-manipulation"
              >
                Ausloggen
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`py-4 px-1 border-b-2 font-medium text-sm touch-manipulation ${
                activeTab === 'calendar'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Kalendar
            </button>
            <button
              onClick={() => setActiveTab('candidates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm touch-manipulation ${
                activeTab === 'candidates'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Kandidaten
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm touch-manipulation ${
                activeTab === 'appointments'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Termine
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-md mx-auto">
        {activeTab === 'calendar' && <AvailabilityCalendar />}
        {activeTab === 'candidates' && <CandidateList />}
        {activeTab === 'appointments' && <AppointmentList />}
      </main>
    </div>
  );
};

function App() {
  return (
    <DataProvider>
      <MainApp />
    </DataProvider>
  );
}

export default App;
