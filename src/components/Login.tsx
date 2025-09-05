import React, { useState } from 'react';

interface LoginProps {
  onLogin: (username: string) => void;
  isLoading?: boolean;
}

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflictUsername: string;
}

const ConflictModal: React.FC<ConflictModalProps> = ({ isOpen, onClose, conflictUsername }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-center text-gray-900 mb-2">
            Username Already Taken
          </h3>
          <p className="text-center text-gray-600 mb-6">
            Dieser Name <strong>"{conflictUsername}"</strong> ist schon registriert. Bitte wähle einen anderen Namen.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-primary-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

const Login: React.FC<LoginProps> = ({ onLogin, isLoading = false }) => {
  const [username, setUsername] = useState('');
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictUsername, setConflictUsername] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    
    if (!trimmedUsername) return;

    try {
      // Check if username already exists
      const response = await fetch('http://localhost:3001/api/usernames');
      if (response.ok) {
        const existingUsernames = await response.json();
        
        if (existingUsernames.includes(trimmedUsername)) {
          setConflictUsername(trimmedUsername);
          setShowConflictModal(true);
          return;
        }
      }
      
      // Username is available, proceed with login
      onLogin(trimmedUsername);
    } catch (error) {
      console.error('Error checking username availability:', error);
      // If server is not available, still allow login (fallback)
      onLogin(trimmedUsername);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              WG Casting
            </h1>
            <p className="text-gray-600">
              Gib erstmal deinen Namen ein, um deine Zeiten zu wählen.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
                placeholder="Enter your name..."
                required
                disabled={isLoading}
                maxLength={50}
              />
            </div>

            <button
              type="submit"
              disabled={!username.trim() || isLoading}
              className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg text-lg font-medium hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Connecting...
                </div>
              ) : (
                'Continue'
              )}
            </button>
          </form>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Jeder Mitbewohner muss seinen eigenen Namen eingeben.
              Nachedm du deinen Namen eingegeben hast, kannst du deine verfügbaren Zeiten auswählen.
            </p>
          </div>
        </div>
      </div>

      {/* Conflict Modal */}
      <ConflictModal
        isOpen={showConflictModal}
        onClose={() => {
          setShowConflictModal(false);
          setConflictUsername('');
          setUsername('');
        }}
        conflictUsername={conflictUsername}
      />
    </div>
  );
};

export default Login;
