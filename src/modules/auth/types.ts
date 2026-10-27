export type UserRole = 'admin' | 'customer';

export interface UserAddress {
  fullName: string;
  phone: string;
  street: string;
  apartment?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  addresses: UserAddress[];
  loyaltyTier: 'VIP Gold' | 'Streetwear Insider' | 'Club Member';
  emailVerified?: boolean;
  createdAt: string;
}

export interface UserRecord extends Omit<UserProfile, 'role'> {
  role: string;
  passwordHash: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  expiresAt: number;
}

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}
