export interface User {
  name: string;
  email: string;
  isEmailVerified: boolean;
  date_joined: string;
  profile_image_url: string;
  companyRole?: string;
  usageReason?: string;
  organizations?: Organization[];
  active_org?: string;
  permissions?: string[];
  has_subscription_access: boolean;
  stripe_customer_id: string;
  stripe_price_id: string;
  subscription_renewal_date: string;
  is_staff: boolean;
}
export interface Organization {
  organization_id: string;
  organization_name: string;
  projects: Project[];
}

export interface Project {
  id: string;
  name: string;
}

export interface Token {
  key: string;
  created: string;
}
