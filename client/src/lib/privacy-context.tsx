import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { getConfig, initConfig, subscribeToConfig, updateConfig as updateRemoteConfig, isBackendAvailable, type DynamicConfig } from "./config-loader";
import { privacyModuleRegistry } from "@/privacy_modules";
import { resolveFavicon } from "@/privacy_modules/types";
import { obfuscate, deobfuscate } from "./obfuscation";

export type GestureType = 'patternUnlock' | 'severalFingers';

interface PrivacySettings {
  enabled: boolean;
  gestureType: GestureType;
  autoLockMinutes: number;
  secretPattern: string;
  unlockFingers: number;
  selectedModule: string;
  moduleUnlockValues: Record<string, string>;
}

interface PrivacyContextType {
  settings: PrivacySettings;
  isLocked: boolean;
  isBackgrounded: boolean;
  isConfigLoading: boolean;
  isBackendAvailable: boolean;
  showCamera: () => void;
  hideCamera: () => void;
  toggleLock: () => void;
  updateSettings: (updates: Partial<PrivacySettings>) => void;
  resetInactivityTimer: () => void;
}

const PrivacyContext = createContext<PrivacyContextType | null>(null);

const STORAGE_KEY = "app-mode";
const UNLOCKED_KEY = "app-unlocked";
const FAVICON_CAMERA = "/favicon.svg";
const TITLE_CAMERA = "Camroid M";
const DESCRIPTION_CAMERA = "Tactical camera with GPS, compass and precision overlays. Capture geotagged photos for fieldwork and surveying.";

export function configToSettings(config: DynamicConfig): PrivacySettings {
  return {
    enabled: config.PRIVACY_MODE,
    gestureType: config.UNLOCK_GESTURE,
    autoLockMinutes: config.AUTO_LOCK_MINUTES,
    secretPattern: config.UNLOCK_PATTERN,
    unlockFingers: config.UNLOCK_FINGERS,
    selectedModule: config.SELECTED_MODULE,
    moduleUnlockValues: { ...config.MODULE_UNLOCK_VALUES },
  };
}

function getDefaultSettings(): PrivacySettings {
  return configToSettings(getConfig());
}

function isPrivacyModeForced(): boolean {
  return getConfig().PRIVACY_MODE;
}

export function loadPrivacySettings(): PrivacySettings {
  const config = getConfig();
  const defaultSettings = configToSettings(config);
  
  if (config.PRIVACY_MODE) {
    return { ...defaultSettings, enabled: true };
  }
  
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return defaultSettings;
  }
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = deobfuscate(saved) as any;
      if (parsed) {
        return {
          ...defaultSettings,
          ...parsed,
          moduleUnlockValues: {
            ...config.MODULE_UNLOCK_VALUES,
            ...parsed.moduleUnlockValues,
          },
        };
      }
    }
  } catch {
    // Expected: localStorage may be unavailable or data corrupted
  }
  return defaultSettings;
}

function saveSettings(settings: PrivacySettings): void {
  if (isPrivacyModeForced()) {
    return;
  }
  
  try {
    const obfuscated = obfuscate(settings);
    localStorage.setItem(STORAGE_KEY, obfuscated);
  } catch {
    // Expected: localStorage may be unavailable in incognito mode
  }
}

function loadUnlockedState(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }
  
  try {
    return localStorage.getItem(UNLOCKED_KEY) === 'true';
  } catch {
    // Expected: localStorage may be unavailable in incognito mode
    return false;
  }
}

function saveUnlockedState(unlocked: boolean): void {
  try {
    if (unlocked) {
      localStorage.setItem(UNLOCKED_KEY, 'true');
    } else {
      localStorage.removeItem(UNLOCKED_KEY);
    }
  } catch {
    // Expected: localStorage may be unavailable in incognito mode
  }
}

function updateFavicon(isLocked: boolean, selectedModule?: string): void {
  const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
  if (link) {
    if (isLocked && selectedModule) {
      const moduleConfig = privacyModuleRegistry.get(selectedModule);
      link.href = moduleConfig ? resolveFavicon(moduleConfig.favicon) : '/game-icon.svg';
    } else {
      link.href = FAVICON_CAMERA;
    }
  }
}

function updateTitle(isLocked: boolean, selectedModule?: string): void {
  if (isLocked && selectedModule) {
    const moduleConfig = privacyModuleRegistry.get(selectedModule);
    document.title = moduleConfig?.title || '2048';
  } else {
    document.title = TITLE_CAMERA;
  }
}

