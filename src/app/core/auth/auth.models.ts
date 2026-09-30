export interface Credentials {
  email: string;
  password: string;
}
export interface RegisterResponse {
  id: string;
  email: string;
  role: string;
}
export interface Session {
  userId: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string; // ISO date
}
