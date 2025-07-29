import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  User,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export interface UserData {
  uid: string;
  email: string;
  name: string;
  age: number;
  location: string;
  createdAt: string;
}

export const authService = {
  // Register new user
  async register(email: string, password: string, name: string, age: number, location: string): Promise<UserData> {
    try {
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
        location,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      return userData;
    } catch (error: any) {
      throw new Error(error.message);
    }
  },

  // Login user
  async login(email: string, password: string): Promise<UserData> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        return userDoc.data() as UserData;
      } else {
        throw new Error('User data not found');
      }
    } catch (error: any) {
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
  }
};