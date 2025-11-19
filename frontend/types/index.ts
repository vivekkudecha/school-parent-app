export interface User {
  id: number;
  parentId?: string;
  profile: any;
  addresses: any[];
  contact_numbers: any[];
  documents: any[];
  acedmic_records: any[];
  firebase_uid: string | null;
  username: string;
  name: string;
  email: string;
  phone: string;
  created: string;
  updated: string;
  active: boolean;
  last_login: string | null;
  is_admin: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  is_classroom_user: boolean;
  password_string: string;
  password_reset_otp: string | null;
  password_reset_otp_expiry: string | null;
  roles: number[];
  roles_data: Array<{
    id: number;
    role: string;
    created: string;
    updated: string;
    active: boolean;
  }>;
  designations: any[];
}

export interface KidProfile {
  first_name: string;
  middle_name: string;
  last_name: string;
  birthday: string;
  address: string;
  country_code: string;
  phone: string;
  grade_name: string;
  division: string | null;
  academic_year: number;
  photo: string;
  student: number;
  admission: number;
}

export interface LoginResponse {
  refresh: string;
  access: string;
  account: User;
  permissions: any[];
  roles: any[];
  kids_profile: KidProfile[];
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
