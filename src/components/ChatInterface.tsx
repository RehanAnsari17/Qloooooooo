import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, ChatMessage } from '../App';
import { RestaurantRecommendations } from './RestaurantRecommendations';
import { Send, Square, Loader, Bot, User, History } from 'lucide-react';
import { authService, UserData } from '../services/authService';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatInterfaceProps {
  sessionId: string;
  userProfile: UserProfile;
  userData: UserData;
  onViewHistory: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  sessionId, 
  userProfile, 
  userData,
  onViewHistory 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isChatEnded, setIsChatEnded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadChatSession();
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Save chat session to Firebase whenever messages change (with debounce)
    if (messages.length > 0 && userData) {
      const timeoutId = setTimeout(() => {
        saveChatToFirebase();
      }, 1000); // Debounce for 1 second
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages, userData, sessionId]);

  const loadChatSession = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/api/chat-session/${sessionId}`);
      setMessages(response.data.messages);
      setIsChatEnded(!response.data.is_active);
    } catch (error) {
      console.error('Error loading chat session:', error);
    }
  };

  const saveChatToFirebase = async () => {
    try {
      if (!userData || !sessionId) {
        console.log('Missing userData or sessionId, skipping Firebase save');
        return;
      }

      const chatSession = {
        userId: userData.uid,
        userProfile: {
          name: userProfile.name,
          age: userProfile.age,
          location: userProfile.location
        },
        messages: messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          sender: msg.sender,
          timestamp: new Date(msg.timestamp),
          restaurants: msg.restaurants || []
        })),
        isActive: !isChatEnded,
        createdAt: new Date(),
        endedAt: isChatEnded ? new Date() : null
      };

      // Always try to update/create the session
      await authService.updateChatSession(sessionId, chatSession);
      console.log('Chat session saved to Firebase successfully');
      
    } catch (error) {
      console.error('Error saving chat to Firebase:', error);
      // Try to save with a new session ID if the current one fails
      try {
        const newSessionData = {
          ...chatSession,
          userId: userData.uid
        };
        const newSessionId = await authService.saveChatSession(newSessionData);
        console.log('Created new session with ID:', newSessionId);
      } catch (fallbackError) {
        console.error('Fallback save also failed:', fallbackError);
      }
    }
  };
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || isChatEnded) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await axios.post('http://localhost:8000/api/chat', {
        message: messageText,
        session_id: sessionId
      });

      setMessages(prev => [...prev, response.data.user_message]);

      // Simulate typing delay
      setTimeout(() => {
        setMessages(prev => [...prev, response.data.bot_message]);
        setIsTyping(false);
      }, 1000);

    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
    } finally {
      setIsLoading(false);
    }
  };

  const endChat = async () => {
    try {
      await axios.post(`http://localhost:8000/api/end-chat/${sessionId}`);
      setIsChatEnded(true);
      
      // Update Firebase with ended status
      await authService.updateChatSession(sessionId, {
        isActive: false,
        endedAt: new Date()
      });
      
      loadChatSession();
    } catch (error) {
      console.error('Error ending chat:', error);
    }
  };

  const viewStoredFeedback = () => {
    const feedback = JSON.parse(localStorage.getItem('restaurantFeedback') || '[]');
    console.log('Stored Restaurant Feedback:', feedback);
    // You can add a modal or separate component to display this data
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (content: string) => {
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className="w-full max-w-7xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-orange-100">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-orange-500 to-green-500 p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Chat with FoodieBot</h2>
            <p className="text-orange-100">Finding great restaurants in {userProfile.location}</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onViewHistory}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
              title="View History"
            >
              <History className="w-5 h-5" />
            </button>
            {!isChatEnded && (
              <button
                onClick={endChat}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Square className="w-4 h-4" />
                <span>End Chat</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="h-[600px] overflow-y-auto p-6 space-y-4 bg-gray-50">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} flex-col space-y-2`}
            >
              <div
                className={`rounded-2xl px-4 py-3 break-words whitespace-pre-wrap ${
                  message.sender === 'user'
                    ? 'bg-orange-500 text-white max-w-lg md:max-w-xl'
                    : 'bg-white text-gray-800 border border-gray-200 max-w-lg md:max-w-2xl'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.sender === 'user' 
                    ? 'bg-orange-500' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-500'
                }`}>
                  {message.sender === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div
                  className={`inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed break-words whitespace-pre-wrap max-w-xs md:max-w-md lg:max-w-lg ${
                    message.sender === 'user'
                      ? 'bg-orange-500 text-white self-end'
                      : 'bg-white text-gray-800 border border-gray-200 self-start'
                  }`}
                >
                  <div className="text-sm leading-relaxed">
                    {formatMessage(message.content)}
                  </div>
                  <div className={`text-xs mt-2 ${
                    message.sender === 'user' ? 'text-orange-100' : 'text-gray-500'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>

              {/* Restaurant Recommendations */}
              {message.sender === 'bot' && message.restaurants && (
                <div className="mt-4 w-full">
                  <RestaurantRecommendations 
                    restaurants={message.restaurants}
                    sessionId={sessionId}
                    userData={userData}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="flex space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white rounded-2xl px-4 py-3 border border-gray-200">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {!isChatEnded ? (
        <div className="p-6 bg-white border-t border-gray-200">
          <div className="flex space-x-4">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about restaurants, cuisines, or food recommendations..."
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-gradient-to-r from-orange-500 to-green-500 text-white p-3 rounded-lg hover:from-orange-600 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send • Ask about restaurants, cuisines, budgets, or specific dishes
          </p>
        </div>
      ) : (
        <div className="p-6 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-gray-600 font-medium">Chat session ended</p>
          <p className="text-sm text-gray-500 mt-1">Start a new chat to continue getting restaurant recommendations</p>
        </div>
      )}
    </div>
  );
};
