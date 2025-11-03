import { create } from 'zustand';
import { Child } from '@/types';

interface ChildrenState {
  children: Child[];
  selectedChild: Child | null;
  setChildren: (children: Child[]) => void;
  setSelectedChild: (child: Child) => void;
}

export const useChildrenStore = create<ChildrenState>((set) => ({
  children: [],
  selectedChild: null,
  setChildren: (children) => set({ children }),
  setSelectedChild: (child) => set({ selectedChild: child }),
}));
