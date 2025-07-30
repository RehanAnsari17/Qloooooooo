import React, { useState, useEffect } from 'react';
import { UserAuthentication } from './components/UserAuthentication';
import { ChatInterface } from './components/ChatInterface';
import { ChatHistory } from './components/ChatHistory';
import { authService, UserData } from './services/authService';
import { locationService } from './services/locationService';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';
import { Utensils, MapPin, Edit3, LogOut, MessageSquare, Plus, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

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
  restaurants?: RestaurantData[];
}

export interface RestaurantData {
  id: string;
  name: string;
  image_url?: string;
  rating?: number;
  address?: string;
  phone?: string;
  website?: string;
  cuisine_type?: string;
  price_range?: string;
  description?: string;
}

export interface ChatSession {
  id: string;
  user_profile: UserProfile;
  messages: ChatMessage[];
  created_at: string;
  ended_at?: string;
  is_active: boolean;
}

type AppState = 'loading' | 'auth' | 'chat' | 'history';

function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

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
              location: userData.currentLocation
            });
            setAppState('chat');
          }
        } catch (error) {
          console.error('Error loading user data:', error);
          setAppState('auth');
        }
      } else {
        setUserData(null);
        setUserProfile(null);
        setSessionId(null);
        setAppState('auth');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleUserAuthenticated = async (profile: UserProfile, newSessionId: string, newUserData: UserData) => {
    setUserData(newUserData);
    setUserProfile(profile);
    setSessionId(newSessionId);
    setAppState('chat');
  };

  const handleNewChat = async () => {
    if (!userProfile || !userData) return;
    
    try {
      // Create a simple profile object that matches backend UserProfile model
      const simpleProfile = {
        name: userProfile.name,
        age: userProfile.age,
        location: userProfile.location
      };
      
      console.log('Creating new chat with profile:', simpleProfile);
      
      const response = await axios.post('http://localhost:8000/api/register-user', simpleProfile);
      
      if (response.data && response.data.session_id) {
        console.log('New chat created successfully:', response.data.session_id);
        setSessionId(response.data.session_id);
        setSelectedSession(null);
        setAppState('chat');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Error creating new chat:', error);
      
      // More specific error handling
      let errorMessage = 'Failed to create new chat. ';
      if (error.response?.status === 422) {
        errorMessage += 'Invalid data format. Please try logging out and back in.';
      } else if (error.response?.status === 500) {
        errorMessage += 'Server error. Please try again later.';
      } else {
        errorMessage += 'Please check your connection and try again.';
      }
      
      alert(errorMessage);
    }
  };

  const handleUserAuthenticated2 = async (profile: UserProfile, newSessionId: string, newUserData: UserData) => {
    console.log('User authenticated:', { profile, newSessionId, newUserData });
    
    // Ensure the profile location matches the current location from userData
    const updatedProfile = {
      ...profile,
      location: newUserData.currentLocation || profile.location
    };
    
    setUserData(newUserData);
    setUserProfile(updatedProfile);
    setSessionId(newSessionId);
    setAppState('chat');
  };

  const handleViewHistory = () => {
    setAppState('history');
  };

  const handleBackToChat = () => {
    setSelectedSession(null);
    setAppState('chat');
  };

  const handleViewSession = (session: ChatSession | null) => {
    setSelectedSession(session);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setUserData(null);
      setUserProfile(null);
      setSessionId(null);
      setSelectedSession(null);
      setAppState('auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleLocationUpdate = async (newLocation: string) => {
    if (!userData || !userProfile) return;

    try {
      setIsUpdatingLocation(true);
      
      // Update in Firebase
      await authService.updateCurrentLocation(newLocation);
      
      // Update local state
      setUserData(prev => prev ? { ...prev, currentLocation: newLocation } : null);
      setUserProfile(prev => prev ? { ...prev, location: newLocation } : null);
      
      setShowLocationModal(false);
    } catch (error) {
      console.error('Error updating location:', error);
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const handleGPSLocation = async () => {
    setIsUpdatingLocation(true);
    try {
      const locationData = await locationService.getCurrentLocation();
      const locationString = `${locationData.city}, ${locationData.country}`;
      await handleLocationUpdate(locationString);
    } catch (error: any) {
      console.error('GPS location error:', error);
      alert(error.message);
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const handleManualLocation = async (location: string) => {
    if (!location.trim()) {
      alert('Please enter a valid location');
      return;
    }
    
    setIsUpdatingLocation(true);
    try {
      const validation = await locationService.validateLocation(location);
      if (validation.isValid) {
        const locationString = validation.suggestion || location;
        await handleLocationUpdate(locationString);
      } else {
        alert('Please enter a valid location');
      }
    } catch (error) {
      console.error('Manual location error:', error);
      alert('Unable to validate location');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  if (appState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (appState === 'auth') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-green-50 flex items-center justify-center p-4">
        <UserAuthentication onUserAuthenticated={handleUserAuthenticated} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-orange-500 to-green-500 w-10 h-10 rounded-full flex items-center justify-center">
                <Utensils className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">FoodieBot</h1>
                <p className="text-sm text-gray-600">Welcome, {userData?.name}!</p>
              </div>
            </div>

            {/* Current Location */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
                <MapPin className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-gray-700">{userProfile?.location}</span>
                <button
                  onClick={() => setShowLocationModal(true)}
                  className="text-orange-500 hover:text-orange-600 text-sm font-medium"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              {appState === 'chat' && (
                <>
                  <button
                    onClick={handleNewChat}
                    className="bg-gradient-to-r from-orange-500 to-green-500 text-white px-4 py-2 rounded-lg hover:from-orange-600 hover:to-green-600 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Chat</span>
                  </button>
                  <button
                    onClick={handleViewHistory}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>History</span>
                  </button>
                </>
              )}
              <button
                onClick={handleLogout}
                className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {appState === 'chat' && userProfile && sessionId && userData && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ChatInterface
                sessionId={sessionId}
                userProfile={userProfile}
                userData={userData}
                onViewHistory={handleViewHistory}
              />
            </motion.div>
          )}

          {appState === 'history' && userData && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ChatHistory
                userData={userData}
                onBackToChat={handleBackToChat}
                onViewSession={handleViewSession}
                selectedSession={selectedSession}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Location Update Modal */}
      <AnimatePresence>
        {showLocationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
            >
              <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center">
                <MapPin className="w-6 h-6 mr-2 text-orange-500" />
                Update Your Location
              </h3>
              
              <p className="text-gray-600 mb-6">
                Choose how you'd like to update your current location for better restaurant recommendations:
              </p>

              <div className="space-y-4">
                <button
                  onClick={handleGPSLocation}
                  disabled={isUpdatingLocation}
                  className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isUpdatingLocation ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <>
                      <Navigation className="w-5 h-5" />
                      <span>Use GPS Location</span>
                    </>
                  )}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">or</span>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Enter city, state, or country"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-3"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleManualLocation((e.target as HTMLInputElement).value);
                      }
                    }}
                    disabled={isUpdatingLocation}
                  />
                  <button
                    onClick={() => {
                      const input = document.querySelector('input[placeholder="Enter city, state, or country"]') as HTMLInputElement;
                      handleManualLocation(input.value);
                    }}
                    disabled={isUpdatingLocation}
                    className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {isUpdatingLocation ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <Edit3 className="w-5 h-5" />
                        <span>Set Manual Location</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowLocationModal(false)}
                className="w-full mt-4 text-gray-600 hover:text-gray-800 py-2"
                disabled={isUpdatingLocation}
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