function updateMetaTags(isLocked: boolean, selectedModule?: string): void {
  const moduleConfig = isLocked && selectedModule ? privacyModuleRegistry.get(selectedModule) : null;
  
  const title = moduleConfig?.title || TITLE_CAMERA;
  const description = moduleConfig?.description || DESCRIPTION_CAMERA;
  
  const metaUpdates: Record<string, string> = {
    'description': description,
    'apple-mobile-web-app-title': title,
    'application-name': title,
  };
  
  for (const [name, content] of Object.entries(metaUpdates)) {
    const meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
    if (meta) {
      meta.setAttribute('content', content);
    }
  }
}

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [settings, setSettings] = useState<PrivacySettings>(getDefaultSettings);
  const [isLocked, setIsLocked] = useState(false);
  const [isBackgrounded, setIsBackgrounded] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);
  
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activityThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    initConfig().then(() => {
      const loadedSettings = loadPrivacySettings();
      setSettings(loadedSettings);
      setBackendAvailable(isBackendAvailable());
      
      if (loadedSettings.enabled) {
        const wasUnlocked = loadUnlockedState();
        setIsLocked(!wasUnlocked);
        updateFavicon(!wasUnlocked, loadedSettings.selectedModule);
        updateTitle(!wasUnlocked, loadedSettings.selectedModule);
        updateMetaTags(!wasUnlocked, loadedSettings.selectedModule);
      }
      
      setIsConfigLoading(false);
    });
    
    const unsubscribe = subscribeToConfig(() => {
      setBackendAvailable(isBackendAvailable());
    });
    
    return unsubscribe;
  }, []);
  
  const showCamera = useCallback(() => {
    setIsLocked(false);
    saveUnlockedState(true);
    updateFavicon(false);
    updateTitle(false);
    updateMetaTags(false);
  }, []);
  
  const hideCamera = useCallback(() => {
    if (!settings.enabled) return;
    setIsLocked(true);
    saveUnlockedState(false);
    updateFavicon(true, settings.selectedModule);
    updateTitle(true, settings.selectedModule);
    updateMetaTags(true, settings.selectedModule);
  }, [settings.enabled, settings.selectedModule]);
  
  const toggleLock = useCallback(() => {
    setIsLocked(prev => {
      const newValue = !prev;
      saveUnlockedState(!newValue);
      updateFavicon(newValue, settings.selectedModule);
      updateTitle(newValue, settings.selectedModule);
      updateMetaTags(newValue, settings.selectedModule);
      return newValue;
    });
  }, [settings.selectedModule]);
  
  const updateSettings = useCallback((updates: Partial<PrivacySettings>) => {
    if (isPrivacyModeForced() && 'enabled' in updates && !updates.enabled) {
      return;
    }
    
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      saveSettings(newSettings);
      
      if ('enabled' in updates) {
        if (updates.enabled) {
          setIsLocked(false);
          saveUnlockedState(true);
          updateFavicon(false);
          updateTitle(false);
          updateMetaTags(false);
          
          if (backendAvailable) {
            updateRemoteConfig({ PRIVACY_MODE: true });
          }
        } else {
          setIsLocked(false);
          saveUnlockedState(false);
          updateFavicon(false);
          updateTitle(false);
          updateMetaTags(false);
          
          if (backendAvailable) {
            updateRemoteConfig({ PRIVACY_MODE: false });
          }
        }
      }
      
      return newSettings;
    });
  }, [backendAvailable]);
  
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    if (!isLocked && settings.enabled && settings.autoLockMinutes > 0) {
      inactivityTimerRef.current = setTimeout(() => {
        hideCamera();
      }, settings.autoLockMinutes * 60 * 1000);
    }
  }, [isLocked, settings.enabled, settings.autoLockMinutes, hideCamera]);
  
  useEffect(() => {
    if (settings.enabled) {
      updateFavicon(isLocked, settings.selectedModule);
      updateTitle(isLocked, settings.selectedModule);
      updateMetaTags(isLocked, settings.selectedModule);
    } else {
      updateFavicon(false);
      updateTitle(false);
      updateMetaTags(false);
    }
  }, [settings.enabled, settings.selectedModule, isLocked]);
  
  useEffect(() => {
    resetInactivityTimer();
    
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [resetInactivityTimer]);
  
  const ACTIVITY_THROTTLE_MS = 1000;
  useEffect(() => {
    const handleActivity = () => {
      if (isLocked) return;
      
      if (activityThrottleRef.current) return;
      
      resetInactivityTimer();
      
      activityThrottleRef.current = setTimeout(() => {
        activityThrottleRef.current = null;
      }, ACTIVITY_THROTTLE_MS);
    };
    
    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity);
    
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (activityThrottleRef.current) {
        clearTimeout(activityThrottleRef.current);
      }
    };
  }, [isLocked, resetInactivityTimer]);
  
  useEffect(() => {
    if (!settings.enabled) return;
    
    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        setIsBackgrounded(true);
        hideCamera();
      } else {
        setIsBackgrounded(false);
      }
    };
    
    const handlePageHide = () => {
      setIsBackgrounded(true);
      hideCamera();
    };
    
    const handlePageShow = () => {
      setIsBackgrounded(false);
    };
    
    const handleBlur = () => {
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        setIsBackgrounded(true);
        hideCamera();
      }
    };
    
    const handleFocus = () => {
      setIsBackgrounded(false);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [settings.enabled, hideCamera]);
  
  return (
    <PrivacyContext.Provider
      value={{
        settings,
        isLocked,
        isBackgrounded,
        isConfigLoading,
        isBackendAvailable: backendAvailable,
        showCamera,
        hideCamera,
        toggleLock,
        updateSettings,
        resetInactivityTimer,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error("usePrivacy must be used within a PrivacyProvider");
  }
  return context;
}
