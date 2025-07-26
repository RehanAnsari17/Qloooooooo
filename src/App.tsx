import React, { useState, useEffect } from 'react';
import { UserOnboarding } from './components/UserOnboarding';
import { ChatInterface } from './components/ChatInterface';
import { ChatHistory } from './components/ChatHistory';
import { MessageCircle, History, User } from 'lucide-react';

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
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedHistorySession, setSelectedHistorySession] = useState<ChatSession | null>(null);

  const handleUserRegistered = (profile: UserProfile, sessionId: string) => {
    setUserProfile(profile);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-orange-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {appState === 'onboarding' && (
          <UserOnboarding onUserRegistered={handleUserRegistered} />
        )}
        
        {appState === 'chat' && currentSessionId && (
          <ChatInterface 
            sessionId={currentSessionId} 
            userProfile={userProfile!}
            onViewHistory={handleViewHistory}
          />
        )}
        
        {appState === 'history' && (
          <ChatHistory 
            onBackToChat={handleBackToChat}
            onViewSession={handleViewHistorySession}
            selectedSession={selectedHistorySession}
          />
        )}
      </main>
    </div>
  );
}

export default App;