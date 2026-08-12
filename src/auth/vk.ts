import * as VKID from '@vkid/sdk';

const STORAGE_KEY = 'k2_vk_auth_meta';

export type VkCallbackParams = {
  code: string;
  deviceId: string;
  state: string;
};

function randomString(length = 64): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
}

export function getVkRedirectUri(): string {
  return `${window.location.origin}/`;
}

export function initVkLogin(appId: number): void {
  const meta = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null') as
    | { state: string; codeVerifier: string }
    | null;

  const state = meta?.state || randomString();
  const codeVerifier = meta?.codeVerifier || randomString();

  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ state, codeVerifier }),
  );

  VKID.Config.init({
    app: appId,
    redirectUrl: getVkRedirectUri(),
    state,
    codeVerifier,
    scope: 'phone email',
  });
}

export function beginVkLogin(): void {
  VKID.Auth.login().catch((error) => {
    console.error('VK ID login error:', error);
  });
}

export function getStoredVkMeta(): { state: string; codeVerifier: string } | null {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function clearStoredVkMeta(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function getVkCallbackParams(): VkCallbackParams | null {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const deviceId = params.get('device_id');
  const state = params.get('state');

  if (!code || !deviceId || !state) return null;

  return { code, deviceId, state };
}
