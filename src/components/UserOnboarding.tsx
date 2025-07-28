import React, { useState } from 'react';
import { UserProfile } from '../App';
import { User, MapPin, Calendar, ArrowRight, Utensils } from 'lucide-react';
import axios from 'axios';

interface UserOnboardingProps {
  onUserRegistered: (profile: UserProfile, sessionId: string) => void;
}

export const UserOnboarding: React.FC<UserOnboardingProps> = ({ onUserRegistered }) => {
  const [formData, setFormData] = useState<UserProfile>({
    name: '',
    age: 25,
    location: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<UserProfile>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<UserProfile> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (formData.age < 13 || formData.age > 120) {
      newErrors.age = 'Please enter a valid age between 13 and 120';
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const response = await axios.post('http://localhost:8000/api/register-user', formData);
      onUserRegistered(formData, response.data.session_id);
    } catch (error) {
      console.error('Error registering user:', error);
      alert('Failed to register. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="bg-gradient-to-r from-orange-500 to-green-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Utensils className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to FoodieBot!</h2>
        <p className="text-lg text-gray-600">
          Let's get to know you better so I can recommend the perfect restaurants and dishes for your taste!
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 border border-orange-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 mr-2 text-orange-500" />
              What should I call you?
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                errors.name ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder="Enter your name"
              disabled={isLoading}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="age" className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 mr-2 text-orange-500" />
              How old are you?
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
            <p className="text-gray-500 text-sm mt-1">This helps me suggest age-appropriate dining experiences</p>
          </div>

          <div>
            <label htmlFor="location" className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 mr-2 text-orange-500" />
              Where are you located?
            </label>
            <input
              type="text"
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                errors.location ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder="City, State or Country"
              disabled={isLoading}
            />
            {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
            <p className="text-gray-500 text-sm mt-1">I'll use this to find restaurants near you</p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-green-500 text-white py-4 px-6 rounded-lg font-medium hover:from-orange-600 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <span>Let's Find Great Food!</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-orange-50 rounded-lg">
          <p className="text-sm text-gray-600 text-center">
            <span className="font-medium">🔒 Privacy Notice:</span> Your information is only used to provide better restaurant recommendations and is not shared with third parties.
          </p>
        </div>
      </div>
    </div>
  );
};
