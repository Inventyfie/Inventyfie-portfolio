import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {createPortal} from 'react-dom';

type MascotMode = 'idle' | 'reading' | 'comparing';

interface MascotWatcherProps {
  className?: string;
  mode?: MascotMode;
  onOpenSummary?: () => void;
}

export const MascotWatcher: React.FC<MascotWatcherProps> = ({
  className = 'w-16 h-16',
  mode = 'idle',
  onOpenSummary,
}) => {
  const targetPos = useRef({x: 0, y: 0});
  const currentPos = useRef({x: 0, y: 0});
  const lastMousePosRef = useRef({x: 0, y: 0});
  const lastMoveTimeRef = useRef<number>(performance.now());
  const cursorVelocityRef = useRef({x: 0, y: 0});
  const hasPointerMovedRef = useRef(false);
  const lastDodgeCursorPosRef = useRef<{x: number; y: number} | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const runningEndRef = useRef<number | null>(null);
  const runCooldownRef = useRef<number>(0);
  const hopResetRef = useRef<number | null>(null);
  const returnResetRef = useRef<number | null>(null);
  const speechTimeoutRef = useRef<number | null>(null);
  const noteTimeoutsRef = useRef<number[]>([]);
  const blinkTimeoutRef = useRef<number | null>(null);
  const leftEyeRef = useRef<SVGGElement>(null);
  const rightEyeRef = useRef<SVGGElement>(null);
  const lastNoteAtRef = useRef<number>(0);

  const [isBlinking, setIsBlinking] = useState(false);
  const [isNear, setIsNear] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runX, setRunX] = useState(0);
  const [hopY, setHopY] = useState(0);
  const [speechText, setSpeechText] = useState<string | null>(null);
  const [speechSide, setSpeechSide] = useState<1 | -1>(1);
  const [notes, setNotes] = useState<Array<{id: number; text: string; x: number; y: number; drift: number}>>([]);

  const spawnFloatingNote = useCallback((phrases: string[], sideHint?: 1 | -1, force = false) => {
    if (!ref.current) {
      return;
    }

    const now = Date.now();
    if (!force && now - lastNoteAtRef.current < 950) {
      return;
    }
    lastNoteAtRef.current = now;

    const rect = ref.current.getBoundingClientRect();
    const id = Date.now() + Math.random();
    const side = sideHint ?? (Math.random() > 0.5 ? 1 : -1);
    const offsetX = (rect.width * 0.48 + 8) * side;
    const headY = Math.max(rect.top + rect.height * 0.34, 88);

    const newNote = {
      id,
      text: phrases[Math.floor(Math.random() * phrases.length)],
      x: rect.left + rect.width / 2 + offsetX,
      y: headY,
      drift: side > 0 ? 4 : -4,
    };

    setNotes((prev) => [...prev, newNote]);
    setSpeechText(newNote.text);
    setSpeechSide(side);
    if (speechTimeoutRef.current !== null) {
      window.clearTimeout(speechTimeoutRef.current);
    }
    speechTimeoutRef.current = window.setTimeout(() => {
      setSpeechText(null);
      speechTimeoutRef.current = null;
    }, 3400);

    const noteTimeout = window.setTimeout(() => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      noteTimeoutsRef.current = noteTimeoutsRef.current.filter((timeout) => timeout !== noteTimeout);
    }, 3800);
    noteTimeoutsRef.current.push(noteTimeout);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      hasPointerMovedRef.current = true;
      const now = performance.now();
      const dt = Math.max(0.001, (now - lastMoveTimeRef.current) / 1000);
      const vx = (e.clientX - lastMousePosRef.current.x) / dt;
      const vy = (e.clientY - lastMousePosRef.current.y) / dt;
      const smooth = 0.35;

      cursorVelocityRef.current = {
        x: cursorVelocityRef.current.x * (1 - smooth) + vx * smooth,
        y: cursorVelocityRef.current.y * (1 - smooth) + vy * smooth,
      };

      lastMousePosRef.current = {x: e.clientX, y: e.clientY};
      lastMoveTimeRef.current = now;
      targetPos.current = {x: e.clientX, y: e.clientY};
    };

    const animateEyes = () => {
      if (!ref.current) {
        return;
      }

      const ease = 0.15;
      currentPos.current.x += (targetPos.current.x - currentPos.current.x) * ease;
      currentPos.current.y += (targetPos.current.y - currentPos.current.y) * ease;

      const rect = ref.current.getBoundingClientRect();
      const faceCenterX = rect.left + rect.width / 2;
      const faceCenterY = rect.top + rect.height / 2;

      const dxToCursor = targetPos.current.x - faceCenterX;
      const dyToCursor = targetPos.current.y - faceCenterY;
      const distRaw = Math.hypot(dxToCursor, dyToCursor);
      const lookAheadSeconds = 0.11;
      const idleForMs = performance.now() - lastMoveTimeRef.current;
      if (idleForMs > 120) {
        cursorVelocityRef.current = {
          x: cursorVelocityRef.current.x * 0.86,
          y: cursorVelocityRef.current.y * 0.86,
        };
      }
      const projectedCursorX = targetPos.current.x + cursorVelocityRef.current.x * lookAheadSeconds;
      const projectedCursorY = targetPos.current.y + cursorVelocityRef.current.y * lookAheadSeconds;
      const dxProjected = projectedCursorX - faceCenterX;
      const dyProjected = projectedCursorY - faceCenterY;
      const distProjected = Math.hypot(dxProjected, dyProjected);
      const pointerIsActive = hasPointerMovedRef.current;

      const nextIsNear = pointerIsActive && Math.min(distRaw, distProjected) < 340;
      setIsNear((previous) => (previous === nextIsNear ? previous : nextIsNear));

      const cursorSpeed = Math.hypot(cursorVelocityRef.current.x, cursorVelocityRef.current.y);
      const movedSinceLastDodge =
        !lastDodgeCursorPosRef.current ||
        Math.hypot(
          targetPos.current.x - lastDodgeCursorPosRef.current.x,
          targetPos.current.y - lastDodgeCursorPosRef.current.y,
        ) > 14;
      const shouldDodge =
        (distRaw < 230 || distProjected < 295) &&
        (cursorSpeed > 30 || movedSinceLastDodge);

      if (pointerIsActive && mode === 'idle' && shouldDodge && Date.now() > runCooldownRef.current) {
        runCooldownRef.current = Date.now() + 130;
        lastDodgeCursorPosRef.current = {x: targetPos.current.x, y: targetPos.current.y};
        setIsRunning(true);
        setRunX((prev) => {
          const xVelocity = cursorVelocityRef.current.x;
          const directionFromVelocity = Math.abs(xVelocity) > 120 ? (xVelocity >= 0 ? -1 : 1) : 0;
          const direction = directionFromVelocity !== 0 ? directionFromVelocity : dxProjected >= 0 ? -1 : 1;
          const panicBoost = distProjected < 205 ? 16 : 0;
          const attemptedNext = prev + direction * (62 + panicBoost);
          const clamped = Math.max(-130, Math.min(130, attemptedNext));

          if (attemptedNext !== clamped) {
            const bounce = prev - direction * (74 + panicBoost / 2);
            const bounced = Math.max(-130, Math.min(130, bounce));

            setHopY(-11);
            if (hopResetRef.current !== null) {
              window.clearTimeout(hopResetRef.current);
            }
            hopResetRef.current = window.setTimeout(() => {
              setHopY(0);
              hopResetRef.current = null;
            }, 95);

            return bounced;
          }

          return clamped;
        });

        const runPhrases = ["Don't touch me!", 'Touch me if you can!', 'Catch me if you can!', 'Too close!', 'Nope, nope!'];
        const side = dxProjected >= 0 ? -1 : 1;
        spawnFloatingNote(runPhrases, side as 1 | -1);

        if (runningEndRef.current !== null) {
          window.clearTimeout(runningEndRef.current);
        }
        runningEndRef.current = window.setTimeout(() => {
          setIsRunning(false);
        }, 920);
      }

      const maxOffset = 6;

      const calculateEyeOffset = (eyeOffsetXPercent: number, eyeOffsetYPercent: number) => {
        const eyeCenterX = rect.left + rect.width * (eyeOffsetXPercent / 100);
        const eyeCenterY = rect.top + rect.height * (eyeOffsetYPercent / 100);

        const dx = currentPos.current.x - eyeCenterX;
        const dy = currentPos.current.y - eyeCenterY;
        const angle = Math.atan2(dy, dx);
        const dist = Math.min(maxOffset, Math.hypot(dx, dy) / 15);

        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
        };
      };

      const leftEyeOffset = calculateEyeOffset(35, 40);
      const rightEyeOffset = calculateEyeOffset(65, 40);
      if (leftEyeRef.current) {
        leftEyeRef.current.style.transform = `translate(${leftEyeOffset.x}px, ${leftEyeOffset.y}px)`;
      }
      if (rightEyeRef.current) {
        rightEyeRef.current.style.transform = `translate(${rightEyeOffset.x}px, ${rightEyeOffset.y}px)`;
      }

      requestRef.current = window.requestAnimationFrame(animateEyes);
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    window.addEventListener('mousemove', handleMouseMove);
    requestRef.current = window.requestAnimationFrame(animateEyes);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.cancelAnimationFrame(requestRef.current);
      if (runningEndRef.current !== null) {
        window.clearTimeout(runningEndRef.current);
      }
      if (hopResetRef.current !== null) {
        window.clearTimeout(hopResetRef.current);
      }
      if (returnResetRef.current !== null) {
        window.clearTimeout(returnResetRef.current);
      }
      if (speechTimeoutRef.current !== null) {
        window.clearTimeout(speechTimeoutRef.current);
      }
      noteTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
      noteTimeoutsRef.current = [];
    };
  }, [mode, spawnFloatingNote]);

  useEffect(() => {
    const handleThemeChanging = () => {
      if (mode !== 'idle') {
        return;
      }
      spawnFloatingNote(['Theme changing...'], undefined, true);
    };

    window.addEventListener('mascot-theme-changing', handleThemeChanging);
    return () => {
      window.removeEventListener('mascot-theme-changing', handleThemeChanging);
    };
  }, [mode, spawnFloatingNote]);

  useEffect(() => {
    const blinkInterval = window.setInterval(() => {
      setIsBlinking(true);
      blinkTimeoutRef.current = window.setTimeout(() => {
        setIsBlinking(false);
        blinkTimeoutRef.current = null;
      }, 200);
    }, 4000);

    return () => {
      window.clearInterval(blinkInterval);
      if (blinkTimeoutRef.current !== null) {
        window.clearTimeout(blinkTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let interval: number | undefined;

    if (mode === 'idle' && (isNear || isRunning)) {
      const phrases = isRunning
        ? ["Don't touch me!", 'Touch me if you can!', 'Catch me if you can!', 'Nooo!', 'Too close!']
        : ['♪ Oola!', '♫ Oolaala!', '♬ Dhinchak!', '♪', '♥', '⚡', 'Yay!'];

      const spawnNote = () => spawnFloatingNote(phrases);

      spawnNote();
      interval = window.setInterval(spawnNote, isRunning ? 1700 : 2400);
    }

    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [mode, isNear, isRunning, spawnFloatingNote]);

  useEffect(() => {
    if (mode !== 'idle') {
      return;
    }

    if (returnResetRef.current !== null) {
      window.clearTimeout(returnResetRef.current);
      returnResetRef.current = null;
    }

    if (!isNear && !isRunning) {
      returnResetRef.current = window.setTimeout(() => {
        setRunX(0);
        setHopY(0);
        returnResetRef.current = null;
      }, 180);
    }

    return () => {
      if (returnResetRef.current !== null) {
        window.clearTimeout(returnResetRef.current);
        returnResetRef.current = null;
      }
    };
  }, [mode, isNear, isRunning]);

  const isDancing = mode === 'idle' && isNear && !isRunning;
  const isComparing = mode === 'comparing';
  const isReading = mode === 'reading';

  const bodyAnim = isDancing
    ? {
        y: [0, -6, 0],
        rotate: [0, -3, 3, 0],
        scaleY: [1, 0.97, 1.03, 1],
        transition: {repeat: Infinity, duration: 0.4, ease: 'easeInOut' as const},
      }
    : {
        y: [0, 2, 0],
        rotate: 0,
        scaleY: 1,
        transition: {repeat: Infinity, duration: 3, ease: 'easeInOut' as const},
      };

  const armLeftAnim = isDancing
    ? {
        d: ['M 15 65 Q -5 45 5 25', 'M 15 65 Q -5 55 5 45', 'M 15 65 Q -5 45 5 25'],
        transition: {repeat: Infinity, duration: 0.4, ease: 'easeInOut' as const},
      }
    : {
        d: 'M 15 65 Q 5 80 10 95',
        transition: {duration: 0.5},
      };

  const armRightAnim = isDancing
    ? {
        d: ['M 85 65 Q 105 45 95 25', 'M 85 65 Q 105 55 95 45', 'M 85 65 Q 105 45 95 25'],
        transition: {repeat: Infinity, duration: 0.4, ease: 'easeInOut' as const},
      }
    : {
        d: 'M 85 65 Q 95 80 90 95',
        transition: {duration: 0.5},
      };

  if (isReading) {
    armRightAnim.d = 'M 85 65 Q 100 85 85 95';
  }
  if (isComparing) {
    armRightAnim.d = 'M 85 65 Q 110 65 110 50';
  }

  const leftHandAnim = isDancing
    ? {
        cx: [5, 5, 5],
        cy: [25, 45, 25],
        transition: {repeat: Infinity, duration: 0.4, ease: 'easeInOut' as const},
      }
    : {cx: 10, cy: 95};

  const rightHandAnim = isDancing
    ? {
        cx: [95, 95, 95],
        cy: [25, 45, 25],
        transition: {repeat: Infinity, duration: 0.4, ease: 'easeInOut' as const},
      }
    : {cx: 90, cy: 95};

  const leftLegAnim = isRunning
    ? {
        d: ['M 35 90 L 31 120', 'M 35 90 L 39 120', 'M 35 90 L 31 120'],
        transition: {repeat: Infinity, duration: 0.2, ease: 'linear' as const},
      }
    : {
        d: 'M 35 90 L 35 120',
        transition: {duration: 0.2},
      };

  const rightLegAnim = isRunning
    ? {
        d: ['M 65 90 L 69 120', 'M 65 90 L 61 120', 'M 65 90 L 69 120'],
        transition: {repeat: Infinity, duration: 0.2, ease: 'linear' as const},
      }
    : {
        d: 'M 65 90 L 65 120',
        transition: {duration: 0.2},
      };

  const leftFootAnim = isRunning
    ? {
        cx: [31, 39, 31],
        cy: [121, 118, 121],
        transition: {repeat: Infinity, duration: 0.2, ease: 'linear' as const},
      }
    : {
        cx: 35,
        cy: 120,
        transition: {duration: 0.2},
      };

  const rightFootAnim = isRunning
    ? {
        cx: [69, 61, 69],
        cy: [118, 121, 118],
        transition: {repeat: Infinity, duration: 0.2, ease: 'linear' as const},
      }
    : {
        cx: 65,
        cy: 120,
        transition: {duration: 0.2},
      };

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {notes.map((note) => (
            <motion.div
              key={note.id}
              initial={{opacity: 0, scale: 0.5, y: note.y, x: note.x}}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.92, 1, 1],
                y: note.y - 8,
                x: note.x + note.drift,
              }}
              exit={{opacity: 0}}
              transition={{duration: 2.9, ease: 'easeOut'}}
              className="pointer-events-none fixed z-[99999] select-none whitespace-nowrap rounded-full px-2 py-0.5 font-black text-sm backdrop-blur-sm"
              style={{
                border: '1px solid color-mix(in srgb, var(--theme-highlight-color) 48%, rgba(255, 255, 255, 0.28))',
                background: 'color-mix(in srgb, var(--theme-highlight-color) 18%, rgba(8, 12, 22, 0.82))',
                color: 'color-mix(in srgb, var(--theme-highlight-color) 68%, #fff3cd)',
                textShadow: '0 1px 0 rgba(0, 0, 0, 0.68)',
                transition: 'background-color 3200ms ease, border-color 3200ms ease, color 3200ms ease',
              }}
            >
              {note.text}
            </motion.div>
          ))}
        </AnimatePresence>,
        document.body,
      )}

      <motion.div
        ref={ref}
        className={`relative ${className} group z-50 cursor-pointer select-none`}
        onClick={onOpenSummary}
        animate={{x: runX, y: hopY}}
        transition={{type: 'spring', stiffness: 250, damping: 20, mass: 0.8}}
      >
        <AnimatePresence>
          {speechText && (
            <motion.div
              key={speechText}
              initial={{opacity: 0, y: 8, scale: 0.94}}
              animate={{opacity: 1, y: 0, scale: 1}}
              exit={{opacity: 0, y: -8, scale: 0.96}}
              transition={{duration: 0.34, ease: 'easeOut'}}
              className={`pointer-events-none absolute top-[30%] z-[60] whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide backdrop-blur-sm ${
                speechSide > 0 ? 'left-full ml-1' : 'right-full mr-1'
              }`}
              style={{
                border: '1px solid color-mix(in srgb, var(--theme-highlight-color) 48%, rgba(255, 255, 255, 0.28))',
                background: 'color-mix(in srgb, var(--theme-highlight-color) 18%, rgba(8, 12, 22, 0.84))',
                color: 'color-mix(in srgb, var(--theme-highlight-color) 68%, #fff3cd)',
                transition: 'background-color 3200ms ease, border-color 3200ms ease, color 3200ms ease',
              }}
            >
              {speechText}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div animate={bodyAnim} className="h-full w-full">
          <svg viewBox="0 0 100 130" className="h-full w-full overflow-visible drop-shadow-2xl">
            <motion.g initial={false}>
              <motion.path
                animate={leftLegAnim}
                strokeWidth="8"
                strokeLinecap="round"
                className="stroke-slate-900 dark:stroke-slate-200"
              />
              <motion.path
                animate={rightLegAnim}
                strokeWidth="8"
                strokeLinecap="round"
                className="stroke-slate-900 dark:stroke-slate-200"
              />
              <motion.circle r="7" animate={leftFootAnim} className="fill-slate-900 dark:fill-slate-200" />
              <motion.circle r="7" animate={rightFootAnim} className="fill-slate-900 dark:fill-slate-200" />
            </motion.g>

            <motion.path animate={armLeftAnim} strokeWidth="9" fill="none" strokeLinecap="round" className="stroke-yellow-400" />
            <motion.circle cx={10} cy={95} r="7" animate={leftHandAnim} className="fill-slate-900 dark:fill-slate-200" />

            <motion.path animate={armRightAnim} strokeWidth="9" fill="none" strokeLinecap="round" className="stroke-yellow-400" />
            {!isComparing && !isReading && (
              <motion.circle cx={90} cy={95} r="7" animate={rightHandAnim} className="fill-slate-900 dark:fill-slate-200" />
            )}

            <path d="M 15 50 Q 15 10 50 10 Q 85 10 85 50 Q 85 100 50 100 Q 15 100 15 50" className="fill-yellow-400" />

            <path d="M 15 70 Q 15 100 50 100 Q 85 100 85 70 L 85 65 L 15 65 Z" className="fill-blue-600" />
            <rect x="25" y="65" width="10" height="25" className="fill-blue-600" />
            <rect x="65" y="65" width="10" height="25" className="fill-blue-600" />
            <path d="M 15 60 L 85 60" strokeWidth="6" strokeLinecap="round" className="stroke-blue-600" />
            <circle cx="28" cy="60" r="2" className="fill-yellow-400" />
            <circle cx="72" cy="60" r="2" className="fill-yellow-400" />

            <path d="M 42 75 L 58 75 L 50 88 Z" className="fill-blue-900 opacity-50" />

            <rect x="16" y="32" width="68" height="10" className="fill-gray-800" rx="4" />

            <motion.path
              stroke="#3A2A16"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              animate={isRunning ? {d: 'M 24 29 Q 35 21 46 29'} : {d: 'M 26 24 Q 35 20 44 24'}}
              transition={{duration: 0.2}}
            />
            <motion.path
              stroke="#3A2A16"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              animate={isRunning ? {d: 'M 54 29 Q 65 21 76 29'} : {d: 'M 56 24 Q 65 20 74 24'}}
              transition={{duration: 0.2}}
            />

            <g>
              <circle cx="35" cy="40" r="14" className="fill-gray-400 stroke-gray-600" strokeWidth="3" />
              <circle cx="65" cy="40" r="14" className="fill-gray-400 stroke-gray-600" strokeWidth="3" />
              <circle cx="35" cy="40" r="11" fill="white" />
              <circle cx="65" cy="40" r="11" fill="white" />
            </g>

            <g>
              <g ref={leftEyeRef}>
                <circle cx="35" cy="40" r="4.5" fill="#000" />
                <circle cx="37" cy="38" r="1.5" fill="white" opacity="0.9" />
              </g>
              <g ref={rightEyeRef}>
                <circle cx="65" cy="40" r="4.5" fill="#000" />
                <circle cx="67" cy="38" r="1.5" fill="white" opacity="0.9" />
              </g>
            </g>

            <motion.rect
              x="20"
              y="25"
              width="30"
              height="30"
              className="fill-yellow-400"
              initial={{height: 0}}
              animate={{height: isBlinking ? 28 : 0}}
              transition={{duration: 0.1}}
            />
            <motion.rect
              x="50"
              y="25"
              width="30"
              height="30"
              className="fill-yellow-400"
              initial={{height: 0}}
              animate={{height: isBlinking ? 28 : 0}}
              transition={{duration: 0.1}}
            />

            <motion.path
              stroke="#374151"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              animate={
                isRunning
                  ? {
                      d: 'M 40 76 Q 50 56 60 76',
                    }
                  : isDancing
                  ? {
                      d: ['M 40 70 Q 50 80 60 70', 'M 42 68 Q 50 55 58 68', 'M 45 72 Q 50 72 55 72'],
                    }
                  : {
                      d: 'M 42 75 Q 50 75 58 75',
                    }
              }
              transition={isDancing ? {repeat: Infinity, duration: 0.3} : {duration: 0.25}}
            />
          </svg>
        </motion.div>
      </motion.div>
    </>
  );
};
