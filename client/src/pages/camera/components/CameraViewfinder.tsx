import { memo, RefObject, useRef, useCallback, useState } from "react";
import { Camera, EyeOff, FileText, Crosshair, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reticle } from "@/components/reticles";
import { LevelIndicator } from "@/components/level-indicator";
import { useI18n } from "@/lib/i18n";
import type { ReticleConfig, ReticlePosition } from "@shared/schema";

interface CameraViewfinderProps {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  reticleConfig: ReticleConfig;
  reticleColor: string;
  orientationData: {
    heading: number | null;
    tilt: number | null;
    roll: number | null;
  };
  showMaskButton?: boolean;
  onMask?: () => void;
  note?: string;
  showLevelIndicator?: boolean;
  stabilizationEnabled?: boolean;
  stability?: number;
  isStable?: boolean;
  onLongPressCapture?: (position: ReticlePosition) => void;
  reticlePosition?: ReticlePosition | null;
  adjustmentMode?: boolean;
  frozenFrame?: string | null;
  adjustmentPosition?: ReticlePosition;
  onAdjustmentPositionChange?: (position: ReticlePosition) => void;
  onAdjustmentConfirm?: () => void;
  onAdjustmentCancel?: () => void;
  showPlaceholder?: boolean;
  showFlash?: boolean;
}

const DRAG_OFFSET_PX = 60;

