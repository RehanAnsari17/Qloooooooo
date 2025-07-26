from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import json
import google.generativeai as genai
import os
import httpx
import asyncio
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Restaurant Chatbot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data info to be extracted from user
class UserProfile(BaseModel):
    name: str
    age: int
    location: str

class ChatMessage(BaseModel):
    message: str
    session_id: str

class MessageResponse(BaseModel):
    id: str
    content: str
    sender: str 
    timestamp: datetime
    restaurants: Optional[List[Dict[str, Any]]] = None

class RestaurantRecommendation(BaseModel):
    id: str
    name: str
    image_url: Optional[str] = None
    rating: Optional[float] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    cuisine_type: Optional[str] = None
    price_range: Optional[str] = None
    description: Optional[str] = None

# User preferences for restaurants(i.e, like/dislike)
class UserPreference(BaseModel):
    restaurant_id: str
    preference: str 
    session_id: str
class ChatSession(BaseModel):
    id: str
    user_profile: UserProfile
    messages: List[MessageResponse]
    created_at: datetime
    ended_at: Optional[datetime] = None
    is_active: bool = True

# for storing info
chat_sessions: Dict[str, ChatSession] = {}
user_profiles: Dict[str, UserProfile] = {}
user_preferences: Dict[str, List[UserPreference]] = {}

# Qloooooooooooooo API
class QlooAPIService:
    def __init__(self):
        self.api_key = os.getenv("QLOO_API_KEY")
        if not self.api_key:
            print("Warning: QLOO_API_KEY not found, using mock data")
            self.api_key = None
        
        self.base_url = "https://hackathon.api.qloo.com/v2"
        self.headers = {
            "X-Api-Key": self.api_key,
            "Content-Type": "application/json"
        } if self.api_key else {}
    
    async def get_restaurant_recommendations(self, location: str, cuisine_type: str = None, limit: int = 5) -> List[RestaurantRecommendation]:
        """Get restaurant recommendations from Qloo Insights API"""
        if not self.api_key:
            print("No Qloo API key loaded! Using mock data instead.")
            return self._get_mock_restaurants(location, limit)

        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/insights"
                params = {
                    "filter.type": "urn:entity:place",
                    "filter.location.query": location,
                    "limit": limit
                }

                # using already defined example entity IDs(we can use actual IDs from Qloo API)
                cuisine_entity_map = {
                    "italian": "FCE8B172-4795-43E4-B222-3B550DC05FD9",
                    "pizza": "FCE8B172-4795-43E4-B222-3B550DC05FD9"
                }
                if cuisine_type and cuisine_type.lower() in cuisine_entity_map:
                    params["signal.interests.entities"] = cuisine_entity_map[cuisine_type.lower()]

                
                safe_headers = {"Authorization": f"{self.api_key[:6]}***", "Content-Type": "application/json"}
                print(f"Making Qloo API request to: {url}")
                print(f"Params: {params}")
                print(f"Headers: {safe_headers}")

                response = await client.get(url, headers=self.headers, params=params,timeout =30.0) #this timeout is required, min of 15-20 s it is taking to generate response from qloo api
                print(f"Qloo API Response Status: {response.status_code}")
                print(f"Qloo API Response: {response.text[:500]}...")

                response.raise_for_status()
                data = response.json()

                restaurants = []
                if "results" in data and "entities" in data["results"]:
                    for item in data["results"]["entities"][:limit]:
                        restaurant = RestaurantRecommendation(
                            id=item.get("entity_id", str(uuid.uuid4())),
                            name=item.get("name", "Unknown Restaurant"),
                            address=item.get("properties", {}).get("address"),
                            phone=item.get("properties", {}).get("phone"),
                            website=item.get("properties", {}).get("website"),
                            description=item.get("properties", {}).get("description"),
                            rating=item.get("properties", {}).get("business_rating"),
                            cuisine_type=cuisine_type
                        )
                        restaurants.append(restaurant)

                print(f"Successfully parsed {len(restaurants)} restaurants")
                return restaurants

        except Exception as e:
            print(f"Error fetching restaurant recommendations: {e}")
            import traceback
            traceback.print_exc()
            return self._get_mock_restaurants(location, limit)
    
    async def get_restaurant_details(self, restaurant_id: str) -> Dict[str, Any]:
        """Get detailed information about a specific restaurant -> when user clicks "MORE INFO" button"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/insights/{restaurant_id}"
                response = await client.get(url, headers=self.headers,timeout=30.0)
                response.raise_for_status()
                
                return response.json()
                
        except Exception as e:
            print(f"Error fetching restaurant details: {e}")
            return {"error": "Could not fetch restaurant details"}
    
    def _get_mock_restaurants(self, location: str, limit: int) -> List[RestaurantRecommendation]:
        """Fallback mock data when API fails"""
        mock_restaurants = [
            RestaurantRecommendation(
                id="mock-1",
                name=f"Bella Vista Restaurant ({location})",
                image_url="https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg",
                rating=4.5,
                address=f"123 Main St, {location}",
                phone="+1-555-0123",
                website="https://bellavista.com",
                cuisine_type="Italian",
                price_range="$$",
                description="Authentic Italian cuisine with fresh ingredients"
            ),
            RestaurantRecommendation(
                id="mock-2",
                name=f"Sakura Sushi ({location})",
                image_url="https://images.pexels.com/photos/357756/pexels-photo-357756.jpeg",
                rating=4.7,
                address=f"456 Oak Ave, {location}",
                phone="+1-555-0456",
                website="https://sakurasushi.com",
                cuisine_type="Japanese",
                price_range="$$$",
                description="Fresh sushi and traditional Japanese dishes"
            ),
            RestaurantRecommendation(
                id="mock-3",
                name=f"The Local Bistro ({location})",
                image_url="https://images.pexels.com/photos/1581384/pexels-photo-1581384.jpeg",
                rating=4.3,
                address=f"789 Pine St, {location}",
                phone="+1-555-0789",
                website="https://localbistro.com",
                cuisine_type="American",
                price_range="$$",
                description="Farm-to-table American cuisine with local ingredients"
            ),
            RestaurantRecommendation(
                id="mock-4",
                name=f"Spice Garden ({location})",
                image_url="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
                rating=4.6,
                address=f"321 Elm St, {location}",
                phone="+1-555-0321",
                website="https://spicegarden.com",
                cuisine_type="Indian",
                price_range="$$",
                description="Authentic Indian spices and traditional recipes"
            ),
            RestaurantRecommendation(
                id="mock-5",
                name=f"Café Parisien ({location})",
                image_url="https://images.pexels.com/photos/1307698/pexels-photo-1307698.jpeg",
                rating=4.4,
                address=f"654 Maple Ave, {location}",
                phone="+1-555-0654",
                website="https://cafeparisien.com",
                cuisine_type="French",
                price_range="$$$",
                description="Classic French café with pastries and coffee"
            )
        ]
        return mock_restaurants[:limit]

# Gemini LLM
class GeminiRestaurantService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        
        
        try:
            self.qloo_service = QlooAPIService()
        except ValueError:
            print("Warning: Qloo API not configured, using mock data")
            self.qloo_service = None
        
        # Configuring prompt for restaurant specialization
        self.system_prompt = """You are FoodieBot, an expert restaurant and food recommendation assistant. Your expertise includes:

🍽️ SPECIALIZATIONS:
- Restaurant recommendations and reviews
- Cuisine types and food culture
- Dietary restrictions and preferences
- Local food scenes and hidden gems
- Menu suggestions and dish recommendations
- Food pairing and wine selection
- Budget-friendly to fine dining options
- Food delivery and takeout advice

📍 PERSONALIZATION:
- Always consider the user's location for local recommendations
- Factor in their age for appropriate dining experiences
- Suggest options that match their stated preferences
- Provide specific restaurant names when possible (but acknowledge they may be fictional for demo purposes)

💬 COMMUNICATION STYLE:
- Be enthusiastic and knowledgeable about food
- Use food emojis appropriately
- Provide detailed, helpful recommendations
- Ask follow-up questions to better understand preferences
- Keep responses conversational and engaging
- Format recommendations clearly with bullet points or numbers

🚫 BOUNDARIES:
- Only discuss food, restaurants, cafes, and dining-related topics
- If asked about non-food topics, politely redirect to food/restaurant discussions
- Don't provide medical advice, only general dietary information

Remember: You're here to make food discovery exciting and help users find their next great meal!"""

    async def generate_response(self, message: str, user_profile: UserProfile, session_id: str) -> tuple[str, List[RestaurantRecommendation]]:
        try:
            
            recommendation_keywords = ['recommend', 'suggest', 'find', 'restaurant', 'food', 'eat', 'dining', 'cuisine']
            should_get_recommendations = any(keyword in message.lower() for keyword in recommendation_keywords)
            
            print(f"User message: {message}")
            print(f"Should get recommendations: {should_get_recommendations}")
            
            restaurants = []
            if should_get_recommendations and self.qloo_service:
                # Extracting particular cuisine
                cuisine_type = None
                cuisine_keywords = {
                    'italian': 'italian',
                    'chinese': 'chinese',
                    'japanese': 'japanese',
                    'indian': 'indian',
                    'mexican': 'mexican',
                    'french': 'french',
                    'thai': 'thai',
                    'american': 'american'
                }
                
                for keyword, cuisine in cuisine_keywords.items():
                    if keyword in message.lower():
                        cuisine_type = cuisine
                        break
                
                print(f"Detected cuisine type: {cuisine_type}")
                print(f"User location: {user_profile.location}")
                
                
                restaurants = await self.qloo_service.get_restaurant_recommendations(
                    location=user_profile.location,
                    cuisine_type=cuisine_type,
                    limit=5
                )
                
                print(f"Got {len(restaurants)} restaurants from Qloo service")
            
            
            restaurant_context = ""
            if restaurants:
                restaurant_names = [r.name for r in restaurants]
                restaurant_context = f"\n\nI found these restaurants for you: {', '.join(restaurant_names)}. I'll show you detailed cards with images, ratings, and contact information below my response."
            else:
                print("No restaurants found, not adding restaurant context")
            
            user_context = f"""
USER PROFILE:
- Name: {user_profile.name}
- Age: {user_profile.age}
- Location: {user_profile.location}

USER MESSAGE: {message}{restaurant_context}

Please provide a helpful, personalized response about restaurants, food, or dining based on their profile and message. If restaurants were found, mention that you're showing them below and encourage the user to use the like/dislike buttons to help improve future recommendations."""

            
            full_prompt = f"{self.system_prompt}\n\n{user_context}"
            
            # using Gemini to generate response
            response = self.model.generate_content(full_prompt)
            
            print(f"Gemini response: {response.text[:200]}...")
            print(f"Returning {len(restaurants)} restaurants")
            
            if response.text:
                return response.text.strip(), restaurants
            else:
                return f"I'm here to help you discover amazing restaurants and food in {user_profile.location}! What are you in the mood for today?", restaurants
                
        except Exception as e:
            print(f"Error generating response: {e}")
            import traceback
            traceback.print_exc()
            # Fallback response
            return f"I'm having trouble connecting right now, but I'd love to help you find great food in {user_profile.location}! What type of cuisine are you interested in?", []

