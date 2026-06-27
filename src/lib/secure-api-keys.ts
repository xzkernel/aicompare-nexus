import { useCallback, useState, useEffect, useSyncExternalStore } from 'react';

// Updated interface with claudeProvider and googleProvider
export interface ApiKeys {
  openaiKey: string;
  googleKey: string;
  anthropicKey: string;
  metaRelayKey: string;
  customApiKey: string;
  // Claude provider selection
  claudeProvider?: 'anthropic' | 'openrouter';
  // Google provider selection
  googleProvider?: 'google' | 'openrouter';
  // Meta relay configuration
  metaRelayProvider?: 'openrouter' | 'together';
  // Custom API configuration
  customApiConfig?: {
    baseUrl: string;
    keyHeader: string;
  };
}

export interface ApiKeyStatus {
  hasValidKeys: boolean;
  openaiValid: boolean;
  googleValid: boolean;
  anthropicValid: boolean;
  metaValid: boolean;
  customValid: boolean;
  missingKeys: string[];
}

export interface EncryptedKeyData {
  data: string;
  iv: string;
  salt: string;
}

// Browser-local persistence (never sent to ModelWise backend)
const STORAGE_PREFIX = 'modelwise-byok-keys-';
const keyListeners = new Set<() => void>();

const emptyKeys = (): ApiKeys => ({
  openaiKey: '',
  googleKey: '',
  anthropicKey: '',
  metaRelayKey: '',
  customApiKey: '',
  metaRelayProvider: 'openrouter',
  customApiConfig: {
    baseUrl: '',
    keyHeader: 'Authorization',
  },
});

function ensureApiKeysStructure(keys: unknown): ApiKeys {
  const k = keys as Partial<ApiKeys> | null | undefined;
  return {
    openaiKey: k?.openaiKey || '',
    googleKey: k?.googleKey || '',
    anthropicKey: k?.anthropicKey || '',
    metaRelayKey: k?.metaRelayKey || '',
    customApiKey: k?.customApiKey || '',
    claudeProvider: k?.claudeProvider || 'anthropic',
    googleProvider: k?.googleProvider || 'google',
    metaRelayProvider: k?.metaRelayProvider || 'openrouter',
    customApiConfig: k?.customApiConfig || {
      baseUrl: '',
      keyHeader: 'Authorization',
    },
  };
}

function loadKeysFromStorage(profileId: string): ApiKeys {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${profileId}`);
    if (raw) return ensureApiKeysStructure(JSON.parse(raw));
  } catch {
    /* ignore corrupt storage */
  }
  return emptyKeys();
}

function persistKeysToStorage(profileId: string, keys: ApiKeys): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${profileId}`, JSON.stringify(keys));
  } catch {
    /* quota / private mode */
  }
}

function removeKeysFromStorage(profileId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${profileId}`);
  } catch {
    /* ignore */
  }
}

function subscribeKeys(listener: () => void): () => void {
  keyListeners.add(listener);
  return () => keyListeners.delete(listener);
}

function emitKeysChange(): void {
  keyListeners.forEach((l) => l());
}

let activeProfileId = 'default';
let inMemoryKeys: ApiKeys = loadKeysFromStorage('default');

function getKeysSnapshot(): ApiKeys {
  return inMemoryKeys;
}

function applyKeys(profileId: string, keys: ApiKeys, persist: boolean): void {
  inMemoryKeys = ensureApiKeysStructure(keys);
  activeProfileId = profileId;
  if (persist) persistKeysToStorage(profileId, inMemoryKeys);
  emitKeysChange();
}

export function hasPersistedKeys(profileId: string = 'default'): boolean {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${profileId}`) != null;
  } catch {
    return false;
  }
}

// WebCrypto utilities for encryption
class CryptoUtils {
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(data: string, password: string): Promise<EncryptedKeyData> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const key = await this.deriveKey(password, salt);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoder.encode(data)
    );

    return {
      data: Array.from(new Uint8Array(encrypted))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(''),
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
      salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
    };
  }

  static async decrypt(encryptedData: EncryptedKeyData, password: string): Promise<string> {
    const salt = new Uint8Array(
      encryptedData.salt.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    );
    const iv = new Uint8Array(
      encryptedData.iv.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    );
    const data = new Uint8Array(
      encryptedData.data.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    );

    const key = await this.deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  }
}

