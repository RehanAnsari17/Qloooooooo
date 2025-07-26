import React from 'react';
import { RestaurantCard } from './RestaurantCard';
import { motion } from 'framer-motion';

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

interface RestaurantRecommendationsProps {
  restaurants: Restaurant[];
  sessionId: string;
}

export const RestaurantRecommendations: React.FC<RestaurantRecommendationsProps> = ({ 
  restaurants, 
  sessionId 
}) => {
  const handlePreferenceSaved = (restaurantId: string, preference: 'like' | 'dislike') => {
    console.log(`User ${preference}d restaurant ${restaurantId}`);
    // You can add additional logic here, like showing a toast notification
  };

  if (!restaurants || restaurants.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4"
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          🍽️ Restaurant Recommendations
        </h3>
        <p className="text-sm text-gray-600">
          Here are some great options I found for you. Use the like/dislike buttons to help me learn your preferences!
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {restaurants.map((restaurant, index) => (
          <motion.div
            key={restaurant.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <RestaurantCard
              restaurant={restaurant}
              sessionId={sessionId}
              onPreferenceSaved={handlePreferenceSaved}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};