# Initialize Gemini
try:
    llm_service = GeminiRestaurantService()
except ValueError as e:
    print(f"Warning: {e}")
    llm_service = None

# Initialize Qloo
try:
    qloo_service = QlooAPIService()
except ValueError as e:
    print(f"Warning: {e}")
    qloo_service = None
@app.post("/api/register-user")
async def register_user(user_profile: UserProfile):
    user_id = str(uuid.uuid4())
    user_profiles[user_id] = user_profile
    
    # Inital chat session creation
    session_id = str(uuid.uuid4())
    initial_message = MessageResponse(
        id=str(uuid.uuid4()),
        content=f"Hello {user_profile.name}! 🍽️ I'm FoodieBot, your personal restaurant and food discovery assistant! I'm excited to help you explore the amazing culinary scene in {user_profile.location}.\n\nI can help you with:\n🍕 Restaurant recommendations with real data and images\n🥘 Cuisine suggestions\n☕ Cafe discoveries\n💰 Budget-friendly options\n🌟 Fine dining experiences\n🥗 Dietary preferences\n\nI'll show you restaurant cards with photos, ratings, and contact info. Use the like/dislike buttons to help me learn your preferences!\n\nWhat are you craving today, or what kind of dining experience are you looking for?",
        sender="bot",
        timestamp=datetime.now()
    )
    
    chat_session = ChatSession(
        id=session_id,
        user_profile=user_profile,
        messages=[initial_message],
        created_at=datetime.now()
    )
    
    chat_sessions[session_id] = chat_session
    
    return {"user_id": user_id, "session_id": session_id, "message": "User registered successfully"}

