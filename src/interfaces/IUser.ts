export interface IUser {
  username: string;
  id: string;
  name: string;
  email: string;
  is_admin: 0 | 1;
  enabled: boolean;
  licenseStatus?: string;
  activeFrom: string;
  expiresAt: string;
  deviceId?: string;
}

export interface ISession {
  token: string;
  refreshToken: string;
  user: IUser;
}

/** Giữ alias User, Session cho tương thích ngược */
export type User = IUser;
export type Session = ISession;

