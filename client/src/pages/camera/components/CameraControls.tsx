import { memo, useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Camera, Settings2, Images, FileText, CloudUpload, Palette } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface CameraControlsProps {
  onCapture: () => void;
  onNavigateGallery: () => void;
  onNavigateSettings: () => void;
  onOpenNote: () => void;
  isReady: boolean;
  isCapturing: boolean;
  isProcessing: boolean;
  accuracyBlocked: boolean;
  accuracy: number | null;
  hasNote: boolean;
  lastPhotoThumb: string | null;
  photoCount: number;
  cloudCount: number;
  dynamicColor?: string;
}

export const CameraControls = memo(function CameraControls({
  onCapture,
  onNavigateGallery,
  onNavigateSettings,
  onOpenNote,
  isReady,
  isCapturing,
  isProcessing,
  accuracyBlocked,
  accuracy,
  hasNote,
  lastPhotoThumb,
  photoCount,
  cloudCount,
  dynamicColor,
}: CameraControlsProps) {
  return (
    <div className="safe-bottom absolute inset-x-0 bottom-0 z-20">
      <div className="relative flex items-center justify-center px-[5%] py-3 h-24">
        <CaptureButton
          onCapture={onCapture}
          isReady={isReady}
          isCapturing={isCapturing}
          accuracyBlocked={accuracyBlocked}
          accuracy={accuracy}
          dynamicColor={dynamicColor}
        />

        <GalleryButton
          onNavigate={onNavigateGallery}
          lastPhotoThumb={lastPhotoThumb}
          photoCount={photoCount}
          cloudCount={cloudCount}
          isProcessing={isProcessing}
        />

        <RightControls
          onOpenNote={onOpenNote}
          onNavigateSettings={onNavigateSettings}
          hasNote={hasNote}
        />
      </div>
    </div>
  );
});

interface CaptureButtonProps {
  onCapture: () => void;
  isReady: boolean;
  isCapturing: boolean;
  accuracyBlocked: boolean;
  accuracy: number | null;
  dynamicColor?: string;
}

const CaptureButton = memo(function CaptureButton({
  onCapture,
  isReady,
  isCapturing,
  accuracyBlocked,
  accuracy,
  dynamicColor,
}: CaptureButtonProps) {
  const formatAccuracy = (acc: number | null): string => {
    if (acc === null) return "---";
    return `±${Math.round(acc)}m`;
  };

  const baseColor = dynamicColor || "#22c55e";
  
  const getBorderStyle = () => {
    if (accuracyBlocked) {
      return "border-destructive/60";
    }
    if (isReady && !isCapturing) {
      return "";
    }
    return "border-muted-foreground/40";
  };
  
  const getBorderColor = () => {
    if (accuracyBlocked || !(isReady && !isCapturing)) return undefined;
    return baseColor;
  };
  
  const getBoxShadow = () => {
    if (accuracyBlocked) {
      return "0 0 10px hsl(var(--destructive)/0.3)";
    }
    if (isReady && !isCapturing) {
      return `0 0 12px ${baseColor}50`;
    }
    return undefined;
  };

  return (
    <button
      onClick={onCapture}
      disabled={!isReady || isCapturing || accuracyBlocked}
      className={`relative aspect-square w-20 h-20 rounded-full flex items-center justify-center transition-all overflow-visible ${
        accuracyBlocked
          ? ""
          : isReady && !isCapturing
            ? "active:scale-95"
            : ""
      }`}
      data-testid="button-capture"
    >
      {isReady && !isCapturing && !accuracyBlocked && (
        <span 
          className="absolute inset-0 rounded-full animate-ping" 
          style={{ 
            animationDuration: '2.5s',
            backgroundColor: `${baseColor}15`
          }} 
        />
      )}
      
      <span 
        className={`absolute inset-0 rounded-full border-4 transition-all ${getBorderStyle()}`}
        style={{
          borderColor: getBorderColor(),
          boxShadow: getBoxShadow(),
        }}
      />
      
      <span className={`absolute inset-1 rounded-full transition-all ${
        accuracyBlocked
          ? "bg-destructive/15"
          : isReady && !isCapturing
            ? "bg-card/60 backdrop-blur-sm"
            : "bg-muted/30"
      }`} />
      
      <div 
        className={`relative z-10 w-[65%] h-[65%] rounded-full transition-all flex items-center justify-center shadow-md ${
          accuracyBlocked
            ? "bg-destructive/40 border-2 border-destructive/60"
            : isCapturing 
              ? "scale-75 border-2 border-white/20" 
              : isReady 
                ? "border-2 border-white/20" 
                : "bg-muted border-2 border-muted-foreground/30"
        }`}
        style={!accuracyBlocked && (isReady || isCapturing) ? {
          backgroundColor: baseColor,
          boxShadow: `0 0 8px ${baseColor}60`,
        } : undefined}
      >
        <span 
          className={`text-[11px] font-bold font-mono ${
            accuracyBlocked 
              ? "text-destructive-foreground" 
              : isReady || isCapturing
                ? "text-white/90" 
                : "text-muted-foreground"
          }`}
          style={!accuracyBlocked && (isReady || isCapturing) ? {
            textShadow: `0 0 2px ${baseColor}80`,
          } : undefined}
          data-testid="text-accuracy"
        >
          {formatAccuracy(accuracy)}
        </span>
      </div>
    </button>
  );
});

