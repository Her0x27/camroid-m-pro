import { Suspense } from "react";
import { usePrivacy } from "@/lib/privacy-context";
import { privacyModuleRegistry } from "@/privacy_modules";

export default function PrivacyModulePage() {
  const { settings, showCamera } = usePrivacy();

  const moduleConfig = privacyModuleRegistry.get(settings.selectedModule) || privacyModuleRegistry.getDefault();
  
  if (!moduleConfig) {
    return <div>No privacy module configured</div>;
  }

  const ModuleComponent = moduleConfig.component;
  const unlockValue = settings.moduleUnlockValues[settings.selectedModule] || '';

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-background"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <ModuleComponent
        onSecretGesture={showCamera}
        gestureType={settings.gestureType}
        secretPattern={settings.secretPattern}
        unlockFingers={settings.unlockFingers}
        unlockValue={unlockValue}
        onUnlock={showCamera}
      />
    </Suspense>
  );
}
