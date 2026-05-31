export interface IAuthFlow {
  phone: string;
  countryCode: string;
  otp: string;
  language: string;
}

export interface IUserProfile {
  id: string;
  phone: string;
  name?: string;
  role: 'buyer' | 'seller' | 'admin';
  createdAt: Date;
}