interface GalleryButtonProps {
  onNavigate: () => void;
  lastPhotoThumb: string | null;
  photoCount: number;
  cloudCount: number;
  isProcessing: boolean;
}

const GalleryButton = memo(function GalleryButton({
  onNavigate,
  lastPhotoThumb,
  photoCount,
  cloudCount,
  isProcessing,
}: GalleryButtonProps) {
  const { t } = useI18n();
  
  return (
    <div className="absolute left-4 flex items-center">
      <button
        className="bg-card/80 backdrop-blur-md rounded-xl p-2 border border-border/20 shadow-sm relative transition-opacity active:opacity-70"
        onClick={onNavigate}
        data-testid="button-gallery"
      >
        {lastPhotoThumb ? (
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-emerald-500/30">
            <img 
              src={lastPhotoThumb} 
              alt={t.camera.lastPhoto} 
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/20 border border-emerald-500/30">
            <Images className="w-5 h-5 text-emerald-500 drop-shadow-[0_0_4px_rgb(16,185,129)]" />
          </div>
        )}
        {isProcessing && (
          <span 
            className="absolute inset-0 rounded-xl border border-emerald-500/40 animate-pulse"
            data-testid="indicator-processing"
          />
        )}
        {photoCount > 0 && (
          <span 
            className="absolute -top-1.5 -right-1.5 min-w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center gap-0.5 px-1 shadow-md"
            data-testid="badge-photo-count"
          >
            <Camera className="w-2.5 h-2.5" />
            {photoCount > 99 ? "99+" : photoCount}
          </span>
        )}
        {cloudCount > 0 && (
          <span 
            className="absolute -bottom-1.5 -right-1.5 min-w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center gap-0.5 px-1 shadow-md"
            data-testid="badge-cloud-count"
          >
            <CloudUpload className="w-2.5 h-2.5" />
            {cloudCount > 99 ? "99+" : cloudCount}
          </span>
        )}
      </button>
    </div>
  );
});

interface RightControlsProps {
  onOpenNote: () => void;
  onNavigateSettings: () => void;
  hasNote: boolean;
}

const RightControls = memo(function RightControls({
  onOpenNote,
  onNavigateSettings,
  hasNote,
}: RightControlsProps) {
  const [, navigate] = useLocation();
  const [showEditorIcon, setShowEditorIcon] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const handlePointerDown = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setShowEditorIcon(true);
    }, 500);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!isLongPress.current) {
      onNavigateSettings();
    }
  }, [onNavigateSettings]);

  const handlePointerLeave = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleVisualEditor = useCallback(() => {
    setShowEditorIcon(false);
    navigate("/ve-watermark");
  }, [navigate]);

  const handleEditorIconPointerLeave = useCallback(() => {
    setShowEditorIcon(false);
  }, []);

  return (
    <div className="absolute right-4 flex items-center gap-2">
      <button
        className="bg-card/80 backdrop-blur-md rounded-xl p-2 border border-border/20 shadow-sm relative transition-opacity active:opacity-70"
        onClick={onOpenNote}
        data-testid="button-note"
      >
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/20 border border-emerald-500/30">
          <FileText className="w-5 h-5 text-emerald-500 drop-shadow-[0_0_4px_rgb(16,185,129)]" />
        </div>
        {hasNote && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_6px_rgb(16,185,129)]" />
        )}
      </button>

      <div className="relative">
        {showEditorIcon && (
          <button
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-card/80 backdrop-blur-md rounded-xl p-2 border border-border/20 shadow-sm transition-all animate-in fade-in zoom-in-90 duration-200"
            onClick={handleVisualEditor}
            onPointerLeave={handleEditorIconPointerLeave}
            data-testid="button-visual-editor"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/20 border border-emerald-500/30">
              <Palette className="w-5 h-5 text-emerald-500 drop-shadow-[0_0_4px_rgb(16,185,129)]" />
            </div>
          </button>
        )}
        <button
          className="bg-card/80 backdrop-blur-md rounded-xl p-2 border border-border/20 shadow-sm transition-opacity active:opacity-70"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onPointerCancel={handlePointerLeave}
          onClick={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          data-testid="button-settings"
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/20 border border-emerald-500/30">
            <Settings2 className="w-5 h-5 text-emerald-500 drop-shadow-[0_0_4px_rgb(16,185,129)]" />
          </div>
        </button>
      </div>
    </div>
  );
});
