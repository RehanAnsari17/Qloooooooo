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
import requests
import asyncio
import time
from dotenv import load_dotenv
dynamic_food_keywords = set()

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
    feedback: Optional[str] = None
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

# Qloo API Configuration
qloo_hackathon_endpoint = "https://hackathon.api.qloo.com"
qloo_api_key = os.getenv("QLOO_API_KEY")
class QlooAPIService:
    def __init__(self):
        self.api_key = os.getenv("QLOO_API_KEY")
        if not self.api_key:
            print("Warning: QLOO_API_KEY not found, using mock data")
            self.api_key = None
        
        self.base_url = "https://hackathon.api.qloo.com"
        self.headers = {
            "X-Api-Key": self.api_key,
            "Content-Type": "application/json"
        } if self.api_key else {}

# Initialize Gemini LLM
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
llm = genai.GenerativeModel("gemini-2.0-flash")

headers = {
    "accept": "application/json",
    "X-Api-Key": qloo_api_key
}

def get_type(prompt):
    system_instruction = (
        "Analyze the user's message and decide whether we have to recommend a restaurant "
        "from their old visits (A) or find a new place entirely (B). "
        "Only respond with A or B, nothing else."
    )
    start_time = time.time()
    response = llm.generate_content([system_instruction, prompt])
    end_time = time.time()

    print(f"Time taken: {end_time - start_time:.3f} seconds")
    print("Response from Gemini:")
    print(response.text)
    return response.text.strip().upper()

def get_keywords(prompt):
    system_instruction = (
        "Identify and list only the most relevant keywords from the user's message that describe their preferences or "
        "requirements for a restaurant. Exclude any mention of location, generic terms like restaurant, place, food, "
        "or similar. Respond with a concise, comma-separated list of keywords that capture the user's specific interests, "
        "needs, or constraints for choosing a restaurant. Do not include any explanations or extra text."
    )
    start_time = time.time()
    response = llm.generate_content([system_instruction, prompt])
    end_time = time.time()

    print(f"Time taken: {end_time - start_time:.3f} seconds")
    print("Response from Gemini:")
    print(response.text)
    return response.text.strip()

def convert_to_urn(tag):
    # Convert tag to URN format
    return tag.replace(":", "%3A").replace(" ", "_")

def get_recommendation(entity, tags = "", operator = "union", take = 5):
    #tag --> urn:tag:genre:action ---> urn%3Atag%3Agenre%3Aaction
    #tags are comma separated
    #operator --> {union or intersection}

    url = f"{qloo_hackathon_endpoint}/recommendations?entity_ids={entity}&type=urn%3Aentity%3Aplace&bias.content_based=0.5&filter.entity_ids={tags}&filter.radius=10&filter.tags=&operator.filter.tags={operator}&page=1&sort_by=affinity&take={take}"

    response = requests.get(url, headers=headers)
    data = json.loads(response.text)
    
    with open("response_data.txt", "w") as file:
        json.dump(data, file, indent=2)
    print("Data saved to response_data.txt")
    
    return data

def get_insights(location, tags = "", operator="union", take = 5):

    url = f"{qloo_hackathon_endpoint}/v2/insights?filter.type=urn%3Aentity%3Aplace&filter.location.query={location}&filter.tags={tags}&operator.filter.tags={operator}&take={take}"

    response = requests.get(url, headers=headers)
    data = json.loads(response.text)
        
    with open("response_data.txt", "w") as file:
        json.dump(data, file, indent=2)
    print("Data saved to response_data.txt")
    
    return data

def get_tags(query, take = 10):

    url = f"{qloo_hackathon_endpoint}/v2/tags?feature.typo_tolerance=true&filter.query={query}&take={take}"

    response = requests.get(url, headers=headers)
    data = json.loads(response.text)

    return data

def update_dynamic_food_keywords(qloo_entities):
    global dynamic_food_keywords
    for entity in qloo_entities:
        props = entity.get("properties", {})
        
        # Add specialty dishes
        for dish in props.get("specialty_dishes", []):
            name = dish.get("name")
            if name:
                dynamic_food_keywords.add(name.lower())
        
        # Add keyword tags
        for kw in props.get("keywords", []):
            name = kw.get("name")
            if name:
                dynamic_food_keywords.add(name.lower())
        
        # Add general tags (like pizza, sushi, etc.)
        for tag in entity.get("tags", []):
            name = tag.get("name")
            if name:
                dynamic_food_keywords.add(name.lower())


