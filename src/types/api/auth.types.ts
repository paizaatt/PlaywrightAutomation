/** Cookie session JWT — backend dùng làm access token */
export const API_ACCESS_TOKEN_COOKIE = 'truytimkhobau_session';

export interface ApiLoginPayload {
  username: string;
  bank: string;
  site: string;
}

export interface ApiLoginResponse {
  username: string;
  message: string;
}
