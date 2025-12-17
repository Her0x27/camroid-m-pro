import React, { useState, Suspense } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsProvider } from "@/lib/settings-context";
import { I18nProvider } from "@/lib/i18n";
import { PrivacyProvider, usePrivacy } from "@/lib/privacy-context";
import { ThemeProvider } from "@/lib/theme-context";
import { SplashScreen } from "@/components/splash-screen";
import { ErrorBoundary } from "@/components/error-boundary";
import { PrivacyOverlay } from "@/components/privacy-overlay";
import { LazyLoaderProvider, createTrackedLazy, MODULE_NAMES } from "@/lib/lazy-loader-context";
import { PageLoader } from "@/components/page-loader";

const CameraPage = createTrackedLazy(MODULE_NAMES.cameraChunk, () => import("@/pages/camera"));
const GalleryPage = createTrackedLazy(MODULE_NAMES.gallery, () => import("@/pages/gallery"));
const PhotoDetailPage = createTrackedLazy(MODULE_NAMES.photoDetail, () => import("@/pages/photo-detail"));
const SettingsPage = createTrackedLazy(MODULE_NAMES.settings, () => import("@/pages/settings"));
const GamePage = createTrackedLazy(MODULE_NAMES.game, () => import("@/pages/game"));
const VisualEditorWatermarkPage = createTrackedLazy(MODULE_NAMES.watermarkPreview, () => import("@/pages/watermark-ve"));
const NotFound = createTrackedLazy(MODULE_NAMES.notFound, () => import("@/pages/not-found"));

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <TooltipProvider>
            <SettingsProvider>
              <PrivacyProvider>
                <LazyLoaderProvider>
                  {children}
                </LazyLoaderProvider>
              </PrivacyProvider>
            </SettingsProvider>
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function AppContent() {
  const { settings, isLocked, isConfigLoading } = usePrivacy();
  const [showSplash, setShowSplash] = useState<boolean | null>(null);

  React.useEffect(() => {
    if (!isConfigLoading && showSplash === null) {
      if (settings.enabled) {
        setShowSplash(false);
      } else {
        const hasSeenSplash = sessionStorage.getItem("hasSeenSplash");
        setShowSplash(!hasSeenSplash);
      }
    }
  }, [isConfigLoading, settings.enabled, showSplash]);

  const handleSplashComplete = () => {
    sessionStorage.setItem("hasSeenSplash", "true");
    setShowSplash(false);
  };

  if (isConfigLoading || showSplash === null) {
    return <PageLoader variant="fullscreen" />;
  }

  if (settings.enabled && isLocked) {
    return (
      <Suspense fallback={<PageLoader variant="fullscreen" />}>
        <GamePage />
      </Suspense>
    );
  }

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <Suspense fallback={<PageLoader variant="branded" />}>
        <Switch>
          <Route path="/" component={CameraPage} />
          <Route path="/gallery" component={GalleryPage} />
          <Route path="/photo/:id" component={PhotoDetailPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/ve-watermark" component={VisualEditorWatermarkPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
      <Toaster />
      <PrivacyOverlay />
    </>
  );
}

function App() {
  return (
    <Providers>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </Providers>
  );
}

export default App;
