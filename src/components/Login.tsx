import React, { useState } from 'react';

interface LoginProps {
  onLogin: (username: string) => Promise<void>;
  isLoading?: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin, isLoading = false }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedUsername = username.trim();
    if (!trimmedUsername) return;
    try {
      await onLogin(trimmedUsername);
    } catch (err: any) {
      setError(err.message || 'Unbekannter Fehler');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              WG Casting App
            </h1>
            <p className="text-gray-600">
              Gib erstmal deinen Namen ein. Auf diesem werden deine Zeiten gespeichert. Melde dich später einfach mit dem selben Namen wieder an.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Dein Name
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
                placeholder="Gib deinen Namen ein..."
                required
                disabled={isLoading}
                maxLength={50}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm mb-2">{error}</div>
            )}

            <button
              type="submit"
              disabled={!username.trim() || isLoading}
              className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg text-lg font-medium hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Verbinden...
                </div>
              ) : (
                'Weiter'
              )}
            </button>
          </form>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>So geht's:</strong> Jeder Mitbewohner gibt seinen Namen an und kann danach eintragen, wann dieser Zeit für ein Casting hätte.
              Die Kandidaten werden aufgelistet und es kann abgestimmt werden.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
