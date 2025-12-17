import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera } from "lucide-react";
import { useLazyLoaderOptional, INITIAL_MODULES, preloadModule, MODULE_NAMES } from "@/lib/lazy-loader-context";

interface SplashScreenProps {
  onComplete: () => void;
}

function HandFlippingStone({ onReveal }: { onReveal: () => void }) {
  const [phase, setPhase] = useState<"initial" | "grabbing" | "flipping" | "revealed">("initial");

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase("grabbing"), 400);
    const timer2 = setTimeout(() => setPhase("flipping"), 900);
    const timer3 = setTimeout(() => {
      setPhase("revealed");
      setTimeout(onReveal, 500);
    }, 1600);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onReveal]);

  return (
    <motion.div
      className="relative w-52 h-52 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.4 }}
      style={{ perspective: "500px" }}
    >
      <svg viewBox="0 0 120 120" className="w-full h-full" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="stoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="50%" stopColor="#4b5563" />
            <stop offset="100%" stopColor="#374151" />
          </linearGradient>
          <linearGradient id="stoneBottom" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>
          <linearGradient id="handGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fcd5b5" />
            <stop offset="100%" stopColor="#e0b090" />
          </linearGradient>
          <linearGradient id="cameraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(142, 71%, 45%)" />
            <stop offset="100%" stopColor="hsl(142, 71%, 35%)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="shadow">
            <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.5" />
          </filter>
        </defs>

        <motion.g
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ 
            opacity: phase === "revealed" ? 1 : 0, 
            scale: phase === "revealed" ? 1 : 0.3,
            y: phase === "revealed" ? 0 : 10,
          }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <rect
            x="38" y="52" width="44" height="32" rx="5"
            fill="url(#cameraGrad)" filter="url(#glow)"
          />
          <circle cx="60" cy="68" r="11" fill="#0a0a0a" stroke="hsl(142, 71%, 50%)" strokeWidth="2.5" />
          <circle cx="60" cy="68" r="6" fill="hsl(142, 71%, 45%)" />
          <circle cx="60" cy="68" r="2" fill="#fff" opacity="0.6" />
          <rect x="46" y="46" width="14" height="8" rx="2" fill="url(#cameraGrad)" />
          <circle cx="74" cy="56" r="3" fill="#ef4444">
            <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
          </circle>
        </motion.g>

        <motion.g
          initial={{ rotateX: 0, y: 0, x: 0, scale: 1, opacity: 1 }}
          animate={{
            rotateX: phase === "flipping" || phase === "revealed" ? 180 : 0,
            y: phase === "grabbing" ? -8 : phase === "flipping" || phase === "revealed" ? -50 : 0,
            x: phase === "flipping" || phase === "revealed" ? -25 : 0,
            scale: phase === "flipping" || phase === "revealed" ? 0.7 : 1,
            opacity: phase === "revealed" ? 0.6 : 1,
          }}
          transition={{ 
            duration: phase === "flipping" ? 0.6 : 0.4, 
            ease: [0.34, 1.56, 0.64, 1] 
          }}
          style={{ transformOrigin: "60px 70px", transformStyle: "preserve-3d" }}
        >
          <ellipse
            cx="60" cy="70" rx="30" ry="20"
            fill="url(#stoneGrad)" filter="url(#shadow)"
          />
          <ellipse cx="50" cy="65" rx="8" ry="4" fill="#9ca3af" opacity="0.3" />
          <ellipse cx="70" cy="75" rx="5" ry="2.5" fill="#6b7280" opacity="0.4" />
          <ellipse cx="55" cy="73" rx="4" ry="2" fill="#78716c" opacity="0.25" />
        </motion.g>

        <motion.g
          initial={{ x: -60, opacity: 0 }}
          animate={{ 
            x: 0, 
            opacity: 1,
            y: phase === "grabbing" ? -5 : phase === "flipping" || phase === "revealed" ? -45 : 5,
            rotate: phase === "flipping" || phase === "revealed" ? -35 : phase === "grabbing" ? -10 : 0,
          }}
          transition={{ 
            x: { duration: 0.4, ease: "easeOut" },
            y: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
            rotate: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
          }}
          style={{ transformOrigin: "35px 85px" }}
        >
          <path
            d="M12 90 Q18 78 35 74 L47 62 Q52 56 58 59 L64 52 Q69 48 74 53 L70 65 Q66 75 55 82 L42 90 Q28 98 15 93 Z"
            fill="url(#handGrad)"
            stroke="#c9a074"
            strokeWidth="1"
          />
          <path d="M35 74 L32 84" stroke="#c9a074" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M47 65 L44 76" stroke="#c9a074" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M58 59 L55 71" stroke="#c9a074" strokeWidth="1.2" strokeLinecap="round" />
          <ellipse cx="25" cy="92" rx="5" ry="2.5" fill="#e0b090" />
        </motion.g>
      </svg>
    </motion.div>
  );
}

