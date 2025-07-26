import React, { useState } from 'react';
import { Heart, ThumbsDown, Info, Star, Phone, Globe, MapPin, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
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
  onPreferenceSaved: (restaurantId: string, preference: 'like' | 'dislike') => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({ 
  restaurant, 
  sessionId, 
  onPreferenceSaved 
}) => {
  const [userPreference, setUserPreference] = useState<'like' | 'dislike' | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [restaurantDetails, setRestaurantDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const handlePreference = async (preference: 'like' | 'dislike') => {
    try {
      await axios.post('http://localhost:8000/api/restaurant-preference', {
        restaurant_id: restaurant.id,
        preference: preference,
        session_id: sessionId
      });
      
      setUserPreference(preference);
      onPreferenceSaved(restaurant.id, preference);
    } catch (error) {
      console.error('Error saving preference:', error);
    }
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

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow duration-300"
      >
        {/* Restaurant Image */}
        <div className="relative h-48 bg-gray-200">
          {restaurant.image_url ? (
            <img
              src={restaurant.image_url}
              alt={restaurant.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-green-100">
              <span className="text-gray-500 text-lg">🍽️</span>
            </div>
          )}
          
          {/* Cuisine Badge */}
          {restaurant.cuisine_type && (
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-gray-700">
              {restaurant.cuisine_type}
            </div>
          )}
          
          {/* Price Range Badge */}
          {restaurant.price_range && (
            <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              {restaurant.price_range}
            </div>
          )}
        </div>

        {/* Restaurant Info */}
        <div className="p-6">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{restaurant.name}</h3>
            {restaurant.rating && (
              <div className="flex items-center space-x-1 ml-2">
                <div className="flex">
                  {renderStars(restaurant.rating)}
                </div>
                <span className="text-sm text-gray-600 ml-1">({restaurant.rating})</span>
              </div>
            )}
          </div>

          {restaurant.description && (
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">{restaurant.description}</p>
          )}

          {/* Contact Info */}
          <div className="space-y-2 mb-4">
            {restaurant.address && (
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                <span className="line-clamp-1">{restaurant.address}</span>
              </div>
            )}
            {restaurant.phone && (
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                <span>{restaurant.phone}</span>
              </div>
            )}
            {restaurant.website && (
              <div className="flex items-center text-sm text-gray-600">
                <Globe className="w-4 h-4 mr-2 text-gray-400" />
                <a 
                  href={restaurant.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Visit Website
                </a>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <button
                onClick={() => handlePreference('like')}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                  userPreference === 'like'
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                }`}
              >
                <Heart className={`w-4 h-4 ${userPreference === 'like' ? 'fill-current' : ''}`} />
                <span className="text-sm">Like</span>
              </button>
              
              <button
                onClick={() => handlePreference('dislike')}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                  userPreference === 'dislike'
                    ? 'bg-gray-200 text-gray-800 border border-gray-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <ThumbsDown className={`w-4 h-4 ${userPreference === 'dislike' ? 'fill-current' : ''}`} />
                <span className="text-sm">Dislike</span>
              </button>
            </div>

            <button
              onClick={handleMoreInfo}
              disabled={isLoadingDetails}
              className="flex items-center space-x-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-green-500 text-white rounded-lg hover:from-orange-600 hover:to-green-600 transition-all duration-200 disabled:opacity-50"
            >
              {isLoadingDetails ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                <Info className="w-4 h-4" />
              )}
              <span className="text-sm">More Info</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Restaurant Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{restaurant.name}</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {restaurant.image_url && (
                <img
                  src={restaurant.image_url}
                  alt={restaurant.name}
                  className="w-full h-64 object-cover rounded-lg mb-4"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg';
                  }}
                />
              )}

              <div className="space-y-4">
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
                    <p className="text-gray-600 mt-1">{restaurant.description}</p>
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

              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDetails(false)}
                  className="w-full bg-gradient-to-r from-orange-500 to-green-500 text-white py-3 rounded-lg hover:from-orange-600 hover:to-green-600 transition-all duration-200"
                >
                  Close Details
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};