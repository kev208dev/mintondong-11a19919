import { registerPlugin } from "@capacitor/core";

export type NativeAppleCredential = {
  idToken: string;
  nonce: string;
  email?: string;
  givenName?: string;
  familyName?: string;
};

export interface NativeAuthPlugin {
  signInWithApple(): Promise<NativeAppleCredential>;
}

export const NativeAuth = registerPlugin<NativeAuthPlugin>("NativeAuth");
