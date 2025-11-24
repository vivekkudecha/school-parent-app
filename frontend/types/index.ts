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

export interface ParentContactNumber {
  id: number;
  country_code: string;
  contact_number: string;
  is_primary_contact: boolean;
  created: string;
  updated: string;
  parent: number;
}

export interface ParentEmail {
  id: number;
  email: string;
  is_primary_email: boolean;
  created: string;
  updated: string;
  parent: number;
}

export interface ParentGuardian {
  id: number;
  contact_numbers: ParentContactNumber[];
  emails: ParentEmail[];
  photo: string | null;
  relation: string;
  relation_other: string | null;
  full_name: string;
  address: string;
  education_qualification: string;
  occupation: string;
  working_designation: string;
  workplace_address: string;
  workplace_contact: string;
  annual_income: number | null;
  is_primary_emergency_contact: boolean;
  created: string;
  updated: string;
  login_enable: boolean;
  user_name: string | null;
  password: string | null;
  use_existing_user: boolean;
  user: number;
  perent_user: number | null;
}

export interface StudentProfile {
  first_name: string;
  middle_name: string;
  last_name: string;
  birthday: string;
  address: string;
  country_code: string;
  phone: string;
  grade_name: string;
  division: string;
  academic_year: number;
  photo: string;
  rte: boolean;
  house_name: string;
  house_color: string;
  perents_guardians: ParentGuardian[];
}
