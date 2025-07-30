import React, { useState } from 'react';
import { Heart, ThumbsDown, Info, Star, Phone, Globe, MapPin, ExternalLink, Clock, Utensils, CreditCard, Armchair as Wheelchair, Baby, Car, Beer, Wifi, ParkingCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { authService } from '../services/authService';
import type { UserData } from '../services/authService';
import axios from 'axios';

interface Restaurant {
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

interface RestaurantCardProps {
  restaurant: Restaurant;
  sessionId: string;
  userData: UserData;
  onPreferenceSaved: (restaurantId: string, preference: 'like' | 'dislike') => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({ 
  restaurant, 
  sessionId, 
  userData,
  onPreferenceSaved 
}) => {
  const [userPreference, setUserPreference] = useState<'like' | 'dislike' | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [pendingPreference, setPendingPreference] = useState<'like' | 'dislike' | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [restaurantDetails, setRestaurantDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const handlePreference = async (preference: 'like' | 'dislike') => {
    if (!userData || !userData.uid) {
      console.error('User must be logged in to submit feedback');
      alert('Please log in to rate restaurants');
      return;
    }

    setPendingPreference(preference);
    setShowFeedbackModal(true);
  };

  const handleFeedbackSubmit = async () => {
    if (!userData || !userData.uid) {
      console.error('User not authenticated — cannot submit feedback');
      alert('Please log in again to submit feedback.');
      return;
    }

    if (!pendingPreference) {
      console.error('No preference selected — cannot submit feedback');
      alert('Please select like or dislike before submitting feedback.');
      return;
    }

    setIsSubmittingFeedback(true);
    
  try {
      await axios.post('http://localhost:8000/api/restaurant-preference', {
        restaurant_id: restaurant.id,
        preference: pendingPreference,
        session_id: sessionId,
        feedback: feedbackText.trim() || null
      });

    // Send to Firebase
    await authService.saveUserFeedback({
      userId: userData.uid,
      sessionId,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      preference: pendingPreference,
      feedback: feedbackText.trim() || null,
      timestamp: new Date()
    });

    setUserPreference(pendingPreference);
    onPreferenceSaved(restaurant.id, pendingPreference);

    // Reset modal state
    setShowFeedbackModal(false);
    setFeedbackText('');
    setPendingPreference(null);

    // Store in localStorage
    const feedbackData = {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        preference: pendingPreference,
        feedback: feedbackText.trim(),
        timestamp: new Date().toISOString()
      };

    const existingFeedback = JSON.parse(localStorage.getItem('restaurantFeedback') || '[]');
    existingFeedback.push(feedbackData);
    localStorage.setItem('restaurantFeedback', JSON.stringify(existingFeedback));

    console.log('Feedback saved successfully to Firebase and localStorage');

  } catch (error) {
    console.error('Error saving preference and feedback:', error);
    alert('Failed to save feedback. Please try again.');
  } finally {
    setIsSubmittingFeedback(false);
  }
};

  const handleFeedbackCancel = () => {
    setShowFeedbackModal(false);
    setFeedbackText('');
    setPendingPreference(null);
  };

  const handleMoreInfo = async () => {
    setIsLoadingDetails(true);
    try {
      const response = await axios.get(`http://localhost:8000/api/restaurant-details/${restaurant.id}`);
      setRestaurantDetails(response.data);
      setShowDetails(true);
    } catch (error) {
      console.error('Error fetching restaurant details:', error);
      // Show basic info even if API fails
      setRestaurantDetails(restaurant);
      setShowDetails(true);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-4 h-4 fill-yellow-400/50 text-yellow-400" />);
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />);
    }

    return stars;
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    // Remove 'T' and format as HH:MM
    const time = timeString.replace('T', '');
    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getTagIcon = (tagType: string) => {
    if (tagType.includes('credit_card') || tagType.includes('payments')) return <CreditCard className="w-4 h-4" />;
    if (tagType.includes('wheelchair') || tagType.includes('accessibility')) return <Wheelchair className="w-4 h-4" />;
    if (tagType.includes('children') || tagType.includes('kids')) return <Baby className="w-4 h-4" />;
    if (tagType.includes('drive_through') || tagType.includes('parking')) return <Car className="w-4 h-4" />;
    if (tagType.includes('beer') || tagType.includes('alcohol') || tagType.includes('wine')) return <Beer className="w-4 h-4" />;
    if (tagType.includes('wifi')) return <Wifi className="w-4 h-4" />;
    if (tagType.includes('parking')) return <ParkingCircle className="w-4 h-4" />;
    return <Info className="w-4 h-4" />;
  };

  const getTagColor = (tagType: string) => {
    if (tagType.includes('credit_card') || tagType.includes('payments')) return 'bg-blue-100 text-blue-700';
    if (tagType.includes('wheelchair') || tagType.includes('accessibility')) return 'bg-green-100 text-green-700';
    if (tagType.includes('children') || tagType.includes('kids')) return 'bg-pink-100 text-pink-700';
    if (tagType.includes('drive_through') || tagType.includes('parking')) return 'bg-purple-100 text-purple-700';
    if (tagType.includes('beer') || tagType.includes('alcohol') || tagType.includes('wine')) return 'bg-amber-100 text-amber-700';
    if (tagType.includes('wifi')) return 'bg-indigo-100 text-indigo-700';
    return 'bg-gray-100 text-gray-700';
  };
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full h-full flex flex-col bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
      >
        {/* Restaurant Image */}
        <div className="relative h-56 bg-gray-200">
          {restaurant.image_url ? (
            <img
              src={restaurant.image_url}
              alt={restaurant.name}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-green-100">
              <span className="text-gray-500 text-4xl">🍽️</span>
            </div>
          )}
          
          {/* Cuisine Badge */}
          {restaurant.cuisine_type && (
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-semibold text-gray-700 shadow-md">
              {restaurant.cuisine_type}
            </div>
          )}
          
          {/* Price Range Badge */}
          {restaurant.price_range && (
            <div className="absolute top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-md">
              {restaurant.price_range}
            </div>
          )}
        </div>

        {/* Restaurant Info */}
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xl font-bold text-gray-900 line-clamp-2 flex-1 mr-2">{restaurant.name}</h3>
            {restaurant.rating && (
              <div className="flex items-center space-x-1 flex-shrink-0">
                <div className="flex">
                  {renderStars(restaurant.rating)}
                </div>
                <span className="text-sm font-medium text-gray-700 ml-1">({restaurant.rating})</span>
              </div>
            )}
          </div>

          {restaurant.description && (
            <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">{restaurant.description}</p>
          )}

          {/* Contact Info */}
          <div className="space-y-3">
            {restaurant.address && (
              <div className="flex items-start text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-3 text-orange-500 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">{restaurant.address}</span>
              </div>
            )}
            {restaurant.phone && (
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="w-4 h-4 mr-3 text-green-500" />
                <span>{restaurant.phone}</span>
              </div>
            )}
            {restaurant.website && (
              <div className="flex items-center text-sm text-gray-600">
                <Globe className="w-4 h-4 mr-3 text-blue-500" />
                <a 
                  href={restaurant.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                >
                  Visit Website
                </a>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <div className="flex space-x-3">
              <button
                onClick={() => handlePreference('like')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  userPreference === 'like'
                    ? 'bg-red-100 text-red-700 border-2 border-red-200 shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 border-2 border-transparent'
                }`}
              >
                <Heart className={`w-4 h-4 ${userPreference === 'like' ? 'fill-current' : ''}`} />
                <span className="text-sm font-medium">Like</span>
              </button>
              
              <button
                onClick={() => handlePreference('dislike')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  userPreference === 'dislike'
                    ? 'bg-gray-200 text-gray-800 border-2 border-gray-300 shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                }`}
              >
                <ThumbsDown className={`w-4 h-4 ${userPreference === 'dislike' ? 'fill-current' : ''}`} />
                <span className="text-sm font-medium">Dislike</span>
              </button>
            </div>

            <button
              onClick={handleMoreInfo}
              disabled={isLoadingDetails}
              className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-green-500 text-white rounded-lg hover:from-orange-600 hover:to-green-600 transition-all duration-200 disabled:opacity-50 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              {isLoadingDetails ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                <Info className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">More Info</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Restaurant Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{restaurant.name}</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  ×
                </button>
              </div>

              {restaurant.image_url && (
                <img
                  src={restaurant.image_url}
                  alt={restaurant.name}
                  className="w-full h-64 object-cover rounded-lg mb-6"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg';
                  }}
                />
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
                  
                  {restaurant.rating && (
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Rating:</span>
                      <div className="flex items-center space-x-1">
                        <div className="flex">
                          {renderStars(restaurant.rating)}
                        </div>
                        <span className="text-gray-600">({restaurant.rating}/5)</span>
                      </div>
                    </div>
                  )}

                  {restaurant.cuisine_type && (
                    <div>
                      <span className="font-medium">Cuisine:</span>
                      <span className="ml-2 text-gray-600">{restaurant.cuisine_type}</span>
                    </div>
                  )}

                  {restaurant.price_range && (
                    <div>
                      <span className="font-medium">Price Range:</span>
                      <span className="ml-2 text-gray-600">{restaurant.price_range}</span>
                    </div>
                  )}

                  {restaurant.description && (
                    <div>
                      <span className="font-medium">Description:</span>
                      <p className="text-gray-600 mt-1 leading-relaxed">{restaurant.description}</p>
                    </div>
                  )}

                  {restaurant.address && (
                    <div className="flex items-start">
                      <MapPin className="w-5 h-5 mr-2 text-gray-400 mt-0.5" />
                      <div>
                        <span className="font-medium">Address:</span>
                        <p className="text-gray-600">{restaurant.address}</p>
                      </div>
                    </div>
                  )}

                  {restaurant.phone && (
                    <div className="flex items-center">
                      <Phone className="w-5 h-5 mr-2 text-gray-400" />
                      <span className="font-medium">Phone:</span>
                      <a href={`tel:${restaurant.phone}`} className="ml-2 text-blue-600 hover:underline">
                        {restaurant.phone}
                      </a>
                    </div>
                  )}

                  {restaurant.website && (
                    <div className="flex items-center">
                      <Globe className="w-5 h-5 mr-2 text-gray-400" />
                      <span className="font-medium">Website:</span>
                      <a 
                        href={restaurant.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-600 hover:underline flex items-center"
                      >
                        Visit Website
                        <ExternalLink className="w-4 h-4 ml-1" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Right Column - Additional Details */}
                <div className="space-y-4">
                  {/* Opening Hours */}
                  {restaurantDetails?.results?.entities?.[0]?.properties?.hours && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-3 flex items-center">
                        <Clock className="w-5 h-5 mr-2" />
                        Opening Hours
                      </h3>
                      <div className="space-y-1">
                        {Object.entries(restaurantDetails.results.entities[0].properties.hours).map(([day, hours]) => (
                          <div key={day} className="flex justify-between items-center text-sm">
                            <span className="font-medium capitalize">{day}:</span>
                            <span className="text-gray-600">
                              {Array.isArray(hours) && hours.length > 0 
                                ? `${formatTime(hours[0].opens)} - ${formatTime(hours[0].closes)}`
                                : 'Closed'
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Specialty Dishes */}
                  {restaurantDetails?.results?.entities?.[0]?.properties?.specialty_dishes && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-3 flex items-center">
                        <Utensils className="w-5 h-5 mr-2" />
                        Specialty Dishes
                      </h3>
                      <div className="grid grid-cols-1 gap-2">
                        {restaurantDetails.results.entities[0].properties.specialty_dishes.slice(0, 6).map((dish, index) => (
                          <div key={index} className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                            <span className="font-medium text-orange-800">{dish.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Amenities and Features */}
              {restaurantDetails?.results?.entities?.[0]?.tags && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Amenities & Features</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {restaurantDetails.results.entities[0].tags
                      .filter(tag => 
                        tag.type.includes('credit_card') || 
                        tag.type.includes('accessibility') || 
                        tag.type.includes('children') || 
                        tag.type.includes('service_options') || 
                        tag.type.includes('offerings') || 
                        tag.type.includes('payments') ||
                        tag.type.includes('parking') ||
                        tag.type.includes('amenity')
                      )
                      .slice(0, 12)
                      .map((tag, index) => (
                        <div 
                          key={index} 
                          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${getTagColor(tag.type)}`}
                        >
                          {getTagIcon(tag.type)}
                          <span className="font-medium truncate">{tag.name}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              <div className="mt-8 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDetails(false)}
                  className="w-full bg-gradient-to-r from-orange-500 to-green-500 text-white py-3 rounded-lg hover:from-orange-600 hover:to-green-600 transition-all duration-200 font-medium"
                >
                  Close Details
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {/* Feedback Modal */}
      {showFeedbackModal && pendingPreference && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-white rounded-2xl p-6 w-full max-w-md shadow-xl ${
              pendingPreference === 'like' ? 'border-t-8 border-green-500' : 'border-t-8 border-gray-400'
            }`}
          >
            <h3 className="text-xl font-bold mb-4 text-gray-900">
              {pendingPreference === 'like' ? 'Glad you liked it!' : 'Not your taste?'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Share your thoughts about <span className="font-semibold">{restaurant.name}</span> (optional):
            </p>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              maxLength={500}
              className="w-full h-28 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 mb-2"
              placeholder="Write your feedback here..."
            />
            <div className="text-xs text-gray-400 mb-4">
              {feedbackText.length}/500 characters
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleFeedbackCancel}
                disabled={isSubmittingFeedback}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleFeedbackSubmit}
                disabled={isSubmittingFeedback}
                className={`px-4 py-2 rounded-lg text-white ${
                  pendingPreference === 'like'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-gray-600 hover:bg-gray-700'
                } transition-colors`}
              >
                {isSubmittingFeedback ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};