// IndexedDB utilities for encrypted persistent storage
class IndexedDBStorage {
  private static DB_NAME = 'ModelWiseKeys';
  private static DB_VERSION = 1;
  private static STORE_NAME = 'encryptedKeys';

  private static async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  static async saveEncryptedKeys(profileId: string, encryptedData: EncryptedKeyData): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.put({
        id: profileId,
        data: encryptedData,
        timestamp: Date.now()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async loadEncryptedKeys(profileId: string): Promise<EncryptedKeyData | null> {
    const db = await this.openDB();
    const transaction = db.transaction([this.STORE_NAME], 'readonly');
    const store = transaction.objectStore(this.STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.get(profileId);
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  static async deleteEncryptedKeys(profileId: string): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(profileId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async listProfiles(): Promise<string[]> {
    const db = await this.openDB();
    const transaction = db.transaction([this.STORE_NAME], 'readonly');
    const store = transaction.objectStore(this.STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        const profiles = request.result.map((item: any) => item.id);
        resolve(profiles);
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// Secure API key manager
export function useSecureApiKeys(profileId: string = 'default') {
  useEffect(() => {
    if (profileId !== activeProfileId) {
      applyKeys(profileId, loadKeysFromStorage(profileId), false);
    }
  }, [profileId]);

  const apiKeys = useSyncExternalStore(subscribeKeys, getKeysSnapshot, getKeysSnapshot);
  const [isLoading, setIsLoading] = useState(false);

  // Validate API key format
  const validateApiKey = useCallback((key: string | undefined, type: 'openai' | 'google' | 'anthropic' | 'meta' | 'custom'): boolean => {
    if (!key || !key.trim()) return false;
    
    switch (type) {
      case 'openai':
        return key.startsWith('sk-') && key.length > 20;
      case 'google':
        return key.startsWith('AIza') && key.length > 20;
      case 'anthropic':
        return key.startsWith('sk-ant-') && key.length > 20;
      case 'meta':
        // OpenRouter sk-or-v1-… and other sk- relay keys
        return (key.startsWith('sk-') || key.startsWith('sk-or-')) && key.length > 20;
      case 'custom':
        return key.length > 5; // More lenient for custom APIs
      default:
        return false;
    }
  }, []);

  // Get API key status
  const getApiKeyStatus = useCallback((): ApiKeyStatus => {
    const openaiValid = validateApiKey(apiKeys?.openaiKey, 'openai');
    
    // For Google: check direct key OR OpenRouter key (if configured for OpenRouter)
    const googleProvider = apiKeys?.googleProvider || 'google';
    const googleValid = validateApiKey(apiKeys?.googleKey, 'google') || 
      (googleProvider === 'openrouter' && validateApiKey(apiKeys?.metaRelayKey, 'meta'));
    
    // For Anthropic: check direct key OR OpenRouter key (if configured for OpenRouter)
    // Default to 'anthropic' if claudeProvider is undefined
    const claudeProvider = apiKeys?.claudeProvider || 'anthropic';
    const anthropicValid = validateApiKey(apiKeys?.anthropicKey, 'anthropic') || 
      (claudeProvider === 'openrouter' && validateApiKey(apiKeys?.metaRelayKey, 'meta'));
    
    const metaValid = validateApiKey(apiKeys?.metaRelayKey, 'meta');
    const customValid = validateApiKey(apiKeys?.customApiKey, 'custom');
    const hasValidKeys = openaiValid || googleValid || anthropicValid || metaValid || customValid;
    
    // Provider validation completed
    
    const missingKeys: string[] = [];
    if (!openaiValid) missingKeys.push('OpenAI');
    if (!googleValid) missingKeys.push('Google');
    if (!anthropicValid) missingKeys.push('Anthropic');
    if (!metaValid) missingKeys.push('Meta');
    if (!customValid) missingKeys.push('Custom');
    
    return {
      hasValidKeys,
      openaiValid,
      googleValid,
      anthropicValid,
      metaValid,
      customValid,
      missingKeys
    };
  }, [apiKeys, validateApiKey]);

  // Get API key for a specific provider
  const getApiKey = useCallback((provider: 'openai' | 'google' | 'anthropic' | 'meta' | 'custom'): string | null => {
    if (!apiKeys) return null;
    
    const keyMap = {
      openai: apiKeys.openaiKey,
      google: apiKeys.googleKey,
      anthropic: apiKeys.anthropicKey,
      meta: apiKeys.metaRelayKey,
      custom: apiKeys.customApiKey
    };
    const key = keyMap[provider];
    return validateApiKey(key, provider) ? (key || '') : null;
  }, [apiKeys, validateApiKey]);

  const setApiKeys = useCallback((keys: ApiKeys) => {
    applyKeys(profileId, keys, true);
  }, [profileId]);

  // Clear API keys
  const clearApiKeys = useCallback(() => {
    removeKeysFromStorage(profileId);
    applyKeys(profileId, emptyKeys(), false);
  }, [profileId]);

  // Export keys to encrypted file
  const exportKeys = useCallback(async (password: string): Promise<void> => {
    if (!apiKeys.openaiKey && !apiKeys.googleKey && !apiKeys.anthropicKey && !apiKeys.metaRelayKey && !apiKeys.customApiKey) {
      throw new Error('No API keys to export');
    }

    const dataToExport = JSON.stringify(apiKeys);
    const encryptedData = await CryptoUtils.encrypt(dataToExport, password);
    
    const blob = new Blob([JSON.stringify(encryptedData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modelwise-keys-${profileId}.json.enc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [apiKeys, profileId]);

  // Import keys from encrypted file
  const importKeys = useCallback(async (file: File, password: string): Promise<void> => {
    setIsLoading(true);
    
    try {
      const text = await file.text();
      const encryptedData: EncryptedKeyData = JSON.parse(text);
      const decryptedData = await CryptoUtils.decrypt(encryptedData, password);
      const importedKeys: ApiKeys = JSON.parse(decryptedData);
      
      setApiKeys(importedKeys);
    } catch (error) {
      throw new Error('Failed to decrypt file. Please check your password.');
    } finally {
      setIsLoading(false);
    }
  }, [setApiKeys]);

  // Save keys to IndexedDB (encrypted)
  const saveKeysToIndexedDB = useCallback(async (password: string): Promise<void> => {
    if (!apiKeys.openaiKey && !apiKeys.googleKey && !apiKeys.anthropicKey && !apiKeys.metaRelayKey && !apiKeys.customApiKey) {
      throw new Error('No API keys to save');
    }

    const dataToSave = JSON.stringify(apiKeys);
    const encryptedData = await CryptoUtils.encrypt(dataToSave, password);
    await IndexedDBStorage.saveEncryptedKeys(profileId, encryptedData);
  }, [apiKeys, profileId]);

  // Load keys from IndexedDB (encrypted)
  const loadKeysFromIndexedDB = useCallback(async (password: string): Promise<void> => {
    setIsLoading(true);
    
    try {
      const encryptedData = await IndexedDBStorage.loadEncryptedKeys(profileId);
      if (!encryptedData) {
        throw new Error('No saved keys found for this profile');
      }
      
      const decryptedData = await CryptoUtils.decrypt(encryptedData, password);
      const loadedKeys: ApiKeys = JSON.parse(decryptedData);
      
      setApiKeys(loadedKeys);
    } catch (error) {
      throw new Error('Failed to decrypt saved keys. Please check your password.');
    } finally {
      setIsLoading(false);
    }
  }, [profileId, setApiKeys]);

  // Delete keys from IndexedDB
  const deleteKeysFromIndexedDB = useCallback(async (): Promise<void> => {
    await IndexedDBStorage.deleteEncryptedKeys(profileId);
  }, [profileId]);

  // List available profiles
  const listProfiles = useCallback(async (): Promise<string[]> => {
    return await IndexedDBStorage.listProfiles();
  }, []);

  // Redact keys from error messages
  const redactKeys = useCallback((message: string): string => {
    return message
      .replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-***REDACTED***')
      .replace(/AIza[a-zA-Z0-9]{20,}/g, 'AIza***REDACTED***')
      .replace(/sk-ant-[a-zA-Z0-9]{20,}/g, 'sk-ant-***REDACTED***');
  }, []);

  return {
    apiKeys,
    setApiKeys,
    clearApiKeys,
    validateApiKey,
    getApiKeyStatus,
    getApiKey,
    exportKeys,
    importKeys,
    saveKeysToIndexedDB,
    loadKeysFromIndexedDB,
    deleteKeysFromIndexedDB,
    listProfiles,
    redactKeys,
    isLoading
  };
}
