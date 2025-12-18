/**
 * Obfuscation utility for localStorage data
 * Uses Base64 + XOR encoding to hide metadata
 */

const OBFUSCATION_KEY = 'cmrd_px';

function xorEncode(str: string, key: string): string {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

function xorDecode(str: string, key: string): string {
  return xorEncode(str, key);
}

export function obfuscate(data: unknown): string {
  try {
    const json = JSON.stringify(data);
    const xored = xorEncode(json, OBFUSCATION_KEY);
    return btoa(xored);
  } catch {
    return '';
  }
}

export function deobfuscate(encoded: string): unknown {
  try {
    if (!encoded) return null;
    const xored = atob(encoded);
    const json = xorDecode(xored, OBFUSCATION_KEY);
    return JSON.parse(json);
  } catch {
    return null;
  }
}
