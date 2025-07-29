import axios from 'axios';

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
}

export const locationService = {
  // Get user's current location using GPS
  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const address = await this.reverseGeocode(latitude, longitude);
            resolve({
              latitude,
              longitude,
              ...address
            });
          } catch (error) {
            reject(error);
          }
        },
        (error) => {
          let errorMessage = 'Unable to retrieve location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  },

  // Convert coordinates to address using Nominatim API (free)
  async reverseGeocode(latitude: number, longitude: number): Promise<{address: string, city: string, country: string}> {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'RestaurantChatbot/1.0'
          }
        }
      );

      const data = response.data;
      const address = data.display_name || 'Unknown location';
      const city = data.address?.city || data.address?.town || data.address?.village || 'Unknown city';
      const country = data.address?.country || 'Unknown country';

      return { address, city, country };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return {
        address: `${latitude}, ${longitude}`,
        city: 'Unknown city',
        country: 'Unknown country'
      };
    }
  },

  // Validate manually entered location
  async validateLocation(locationString: string): Promise<{isValid: boolean, suggestion?: string}> {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationString)}&limit=1`,
        {
          headers: {
            'User-Agent': 'RestaurantChatbot/1.0'
          }
        }
      );

      if (response.data && response.data.length > 0) {
        return {
          isValid: true,
          suggestion: response.data[0].display_name
        };
      } else {
        return { isValid: false };
      }
    } catch (error) {
      console.error('Location validation error:', error);
      return { isValid: false };
    }
  }
};