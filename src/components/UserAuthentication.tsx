import React, { useState } from 'react';
import { UserProfile } from '../App';
import { User, MapPin, Calendar, ArrowRight, Utensils, Mail, Lock, Eye, EyeOff, Loader, Navigation, Edit3 } from 'lucide-react';
import { authService, UserData } from '../services/authService';
import { locationService, LocationData } from '../services/locationService';
import { motion, AnimatePresence } from 'framer-motion';

interface UserAuthenticationProps {
  onUserAuthenticated: (profile: UserProfile, sessionId: string, userData: UserData) => void;
}

type AuthMode = 'login' | 'register';
type LocationMode = 'gps' | 'manual';

export const UserAuthentication: React.FC<UserAuthenticationProps> = ({ onUserAuthenticated }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationMode, setLocationMode] = useState<LocationMode>('gps');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    age: 25,
    location: ''
  });
  
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [pendingUserData, setPendingUserData] = useState<UserData | null>(null);

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (authMode === 'register') {
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required';
      }
      
      if (formData.age < 13 || formData.age > 120) {
        newErrors.age = 'Please enter a valid age between 13 and 120';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      let userData: UserData;
      
      if (authMode === 'login') {
        userData = await authService.login(formData.email, formData.password);
        // For login, use existing location from database
        const profile: UserProfile = {
          name: userData.name,
          age: userData.age,
          location: userData.location
        };
        
        // Create session and proceed
        const sessionResponse = await fetch('http://localhost:8000/api/register-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile)
        });
        
        const sessionData = await sessionResponse.json();
        onUserAuthenticated(profile, sessionData.session_id, userData);
        
      } else {
        // For registration, we need location first
        setPendingUserData({
          uid: '',
          email: formData.email,
          name: formData.name,
          age: formData.age,
          location: '',
          createdAt: ''
        });
        setShowLocationModal(true);
      }
    } catch (error: any) {
      setErrors({ general: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSubmit = async (locationString: string) => {
    if (!pendingUserData) return;
    
    setIsLoading(true);
    
    try {
      // Register user with location
      const userData = await authService.register(
        formData.email,
        formData.password,
        formData.name,
        formData.age,
        locationString
      );
      
      const profile: UserProfile = {
        name: userData.name,
        age: userData.age,
        location: userData.location
      };
      
      // Create session
      const sessionResponse = await fetch('http://localhost:8000/api/register-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      
      const sessionData = await sessionResponse.json();
      onUserAuthenticated(profile, sessionData.session_id, userData);
      
    } catch (error: any) {
      setErrors({ general: error.message });
      setShowLocationModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGPSLocation = async () => {
    setIsGettingLocation(true);
    try {
      const locationData: LocationData = await locationService.getCurrentLocation();
      const locationString = `${locationData.city}, ${locationData.country}`;
      await handleLocationSubmit(locationString);
    } catch (error: any) {
      setErrors({ location: error.message });
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleManualLocation = async () => {
    if (!formData.location.trim()) {
      setErrors({ location: 'Please enter your location' });
      return;
    }
    
    setIsGettingLocation(true);
    try {
      const validation = await locationService.validateLocation(formData.location);
      if (validation.isValid) {
        const locationString = validation.suggestion || formData.location;
        await handleLocationSubmit(locationString);
      } else {
        setErrors({ location: 'Please enter a valid location' });
      }
    } catch (error: any) {
      setErrors({ location: 'Unable to validate location' });
    } finally {
      setIsGettingLocation(false);
    }
  };

  return (
    <>
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-orange-500 to-green-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Utensils className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to FoodieBot!</h2>
          <p className="text-lg text-gray-600">
            {authMode === 'login' ? 'Sign in to continue your food journey' : 'Create an account to get personalized restaurant recommendations'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-orange-100">
          {/* Auth Mode Toggle */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                authMode === 'login'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                authMode === 'register'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 mr-2 text-orange-500" />
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                  errors.email ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder="Enter your email"
                disabled={isLoading}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 mr-2 text-orange-500" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full px-4 py-3 pr-12 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                    errors.password ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            {/* Registration Fields */}
            <AnimatePresence>
              {authMode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6"
                >
                  {/* Name Field */}
                  <div>
                    <label htmlFor="name" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 mr-2 text-orange-500" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                        errors.name ? 'border-red-300' : 'border-gray-200'
                      }`}
                      placeholder="Enter your full name"
                      disabled={isLoading}
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                  </div>

                  {/* Age Field */}
                  <div>
                    <label htmlFor="age" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 mr-2 text-orange-500" />
                      Age
                    </label>
                    <input
                      type="number"
                      id="age"
                      value={formData.age}
                      onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                        errors.age ? 'border-red-300' : 'border-gray-200'
                      }`}
                      min="13"
                      max="120"
                      disabled={isLoading}
                    />
                    {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age}</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{errors.general}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-orange-500 to-green-500 text-white py-4 px-6 rounded-lg font-medium hover:from-orange-600 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{authMode === 'login' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              <span className="font-medium">🔒 Privacy Notice:</span> Your information is securely stored and only used to provide better restaurant recommendations.
            </p>
          </div>
        </div>
      </div>

      {/* Location Modal */}
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
                Set Your Location
              </h3>
              
              <p className="text-gray-600 mb-6">
                We need your location to recommend nearby restaurants. Choose how you'd like to set it:
              </p>

              {/* Location Mode Toggle */}
              <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setLocationMode('gps')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    locationMode === 'gps'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Use GPS
                </button>
                <button
                  onClick={() => setLocationMode('manual')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    locationMode === 'manual'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Enter Manually
                </button>
              </div>

              {locationMode === 'gps' ? (
                <div className="text-center">
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <Navigation className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm text-blue-700">
                      We'll use your device's GPS to automatically detect your location
                    </p>
                  </div>
                  <button
                    onClick={handleGPSLocation}
                    disabled={isGettingLocation}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {isGettingLocation ? (
                      <Loader className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Navigation className="w-5 h-5" />
                        <span>Get My Location</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <Edit3 className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 text-center">
                      Enter your city, state, or country manually
                    </p>
                  </div>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors mb-4 ${
                      errors.location ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder="e.g., New York, NY or London, UK"
                    disabled={isGettingLocation}
                  />
                  {errors.location && <p className="text-red-500 text-sm mb-4">{errors.location}</p>}
                  <button
                    onClick={handleManualLocation}
                    disabled={isGettingLocation}
                    className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {isGettingLocation ? (
                      <Loader className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <MapPin className="w-5 h-5" />
                        <span>Set Location</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowLocationModal(false)}
                className="w-full mt-4 text-gray-600 hover:text-gray-800 py-2"
                disabled={isGettingLocation}
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};