export const CameraViewfinder = memo(function CameraViewfinder({
  videoRef,
  canvasRef,
  isReady,
  isLoading,
  error,
  onRetry,
  reticleConfig,
  reticleColor,
  orientationData,
  showMaskButton,
  onMask,
  note,
  showLevelIndicator,
  stabilizationEnabled,
  stability,
  isStable,
  onLongPressCapture,
  reticlePosition,
  adjustmentMode,
  frozenFrame,
  adjustmentPosition,
  onAdjustmentPositionChange,
  onAdjustmentConfirm,
  onAdjustmentCancel,
  showPlaceholder,
  showFlash,
}: CameraViewfinderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragAiming, setIsDragAiming] = useState(false);
  const [dragAimPosition, setDragAimPosition] = useState<ReticlePosition | null>(null);

  const calculateOffsetPosition = useCallback((clientX: number, clientY: number): ReticlePosition | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top - DRAG_OFFSET_PX;
    
    const percentX = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const percentY = Math.max(0, Math.min(100, (y / rect.height) * 100));
    
    return { x: percentX, y: percentY };
  }, []);

  const handleDragAimStart = useCallback((clientX: number, clientY: number) => {
    if (!isReady || !reticleConfig.tapToPosition || adjustmentMode) return;
    
    const position = calculateOffsetPosition(clientX, clientY);
    if (position) {
      setIsDragAiming(true);
      setDragAimPosition(position);
    }
  }, [isReady, reticleConfig.tapToPosition, adjustmentMode, calculateOffsetPosition]);

  const handleDragAimMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragAiming) return;
    
    const position = calculateOffsetPosition(clientX, clientY);
    if (position) {
      setDragAimPosition(position);
    }
  }, [isDragAiming, calculateOffsetPosition]);

  const handleDragAimEnd = useCallback(() => {
    if (isDragAiming && dragAimPosition) {
      onLongPressCapture?.(dragAimPosition);
    }
    setIsDragAiming(false);
    setDragAimPosition(null);
  }, [isDragAiming, dragAimPosition, onLongPressCapture]);

  const handleAdjustmentDragStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!adjustmentMode) return;
    e.preventDefault();
    setIsDragging(true);
  }, [adjustmentMode]);

  const handleAdjustmentDrag = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!adjustmentMode || !isDragging) return;
    
    const container = containerRef.current;
    const rect = container?.getBoundingClientRect();
    if (!rect) return;
    
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length !== 1) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const percentX = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const percentY = Math.max(0, Math.min(100, (y / rect.height) * 100));
    
    onAdjustmentPositionChange?.({ x: percentX, y: percentY });
  }, [adjustmentMode, isDragging, onAdjustmentPositionChange]);

  const handleAdjustmentDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStartWrapper = useCallback(
    (e: React.TouchEvent) => {
      if (reticleConfig.tapToPosition && isReady && e.touches.length === 1) {
        const touch = e.touches[0];
        handleDragAimStart(touch.clientX, touch.clientY);
      }
    },
    [reticleConfig.tapToPosition, isReady, handleDragAimStart]
  );

  const handleTouchEndWrapper = useCallback(() => {
    handleDragAimEnd();
  }, [handleDragAimEnd]);

  const handleMouseDownWrapper = useCallback(
    (e: React.MouseEvent) => {
      handleDragAimStart(e.clientX, e.clientY);
    },
    [handleDragAimStart]
  );

  const handleMouseMoveWrapper = useCallback(
    (e: React.MouseEvent) => {
      handleDragAimMove(e.clientX, e.clientY);
    },
    [handleDragAimMove]
  );

  const handleMouseUpWrapper = useCallback(() => {
    handleDragAimEnd();
  }, [handleDragAimEnd]);

  const handleTouchMoveWrapper = useCallback(
    (e: React.TouchEvent) => {
      if (reticleConfig.tapToPosition && isReady && e.touches.length === 1) {
        const touch = e.touches[0];
        handleDragAimMove(touch.clientX, touch.clientY);
      }
    },
    [reticleConfig.tapToPosition, isReady, handleDragAimMove]
  );

  const displayPosition = (() => {
    if (adjustmentMode && adjustmentPosition) {
      return adjustmentPosition;
    }
    
    if (isDragAiming && dragAimPosition) {
      return dragAimPosition;
    }
    
    if (reticlePosition) {
      return reticlePosition;
    }
    
    return null;
  })();

  return (
    <div 
      ref={containerRef}
      className="relative flex-1 overflow-hidden"
      onTouchStart={adjustmentMode ? handleAdjustmentDragStart : handleTouchStartWrapper}
      onTouchEnd={adjustmentMode ? handleAdjustmentDragEnd : handleTouchEndWrapper}
      onTouchMove={adjustmentMode ? handleAdjustmentDrag : handleTouchMoveWrapper}
      onMouseDown={adjustmentMode ? handleAdjustmentDragStart : handleMouseDownWrapper}
      onMouseUp={adjustmentMode ? handleAdjustmentDragEnd : handleMouseUpWrapper}
      onMouseMove={adjustmentMode ? handleAdjustmentDrag : handleMouseMoveWrapper}
      onMouseLeave={adjustmentMode ? handleAdjustmentDragEnd : handleMouseUpWrapper}
    >
      <canvas ref={canvasRef} className="hidden" />

      {adjustmentMode && frozenFrame ? (
        <img
          src={frozenFrame}
          alt="Frozen frame"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          autoPlay
          muted
        />
      )}

      {showPlaceholder && !adjustmentMode && <PlaceholderOverlay />}
      {isLoading && !adjustmentMode && !showPlaceholder && <LoadingOverlay />}
      {error && !adjustmentMode && !showPlaceholder && <ErrorOverlay error={error} onRetry={onRetry} />}

      <div className="absolute inset-0 viewfinder-overlay pointer-events-none" />

      {(isReady || adjustmentMode) && <Reticle config={reticleConfig} dynamicColor={reticleColor} position={displayPosition} />}

      {isReady && note && !adjustmentMode && (
        <NoteOverlay note={note} />
      )}

      {isReady && showLevelIndicator && !adjustmentMode && (
        <LevelIndicator
          tilt={orientationData.tilt}
          roll={orientationData.roll}
        />
      )}

      {isReady && stabilizationEnabled && !adjustmentMode && (
        <StabilityIndicator stability={stability ?? 0} isStable={isStable ?? false} />
      )}

      {showMaskButton && onMask && !adjustmentMode && (
        <button
          className="absolute right-4 top-32 z-30 safe-top bg-card/60 rounded-xl p-2 border border-border/30 shadow-sm relative transition-opacity active:opacity-70"
          onClick={onMask}
          data-testid="button-mask"
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/20 border border-emerald-500/30">
            <EyeOff className="w-5 h-5 text-emerald-500 drop-shadow-[0_0_4px_rgb(16,185,129)]" />
          </div>
        </button>
      )}

      {adjustmentMode && (
        <AdjustmentControls
          onConfirm={onAdjustmentConfirm}
          onCancel={onAdjustmentCancel}
        />
      )}

      {showFlash && (
        <div 
          className="absolute inset-0 bg-white z-50 pointer-events-none animate-flash"
          style={{
            animation: 'flash 150ms ease-out forwards',
          }}
        />
      )}

      <style>{`
        @keyframes flash {
          0% { opacity: 0.9; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
});

interface AdjustmentControlsProps {
  onConfirm?: () => void;
  onCancel?: () => void;
}

const AdjustmentControls = memo(function AdjustmentControls({ onConfirm, onCancel }: AdjustmentControlsProps) {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-6">
      <button
        className="w-14 h-14 rounded-full bg-red-500/90 backdrop-blur-sm border border-white/10 text-white hover:bg-red-600 flex items-center justify-center shadow-lg transition-colors"
        onClick={onCancel}
        data-testid="button-adjustment-cancel"
      >
        <X className="w-7 h-7" />
      </button>
      <button
        className="w-14 h-14 rounded-full bg-emerald-500/90 backdrop-blur-sm border border-white/10 text-white hover:bg-emerald-600 flex items-center justify-center shadow-lg transition-colors"
        onClick={onConfirm}
        data-testid="button-adjustment-confirm"
      >
        <Check className="w-7 h-7" />
      </button>
    </div>
  );
});

const PlaceholderOverlay = memo(function PlaceholderOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-20 h-20 rounded-full bg-muted/20 border border-border/30 flex items-center justify-center">
          <Camera className="w-10 h-10 text-muted-foreground/50" />
        </div>
      </div>
    </div>
  );
});

const LoadingOverlay = memo(function LoadingOverlay() {
  const { t } = useI18n();
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-md">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <span className="absolute inset-0 rounded-full animate-ping bg-primary/30" style={{ animationDuration: '1.5s' }} />
          <div className="relative w-16 h-16 rounded-full bg-card/80 border border-border/50 flex items-center justify-center shadow-lg">
            <Camera className="w-8 h-8 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
          </div>
        </div>
        <span className="text-sm text-muted-foreground font-medium">{t.camera.startingCamera}</span>
      </div>
    </div>
  );
});

interface ErrorOverlayProps {
  error: string;
  onRetry: () => void;
}

const ErrorOverlay = memo(function ErrorOverlay({ error, onRetry }: ErrorOverlayProps) {
  const { t } = useI18n();
  
  const getLocalizedError = (errorCode: string): string => {
    switch (errorCode) {
      case "CAMERA_ACCESS_DENIED":
        return t.errors.cameraAccessDenied;
      case "CAMERA_NOT_FOUND":
        return t.errors.cameraNotFound;
      case "REQUESTED_DEVICE_NOT_FOUND":
        return t.errors.requestedDeviceNotFound;
      case "CAMERA_UNKNOWN_ERROR":
        return t.errors.cameraUnknownError;
      default:
        return t.errors.cameraUnknownError;
    }
  };
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/95 backdrop-blur-md p-6">
      <div className="flex flex-col items-center gap-5 text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center shadow-lg">
          <Camera className="w-8 h-8 text-destructive drop-shadow-[0_0_6px_hsl(var(--destructive)/0.5)]" />
        </div>
        <span className="text-sm text-foreground">{getLocalizedError(error)}</span>
        <Button onClick={onRetry} variant="outline" size="sm" data-testid="button-retry-camera">
          {t.camera.retry}
        </Button>
      </div>
    </div>
  );
});

interface NoteOverlayProps {
  note: string;
}

const NoteOverlay = memo(function NoteOverlay({ note }: NoteOverlayProps) {
  if (!note.trim()) return null;
  
  return (
    <div className="absolute top-4 left-4 z-20 safe-top max-w-[60%]">
      <div className="bg-card/80 backdrop-blur-md rounded-xl px-3 py-2.5 border border-border/50 shadow-lg">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-500/20 border border-emerald-500/40">
            <FileText className="w-4 h-4 text-emerald-500 drop-shadow-[0_0_4px_rgb(16,185,129)]" />
          </div>
          <p className="font-sans text-sm text-foreground/90 leading-tight line-clamp-3 pt-1.5" data-testid="text-note-overlay">
            {note}
          </p>
        </div>
      </div>
    </div>
  );
});

interface StabilityIndicatorProps {
  stability: number;
  isStable: boolean;
}

const StabilityIndicator = memo(function StabilityIndicator({ stability, isStable }: StabilityIndicatorProps) {
  const { t } = useI18n();
  
  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
      <div className="bg-card/80 backdrop-blur-md rounded-xl px-3 py-2.5 border border-border/50 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isStable 
              ? 'bg-emerald-500/20 border border-emerald-500/40' 
              : 'bg-amber-500/20 border border-amber-500/40'
          }`}>
            <Crosshair 
              className={`w-4 h-4 ${
                isStable 
                  ? 'text-emerald-500 drop-shadow-[0_0_4px_rgb(16,185,129)]' 
                  : 'text-amber-500 drop-shadow-[0_0_4px_rgb(245,158,11)]'
              }`}
            />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-xs text-foreground font-medium" data-testid="text-stability">
              {stability}%
            </span>
            <span className={`text-[10px] font-medium ${isStable ? 'text-emerald-500' : 'text-amber-500'}`}>
              {isStable ? t.camera.stable : t.camera.stabilizing}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