function CameraFlash({ onComplete }: { onComplete: () => void }) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const flashTimer = setTimeout(() => {
      setFlash(true);
      setTimeout(() => {
        setFlash(false);
        setTimeout(onComplete, 300);
      }, 150);
    }, 400);
    return () => clearTimeout(flashTimer);
  }, [onComplete]);

  return (
    <motion.div
      className="relative w-40 h-40 flex items-center justify-center"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <AnimatePresence>
        {flash && (
          <motion.div
            className="absolute inset-0 rounded-full bg-white"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: "conic-gradient(from 0deg, rgb(16 185 129 / 0.4), rgb(16 185 129 / 0.1), rgb(16 185 129 / 0.4))",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
      
      <motion.div className="absolute inset-2 rounded-full bg-background" />

      <motion.div
        className="absolute inset-4 rounded-full border border-emerald-500/30"
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div className="relative z-10 flex items-center justify-center">
        <div className="relative">
          <Camera className="w-16 h-16 text-emerald-500" strokeWidth={1.5} />
          <motion.div
            className="absolute -right-1 -bottom-1 w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <span className="text-white font-bold text-base">M</span>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AnimatedLetter({ 
  letter, 
  index, 
  total,
  isSpecial = false 
}: { 
  letter: string; 
  index: number; 
  total: number;
  isSpecial?: boolean;
}) {
  const angle = ((index - total / 2) * 40) + (Math.random() - 0.5) * 20;
  const distance = 80 + Math.random() * 40;
  const startX = Math.cos((angle * Math.PI) / 180) * distance;
  const startY = Math.sin((angle * Math.PI) / 180) * distance - 30;
  const startRotate = (Math.random() - 0.5) * 180;

  return (
    <motion.span
      className={`inline-block ${isSpecial ? 'text-emerald-500 ml-3' : 'text-foreground'}`}
      style={{ 
        fontFamily: "'Orbitron', sans-serif",
        fontWeight: isSpecial ? 700 : 600,
        textShadow: isSpecial ? '0 0 20px rgb(16 185 129 / 0.6)' : 'none'
      }}
      initial={{ 
        opacity: 0,
        x: startX,
        y: startY,
        rotate: startRotate,
        scale: 0.2
      }}
      animate={{ 
        opacity: 1,
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1
      }}
      transition={{ 
        duration: 0.5,
        delay: index * 0.07,
        ease: [0.34, 1.56, 0.64, 1]
      }}
    >
      {letter}
    </motion.span>
  );
}

function BrandTextAnimation() {
  const text = "Camroid";
  const letters = text.split("");

  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-4xl tracking-tight flex items-center">
        {letters.map((letter, index) => (
          <AnimatedLetter 
            key={index} 
            letter={letter} 
            index={index} 
            total={letters.length + 1}
          />
        ))}
        <AnimatedLetter 
          letter="M" 
          index={letters.length} 
          total={letters.length + 1}
          isSpecial
        />
      </h1>
      
      <motion.p 
        className="text-xs text-muted-foreground font-medium tracking-[0.2em] uppercase"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        Private Camera Zero-Day
      </motion.p>
    </motion.div>
  );
}

function isPrivacyModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = window.localStorage.getItem("app-mode");
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.enabled === true;
    }
  } catch {
  }
  return false;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const privacyMode = useRef(isPrivacyModeEnabled());
  const [phase, setPhase] = useState<"hand" | "camera" | "text" | "loading" | "complete">(
    privacyMode.current ? "loading" : "hand"
  );
  const loaderContext = useLazyLoaderOptional();
  const initializedRef = useRef(false);
  const preloadStartedRef = useRef(false);
  
  const progress = loaderContext?.progress ?? 0;
  const currentModule = loaderContext?.currentModule ?? null;
  const allLoaded = loaderContext?.allLoaded ?? false;

  useEffect(() => {
    if (loaderContext && !initializedRef.current) {
      initializedRef.current = true;
      loaderContext.initializeModules(INITIAL_MODULES);
    }
  }, [loaderContext]);

  useEffect(() => {
    if (preloadStartedRef.current) return;
    preloadStartedRef.current = true;
    preloadModule(MODULE_NAMES.gallery);
    preloadModule(MODULE_NAMES.settings);
  }, []);

  useEffect(() => {
    if (allLoaded && phase === "loading") {
      setPhase("complete");
      onComplete();
    }
  }, [allLoaded, phase, onComplete]);

  const handleReveal = () => setPhase("camera");
  
  const handleCameraComplete = () => {
    setPhase("text");
    setTimeout(() => setPhase("loading"), 1000);
  };

  const getLoadingText = () => {
    if (currentModule) return `Загрузка: ${currentModule}...`;
    if (allLoaded) return "Готово!";
    return "Инициализация...";
  };

  return (
    <AnimatePresence>
      {phase !== "complete" && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-background to-background/95"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="relative flex flex-col items-center gap-8">
            <AnimatePresence mode="wait">
              {phase === "hand" && (
                <HandFlippingStone key="hand" onReveal={handleReveal} />
              )}
              
              {phase === "camera" && (
                <CameraFlash key="camera" onComplete={handleCameraComplete} />
              )}
              
              {(phase === "text" || phase === "loading") && !privacyMode.current && (
                <motion.div
                  key="content"
                  className="flex flex-col items-center gap-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="relative w-20 h-20 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                  >
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: "conic-gradient(from 0deg, rgb(16 185 129 / 0.3), rgb(16 185 129 / 0.1), rgb(16 185 129 / 0.3))",
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div className="absolute inset-1 rounded-full bg-background" />
                    <Camera className="relative z-10 w-9 h-9 text-emerald-500" strokeWidth={1.5} />
                  </motion.div>

                  <BrandTextAnimation />

                  {phase === "loading" && (
                    <motion.div
                      className="flex flex-col items-center gap-2"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="relative w-56 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <motion.div
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                          initial={{ width: "0%" }}
                          animate={{ width: `${Math.max(progress, 5)}%` }}
                          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        />
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: "linear-gradient(90deg, transparent, rgb(16 185 129 / 0.3), transparent)",
                          }}
                          animate={{ x: ["-100%", "200%"] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </div>
                      
                      <motion.p
                        className="text-[11px] text-muted-foreground h-4"
                        key={currentModule || "init"}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {getLoadingText()}
                      </motion.p>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {phase === "loading" && privacyMode.current && (
                <motion.div
                  key="privacy-loading"
                  className="flex flex-col items-center gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="w-8 h-8 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.p
                    className="text-sm text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    Загрузка...
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {!privacyMode.current && (
              <motion.div
                className="absolute -z-10 w-96 h-96 rounded-full"
                style={{
                  background: "radial-gradient(circle, rgb(16 185 129 / 0.05) 0%, transparent 60%)",
                }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
