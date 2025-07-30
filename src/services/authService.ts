import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  User,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export interface UserData {
  uid: string;
  email: string;
  name: string;
  age: number;
  defaultLocation: string;
  currentLocation: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  userProfile: {
    name: string;
    age: number;
    location: string;
  };
  messages: ChatMessage[];
  createdAt: any;
  endedAt?: any;
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: any;
  restaurants?: RestaurantData[];
}

export interface RestaurantData {
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

export interface UserFeedback {
  id: string;
  userId: string;
  sessionId: string;
  restaurantId: string;
  restaurantName: string;
  preference: 'like' | 'dislike';
  feedback?: string;
  timestamp: any;
}

export const authService = {
  // Register new user
  async register(email: string, password: string, name: string, age: number, defaultLocation: string): Promise<UserData> {
    try {
      console.log('Registering user:', { email, name, age, defaultLocation });
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update user profile with name
      await updateProfile(user, { displayName: name });

      // Save user data to Firestore
      const userData: UserData = {
        uid: user.uid,
        email: user.email!,
        name,
        age,
        defaultLocation,
        currentLocation: defaultLocation,
        createdAt: new Date().toISOString()
      };

      console.log('Saving user data to Firestore:', userData);
      await setDoc(doc(db, 'users', user.uid), userData);
      console.log('User data saved successfully');

      return userData;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message);
    }
  },

  // Login user
  async login(email: string, password: string): Promise<UserData> {
    try {
      console.log('Logging in user:', email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log('Login successful, fetching user data...');
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        console.log('User data retrieved:', userData);
        return userDoc.data() as UserData;
      } else {
        console.error('User data not found in Firestore');
        throw new Error('User data not found');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message);
    }
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error(error.message);
    }
  },

  // Get current user data
  async getCurrentUserData(): Promise<UserData | null> {
    try {
      const user = auth.currentUser;
      if (!user) return null;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        return userDoc.data() as UserData;
      }
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  },

  // Update current location
  async updateCurrentLocation(location: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      await updateDoc(doc(db, 'users', user.uid), {
        currentLocation: location
      });
    } catch (error: any) {
      throw new Error(error.message);
    }
  },

  // Save chat session
  async saveChatSession(sessionData: any): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'chatSessions'), {
        ...sessionData,
        createdAt: sessionData.createdAt || serverTimestamp(),
        endedAt: sessionData.endedAt || null
      });
      return docRef.id;
    } catch (error: any) {
      console.error('Error in saveChatSession:', error);
      throw new Error(error.message);
    }
  },

  // Update chat session
  async updateChatSession(sessionId: string, updates: any): Promise<void> {
    try {
      const sessionRef = doc(db, 'chatSessions', sessionId);
      
      // Check if document exists, if not create it
      const sessionDoc = await getDoc(sessionRef);
      if (!sessionDoc.exists()) {
        // Document doesn't exist, create it
        await setDoc(sessionRef, {
          ...updates,
          createdAt: updates.createdAt || serverTimestamp()
        });
      } else {
        // Document exists, update it
        await updateDoc(sessionRef, {
          ...updates,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error: any) {
      console.error('Error in updateChatSession:', error);
      throw new Error(error.message);
    }
  },

  // Get user chat sessions
  async getUserChatSessions(userId: string): Promise<ChatSession[]> {
    try {
      const q = query(
        collection(db, 'chatSessions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ChatSession));
    } catch (error: any) {
      throw new Error(error.message);
    }
  },

  // Save user feedback
  async saveUserFeedback(feedbackData: any): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'userFeedback'), {
        ...feedbackData,
        timestamp: feedbackData.timestamp || serverTimestamp()
      });
      return docRef.id;
    } catch (error: any) {
      console.error('Error in saveUserFeedback:', error);
      throw new Error(error.message);
    }
  },

  // Get user feedback
  async getUserFeedback(userId: string): Promise<UserFeedback[]> {
    try {
      const q = query(
        collection(db, 'userFeedback'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserFeedback));
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
};
