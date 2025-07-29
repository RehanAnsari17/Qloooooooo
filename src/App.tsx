import React, { useState, useEffect } from 'react';
import { UserAuthentication } from './components/UserAuthentication';
import { ChatInterface } from './components/ChatInterface';
import { ChatHistory } from './components/ChatHistory';
import { MessageCircle, History, User } from 'lucide-react';
import { authService, UserData } from './services/authService';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';

export interface UserProfile {
  name: string;
  age: number;
  location: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: string;
  restaurants?: any[];
}

export interface ChatSession {
  id: string;
  user_profile: UserProfile;
  messages: ChatMessage[];
  created_at: string;
  ended_at?: string;
  is_active: boolean;
}

type AppState = 'onboarding' | 'chat' | 'history';

function App() {
  const [appState, setAppState] = useState<AppState>('onboarding');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedHistorySession, setSelectedHistorySession] = useState<ChatSession | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userData = await authService.getCurrentUserData();
          if (userData) {
            setUserData(userData);
            setUserProfile({
              name: userData.name,
              age: userData.age,
              location: userData.location
            });
            // Auto-create session for returning user
            const sessionResponse = await fetch('http://localhost:8000/api/register-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: userData.name,
                age: userData.age,
                location: userData.location
              })
            });
            const sessionData = await sessionResponse.json();
            setCurrentSessionId(sessionData.session_id);
            setAppState('chat');
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      } else {
        setUserData(null);
        setUserProfile(null);
        setCurrentSessionId(null);
        setAppState('onboarding');
      }
      setIsCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUserAuthenticated = (profile: UserProfile, sessionId: string, userData: UserData) => {
    setUserProfile(profile);
    setUserData(userData);
    setCurrentSessionId(sessionId);
    setAppState('chat');
  };

  const handleStartNewChat = () => {
    setSelectedHistorySession(null);
    setAppState('onboarding');
  };

  const handleViewHistory = () => {
    setAppState('history');
  };

  const handleViewProfile = () => {
    setAppState('onboarding');
  };

  const handleBackToChat = () => {
    if (currentSessionId) {
      setAppState('chat');
    } else {
      setAppState('onboarding');
    }
  };

  const handleViewHistorySession = (session: ChatSession) => {
    setSelectedHistorySession(session);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setUserProfile(null);
      setUserData(null);
      setCurrentSessionId(null);
      setAppState('onboarding');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 w-full">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-orange-100 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-orange-500 to-green-500 p-2 rounded-lg">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">FoodieBot</h1>
                <p className="text-sm text-gray-600">Your Restaurant Assistant</p>
              </div>
            </div>
            
            {userProfile && (
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleViewHistory}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-orange-100 rounded-lg transition-colors"
                >
                  <History className="w-4 h-4" />
                  <span>History</span>
                </button>
                <button
                  onClick={handleViewProfile}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-orange-100 rounded-lg transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>{userProfile.name}</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:bg-orange-100 px-3 py-2 rounded-lg transition-colors text-sm"
                >
                  Logout
                </button>
                <button
                  onClick={handleStartNewChat}
                  className="bg-gradient-to-r from-orange-500 to-green-500 text-white px-4 py-2 rounded-lg hover:from-orange-600 hover:to-green-600 transition-all duration-200"
                >
                  New Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {appState === 'onboarding' && (
          <div className="max-w-2xl mx-auto">
          <UserAuthentication onUserAuthenticated={handleUserAuthenticated} />
          </div>
        )}
        
        {appState === 'chat' && currentSessionId && (
          <ChatInterface 
            sessionId={currentSessionId} 
            userProfile={userProfile!}
            onViewHistory={handleViewHistory}
          />
        )}
        
        {appState === 'history' && (
          <div className="max-w-6xl mx-auto">
          <ChatHistory 
            onBackToChat={handleBackToChat}
            onViewSession={handleViewHistorySession}
            selectedSession={selectedHistorySession}
          />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
