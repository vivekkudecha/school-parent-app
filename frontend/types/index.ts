export interface User {
  parentId: string;
  name: string;
  email: string;
}

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

export interface BusLocation {
  bus_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  eta_minutes: number;
  status: string;
}