@app.post("/api/chat")
async def chat(chat_message: ChatMessage):
    if not llm_service:
        raise HTTPException(status_code=500, detail="LLM service not available. Please check GEMINI_API_KEY configuration.")
    
    session_id = chat_message.session_id
    
    if session_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    session = chat_sessions[session_id]
    
    if not session.is_active:
        raise HTTPException(status_code=400, detail="Chat session has ended")
    
    print(f"Processing chat message: {chat_message.message}")
    
    
    user_message = MessageResponse(
        id=str(uuid.uuid4()),
        content=chat_message.message,
        sender="user",
        timestamp=datetime.now()
    )
    session.messages.append(user_message)
    
    
    bot_response_content, restaurants = await llm_service.generate_response(
        chat_message.message, 
        session.user_profile, 
        session_id
    )
    
    print(f"Bot response content: {bot_response_content[:100]}...")
    print(f"Number of restaurants: {len(restaurants)}")
    
    
    restaurants_dict = []
    if restaurants:
        for restaurant in restaurants:
            restaurants_dict.append({
                "id": restaurant.id,
                "name": restaurant.name,
                "image_url": restaurant.image_url,
                "rating": restaurant.rating,
                "address": restaurant.address,
                "phone": restaurant.phone,
                "website": restaurant.website,
                "cuisine_type": restaurant.cuisine_type,
                "price_range": restaurant.price_range,
                "description": restaurant.description
            })
    
    print(f"Restaurants dict: {restaurants_dict}")
    
    bot_message = MessageResponse(
        id=str(uuid.uuid4()),
        content=bot_response_content,
        sender="bot",
        timestamp=datetime.now(),
        restaurants=restaurants_dict if restaurants_dict else None
    )
    session.messages.append(bot_message)
    
    print(f"Final bot message restaurants: {bot_message.restaurants}")
    
    return {"user_message": user_message, "bot_message": bot_message}

@app.post("/api/end-chat/{session_id}")
async def end_chat(session_id: str):
    if session_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    session = chat_sessions[session_id]
    session.is_active = False
    session.ended_at = datetime.now()
    
    
    final_message = MessageResponse(
        id=str(uuid.uuid4()),
        content="Thank you for chatting with me! I hope I helped you discover some great dining options. Feel free to start a new conversation anytime you need restaurant recommendations! 🍽️",
        sender="bot",
        timestamp=datetime.now()
    )
    session.messages.append(final_message)
    
    return {"message": "Chat session ended successfully"}

@app.post("/api/restaurant-preference")
async def save_restaurant_preference(preference: UserPreference):
    session_id = preference.session_id
    
    if session_id not in user_preferences:
        user_preferences[session_id] = []
    
    
    user_preferences[session_id] = [
        p for p in user_preferences[session_id] 
        if p.restaurant_id != preference.restaurant_id
    ]
    
    
    user_preferences[session_id].append(preference)
    
    return {"message": "Preference saved successfully"}

@app.get("/api/restaurant-details/{restaurant_id}")
async def get_restaurant_details(restaurant_id: str):
    if not qloo_service:
        return {"error": "Qloo API service not available"}
    
    try:
        details = await qloo_service.get_restaurant_details(restaurant_id)
        return details
    except Exception as e:
        return {"error": f"Failed to fetch restaurant details: {str(e)}"}

@app.get("/api/chat-history")
async def get_chat_history():
    return {
        "sessions": [
            {
                "id": session.id,
                "user_name": session.user_profile.name,
                "created_at": session.created_at,
                "ended_at": session.ended_at,
                "message_count": len(session.messages),
                "is_active": session.is_active,
                "preview": session.messages[1].content[:100] + "..." if len(session.messages) > 1 else "New conversation"
            }
            for session in chat_sessions.values()
        ]
    }

@app.get("/api/chat-session/{session_id}")
async def get_chat_session(session_id: str):
    if session_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    return chat_sessions[session_id]

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

@app.get("/api/test-qloo")
async def test_qloo_api():
    """Test endpoint to debug Qloo API integration"""
    if not qloo_service:
        return {"error": "Qloo service not available"}
    
    try:
        restaurants = await qloo_service.get_restaurant_recommendations("New York", limit=3)
        return {
            "status": "success",
            "restaurant_count": len(restaurants),
            "restaurants": [
                {
                    "id": r.id,
                    "name": r.name,
                    "image_url": r.image_url,
                    "rating": r.rating,
                    "address": r.address,
                    "cuisine_type": r.cuisine_type
                } for r in restaurants
            ]
        }
    except Exception as e:
        return {"error": str(e), "type": type(e).__name__}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
