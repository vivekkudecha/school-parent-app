import { create } from 'zustand';

export interface BusInfo {
  bus_id: string;
  bus_number: string;
  driver_name: string;
  route: string;
  status: string;
}

export interface Child {
  id: string;
  name: string;
  class_name: string;
  section: string;
  roll_number: string;
  profile_image: string;
  bus_info: BusInfo;
  home_location: {
    latitude: number;
    longitude: number;
  };
}

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
