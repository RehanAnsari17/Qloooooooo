import React, { useState, useEffect } from 'react';
import { ChatSession } from '../App';
import { ArrowLeft, Calendar, MessageSquare, User, Bot, Clock, Eye } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';

interface ChatHistoryProps {
  onBackToChat: () => void;
  onViewSession: (session: ChatSession) => void;
  selectedSession: ChatSession | null;
}

interface HistorySession {
  id: string;
  user_name: string;
  created_at: string;
  ended_at?: string;
  message_count: number;
  is_active: boolean;
  preview: string;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ 
  onBackToChat, 
  onViewSession, 
  selectedSession 
}) => {
  const [historySessions, setHistorySessions] = useState<HistorySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/chat-history');
      setHistorySessions(response.data.sessions);
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewSession = async (sessionId: string) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/chat-session/${sessionId}`);
      onViewSession(response.data);
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMessage = (content: string) => {
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  if (selectedSession) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-orange-100">
          {/* Session Header */}
          <div className="bg-gradient-to-r from-orange-500 to-green-500 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => onViewSession(null)}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold">
                    Chat with {selectedSession.user_profile.name}
                  </h2>
                  <p className="text-orange-100">
                    {formatDate(selectedSession.created_at)} • {selectedSession.messages.length} messages
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  selectedSession.is_active 
                    ? 'bg-green-500 text-white' 
                    : 'bg-white/20 text-white'
                }`}>
                  {selectedSession.is_active ? 'Active' : 'Ended'}
                </span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto p-6 space-y-4 bg-gray-50">
            {selectedSession.messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-xs lg:max-w-md space-x-3 ${
                  message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
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
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.sender === 'user'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}>
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
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-6 bg-white border-t border-gray-200 text-center">
            <p className="text-gray-600 text-sm">
              This is a read-only view of your chat history. 
              <button 
                onClick={onBackToChat}
                className="ml-2 text-orange-500 hover:text-orange-600 font-medium"
              >
                Start a new conversation
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-orange-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-green-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBackToChat}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold">Chat History</h2>
                <p className="text-orange-100">View your previous conversations</p>
              </div>
            </div>
          </div>
        </div>

        {/* History List */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading chat history...</p>
            </div>
          ) : historySessions.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No chat history yet</p>
              <p className="text-gray-500 text-sm mt-1">Your conversations will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historySessions.map((session) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
                  onClick={() => handleViewSession(session.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="bg-gradient-to-r from-orange-500 to-green-500 w-8 h-8 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{session.user_name}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(session.created_at)}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <MessageSquare className="w-3 h-3" />
                              <span>{session.message_count} messages</span>
                            </span>
                            {session.ended_at && (
                              <span className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>Ended {formatDate(session.ended_at)}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm line-clamp-2">
                        {session.preview}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        session.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {session.is_active ? 'Active' : 'Ended'}
                      </span>
                      <Eye className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
