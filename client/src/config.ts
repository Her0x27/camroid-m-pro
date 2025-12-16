/**
 * Application Configuration
 */

export type GestureType = 'patternUnlock' | 'severalFingers';

export const CONFIG = {
  // === PRIVACY MODE ===
  // Set to true to hide the camera and show only the privacy module app for all users
  // Set to false to allow users to access the camera (privacy mode becomes optional)
  PRIVACY_MODE: true,

  // === PRIVACY MODULE CONFIGURATION ===
  // Default privacy module app to show when privacy mode is active
  // Available: 'game-2048', 'calculator', 'notepad'
  SELECTED_MODULE: 'game-2048',

  // Unlock values for each privacy module app (unique unlock method per module)
  // - calculator: sequence of digits ending with '=' (e.g., '123456=')
  // - notepad: secret phrase to type (e.g., 'secret')
  // - game-2048: not used (uses universal unlock methods)
  MODULE_UNLOCK_VALUES: {
    'calculator': '123456=',
    'notepad': 'secret',
    'game-2048': '',
  } as Record<string, string>,

  // === UNIVERSAL UNLOCK CONFIGURATION ===
  // These methods work as fallback for all privacy modules
  
  // Type of gesture required to unlock the camera when privacy mode is active
  // 'patternUnlock': Requires drawing a specific pattern on the screen (recommended)
  // 'severalFingers': Requires touching the screen with multiple fingers simultaneously (3-9 fingers)
  UNLOCK_GESTURE: 'severalFingers' as GestureType,

  // Secret pattern for 'patternUnlock' mode - sequence of grid positions separated by dashes
  // Grid layout (0-indexed):
  //   0 1 2
  //   3 4 5
  //   6 7 8
  // Example: '0-4-8' means tap top-left → center → bottom-right (diagonal)
  // Only used when UNLOCK_GESTURE is 'patternUnlock'
  UNLOCK_PATTERN: '0-4-8-5',

  // Number of fingers required for 'severalFingers' mode (3-9)
  // Only used when UNLOCK_GESTURE is 'severalFingers'
  UNLOCK_FINGERS: 4,

  // === AUTO-LOCK CONFIGURATION ===
  // Minutes of inactivity before camera automatically hides when privacy mode is enabled
  // Set to 0 to disable auto-lock
  AUTO_LOCK_MINUTES: 5,

  // === DEBUG MODE ===
  // When true, logs unlock attempts and other debug info to console
  // Only works in development
  DEBUG_MODE: false,
} as const;
