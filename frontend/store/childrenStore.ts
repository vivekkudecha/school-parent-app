import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Child, KidProfile } from '@/types';

interface ChildrenState {
  kidsProfiles: KidProfile[];
  selectedKidProfile: KidProfile | null;
  children: Child[];
  selectedChild: Child | null;
  setKidsProfiles: (profiles: KidProfile[]) => Promise<void>;
  setSelectedKidProfile: (profile: KidProfile | null) => Promise<void>;
  setChildren: (children: Child[]) => void;
  setSelectedChild: (child: Child) => void;
  clearChildren: () => Promise<void>;
  initializeKids: () => Promise<void>;
}

export const useChildrenStore = create<ChildrenState>((set) => ({
  kidsProfiles: [],
  selectedKidProfile: null,
  children: [],
  selectedChild: null,
  
  setKidsProfiles: async (profiles: KidProfile[]) => {
    try {
      await AsyncStorage.setItem('kids_profiles', JSON.stringify(profiles));
      set({ kidsProfiles: profiles });
    } catch (error) {
      console.error('Error saving kids profiles:', error);
      set({ kidsProfiles: profiles });
    }
  },
  
  setSelectedKidProfile: async (profile: KidProfile | null) => {
    try {
      if (profile === null) {
        // Clear the selected profile
        await AsyncStorage.removeItem('selected_kid_profile');
        set({ selectedKidProfile: null });
      } else {
        // Save the selected profile
        await AsyncStorage.setItem('selected_kid_profile', JSON.stringify(profile));
        set({ selectedKidProfile: profile });
      }
    } catch (error) {
      console.error('Error saving selected kid profile:', error);
      set({ selectedKidProfile: profile });
    }
  },
  
  setChildren: (children) => set({ children }),
  setSelectedChild: (child) => set({ selectedChild: child }),
  
  clearChildren: async () => {
    try {
      await AsyncStorage.multiRemove(['kids_profiles', 'selected_kid_profile']);
      set({
        kidsProfiles: [],
        selectedKidProfile: null,
        children: [],
        selectedChild: null,
      });
    } catch (error) {
      console.error('Error clearing children data:', error);
      // Still clear the state even if AsyncStorage fails
      set({
        kidsProfiles: [],
        selectedKidProfile: null,
        children: [],
        selectedChild: null,
      });
    }
  },
  
  initializeKids: async () => {
    try {
      const [kidsProfilesData, selectedKidData] = await AsyncStorage.multiGet([
        'kids_profiles',
        'selected_kid_profile',
      ]);
      
      if (kidsProfilesData[1]) {
        set({ kidsProfiles: JSON.parse(kidsProfilesData[1]) });
      }
      
      if (selectedKidData[1]) {
        set({ selectedKidProfile: JSON.parse(selectedKidData[1]) });
      }
    } catch (error) {
      console.error('Error initializing kids:', error);
    }
  },
}));