# Gemini LLM
class GeminiRestaurantService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
                
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
            
            recommendation_keywords = ['recommend', 'suggest', 'find', 'restaurant', 'food', 'eat', 'dining', 'cuisine','pizza']
            all_keywords = recommendation_keywords + list(dynamic_food_keywords)
            should_get_recommendations = any(keyword in message.lower() for keyword in all_keywords)
            
            keywords = get_keywords(message)
            print(f"Extracted keywords: {keywords}")

            # Fallback: if extracted keywords look like food, enable recommendations
            if not should_get_recommendations and keywords and keywords.lower() != "none":
                should_get_recommendations = True
            
            print(f"User message: {message}")
            print(f"Should get recommendations: {should_get_recommendations}")
            
            restaurants = []
            if should_get_recommendations and qloo_api_key:
                try:
                    # Extract keywords using the get_keywords function
                    keywords = get_keywords(message)
                    print(f"Extracted keywords: {keywords}")
                    
                    if keywords and keywords.lower() != "none":
                        # Get tags from Qloo API
                        tags_data = get_tags(keywords, take=10)
                        print(f"Tags data: {tags_data}")
                        
                        # Extract tag URNs from the response
                        tag_urns = []
                        if "results" in tags_data and "tags" in tags_data["results"]:
                            for tag in tags_data["results"]["tags"][:5]:  # Use top 5 tags
                                if "id" in tag:
                                    tag_urns.append(tag["id"])
                        
                        print(f"Tag URNs: {tag_urns}")
                        
                        if tag_urns:
                            # Convert tags to proper format and join them
                            converted_tags = [convert_to_urn(tag) for tag in tag_urns]
                            tags_param = ",".join(converted_tags)
                            print(f"Converted tags: {tags_param}")
                            
                            # Get insights with tag filtering
                            insights_data = get_insights(user_profile.location, tags=tags_param, operator="union", take=6)
                        else:
                            # Fallback to general location-based search
                            insights_data = get_insights(user_profile.location, take=6)
                    else:
                        # No specific keywords, general location search
                        insights_data = get_insights(user_profile.location, take=6)
                    
                    print(f"Insights data: {insights_data}")
                    
                    # Parse the insights response
                    if "results" in insights_data and "entities" in insights_data["results"]:
                        update_dynamic_food_keywords(insights_data["results"]["entities"])
                        for item in insights_data["results"]["entities"]:
                            # Define properties
                            properties = item.get("properties", {})
                            image_url = None
                            images = properties.get("images", [])
                            if images and isinstance(images, list):
                                image_url = images[0].get("url")
                            address = properties.get("address")
                            website = properties.get("website")
                            phone = properties.get("phone")
                            rating = properties.get("business_rating")
                            description = properties.get("description", "Great dining experience")

                            
                            # Extract cuisine type
                            cuisine_type = None
                            if "cuisine" in item and "name" in item["cuisine"]:
                                cuisine_type = item["cuisine"]["name"]
                            
                            restaurant = RestaurantRecommendation(
                                id=item.get("entity_id", str(uuid.uuid4())),
                                name=item.get("name", "Unknown Restaurant"),
                                image_url=image_url,
                                rating=rating,
                                address=address,
                                phone=phone,
                                website=website,
                                cuisine_type=cuisine_type,
                                price_range=f"{properties.get('price_range', {}).get('from', '?')}-{properties.get('price_range', {}).get('to', '?')} {properties.get('price_range', {}).get('currency', '')}" if 'price_range' in properties else "$$",
                                description=item.get("description", "Great dining experience")
                            )
                            restaurants.append(restaurant)
                    
                    print(f"Successfully parsed {len(restaurants)} restaurants")
                
                except Exception as e:
                    print(f"Error with Qloo API: {e}")
                    import traceback
                    traceback.print_exc()
                    restaurants = []
            
            
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
    
    return {"message": "Preference and feedback saved successfully"}

@app.get("/api/user-feedback/{session_id}")
async def get_user_feedback(session_id: str):
    if session_id not in user_preferences:
        return {"feedback": []}
    
    feedback_data = []
    for pref in user_preferences[session_id]:
        if pref.feedback:
            feedback_data.append({
                "restaurant_id": pref.restaurant_id,
                "preference": pref.preference,
                "feedback": pref.feedback,
                "timestamp": datetime.now().isoformat()
            })
    
    return {"feedback": feedback_data}

@app.get("/api/user-feedback/{session_id}")
async def get_user_feedback(session_id: str):
    if session_id in user_preferences:
        return {"feedback": user_preferences[session_id]}
    return {"feedback": []}


@app.get("/api/restaurant-details/{restaurant_id}")
async def get_restaurant_details(restaurant_id: str):
        if not qloo_api_key:
            return {"error": "Qloo API service not available"}
        
        try:
            # Get full details using insights endpoint
            url = f"{qloo_hackathon_endpoint}/v2/insights?filter.type=urn%3Aentity%3Aplace&filter.entity_ids={restaurant_id}&take=1"
            response = requests.get(url, headers=headers)
            data = json.loads(response.text)

            with open("response_data.txt", "w") as file:
                json.dump(data, file, indent=2)

            return data
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
    if not qloo_api_key:
        return {"error": "Qloo service not available"}
    
    try:
        # Test the get_insights function
        test_data = get_insights("New York", take=3)
        return {
            "status": "success",
            "data": test_data
        }
    except Exception as e:
        return {"error": str(e), "type": type(e).__name__}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

