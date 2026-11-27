import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { synthAudio } from './audio/synthAudio';
import { EraseProgressModal } from './components/EraseProgressModal';
import { GameHUD } from './components/GameHUD';
import { MultiplicationTableModal } from './components/MultiplicationTableModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ParentDashboard } from './components/ParentDashboard';
import { PauseModal, VictoryModal } from './components/PauseAndVictoryModals';
import { ScratchPaperModal } from './components/ScratchPaperModal';
import { TitleScreen } from './components/TitleScreen';
import { UpgradesModal } from './components/UpgradesModal';
import {
  generateProblem,
  getAffordableUpgradeIds,
  getEffectiveTier,
  getRoundClearBonus,
  getTodayDateKey,
  MILESTONE_DEFS,
  purchaseUpgrade,
  recordAnswerResult,
  ROUND_LENGTH,
  UPGRADE_DEFS,
} from './game/mathEngine';
import {
  clearProgressCookies,
  createInitialProgress,
  generateSampleWeekProgress,
  getTodaySolvedCount,
  loadProgress,
  saveProgress,
} from './game/storage';
import type {
  DifficultyLevel,
  GameScreenState,
  MathProblem,
  Operation,
  PlayerProgress,
  RoundSummary,
  UpgradeId,
  VisitorSpecies,
} from './game/types';
import { MeadowSceneController } from './three/MeadowScene';

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const [screenState, setScreenState] = useState<GameScreenState>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1' ? 'playing' : 'title';
  });

  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showParentDashboard, setShowParentDashboard] = useState(false);
  const [showMethods, setShowMethods] = useState(false);
  const [showMultTable, setShowMultTable] = useState(false);
  const [showEraseConfirm, setShowEraseConfirm] = useState(false);

  const [combo, setCombo] = useState(0);
  const [correctStreak, setCorrectStreak] = useState(() => progress.currentCorrectStreak ?? 0);
  const [shieldsRemaining, setShieldsRemaining] = useState(0);
  const [visitingAnimal, setVisitingAnimal] = useState<{
    species: VisitorSpecies;
    streak: number;
  } | null>(null);
  const [visitorScreenPos, setVisitorScreenPos] = useState<{ x: number; y: number } | null>(null);

  const [roundIndex, setRoundIndex] = useState(0);
  const [roundStats, setRoundStats] = useState({
    correctCount: 0,
    bestCombo: 0,
    starsEarned: 0,
    chestBonus: 0,
    totalMs: 0,
  });
  const [roundSummary, setRoundSummary] = useState<RoundSummary | null>(null);

  const [problem, setProblem] = useState<MathProblem>(() =>
    generateProblem(progress.selectedOps, progress.selectedDifficulty)
  );
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [hintText, setHintText] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{
    id: number;
    text: string;
    positive: boolean;
  } | null>(null);
  const [milestoneBanner, setMilestoneBanner] = useState<{
    text: string;
    isAchievement: boolean;
  } | null>(null);

  const questionStartRef = useRef<number>(Date.now());
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<MeadowSceneController | null>(null);
  const advanceTimerRef = useRef<number | null>(null);
  const milestoneTimerRef = useRef<number | null>(null);
  const lockInputRef = useRef<boolean>(false);
  const progressRef = useRef<PlayerProgress>(progress);
  progressRef.current = progress;
  const visitorCycleRef = useRef<number>(0);
  const prevAffordableRef = useRef<Set<UpgradeId>>(
    new Set(getAffordableUpgradeIds(progress))
  );
  const handleVisitorClickRef = useRef<(species?: VisitorSpecies) => void>(() => {});
  const skipNextSaveRef = useRef<boolean>(false);

  useEffect(() => {
    synthAudio.setMuted(progress.muted);
  }, [progress.muted]);

  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    saveProgress(progress);
  }, [progress]);

  useEffect(() => {
    document.body.dataset.state = screenState;
  }, [screenState]);

  const startNewRound = useCallback(
    (overrideProgress?: PlayerProgress) => {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
      lockInputRef.current = false;
      const p = overrideProgress ?? progressRef.current;
      setCorrectStreak(p.currentCorrectStreak ?? 0);
      setShieldsRemaining(p.upgrades.lanterns ?? 0);
      setVisitingAnimal(null);
      setVisitorScreenPos(null);
      sceneRef.current?.dismissVisitingAnimal();
      setRoundIndex(0);
      setRoundStats({
        correctCount: 0,
        bestCombo: 0,
        starsEarned: 0,
        chestBonus: 0,
        totalMs: 0,
      });
      setRoundSummary(null);
      setWrongAttempts(0);
      setHintText(null);
      setShowMethods(false);
      setShowMultTable(false);
      setShowUpgrades(false);
      setShowParentDashboard(false);
      setProblem(generateProblem(p.selectedOps, p.selectedDifficulty));
      questionStartRef.current = Date.now();
      setScreenState('playing');
      synthAudio.playClick();
    },
    []
  );

  // Core answer evaluation shared by choices, keypad, and Methods modal submit
  const submitAnswer = useCallback(
    (submittedValue: number, bypassModalCheck = false) => {
      if (
        screenState !== 'playing' ||
        showUpgrades ||
        showParentDashboard ||
        showMultTable ||
        (!bypassModalCheck && showMethods) ||
        lockInputRef.current
      ) {
        return;
      }

      sceneRef.current?.resetCameraViewIfFocused();
      const isCorrect = submittedValue === problem.answer;
      const elapsedMs = Date.now() - questionStartRef.current;

      const outcome = recordAnswerResult(
        progress,
        problem,
        isCorrect,
        elapsedMs,
        combo,
        shieldsRemaining
      );

      setProgress(outcome.nextProgress);
      setCombo(outcome.nextCombo);
      setShieldsRemaining(outcome.nextShields);

      if (outcome.newlyUnlockedMilestones.length > 0) {
        const unlockedDefs = outcome.newlyUnlockedMilestones
          .map((id) => MILESTONE_DEFS.find((m) => m.id === id))
          .filter((m): m is NonNullable<typeof m> => Boolean(m));
        const achievementDef = unlockedDefs.find((m) => m.category === 'achievement');
        const chosen = achievementDef ?? unlockedDefs[0];
        if (chosen) {
          if (milestoneTimerRef.current !== null) {
            window.clearTimeout(milestoneTimerRef.current);
          }
          const isAch = chosen.category === 'achievement';
          setMilestoneBanner({
            text: isAch
              ? `Achievement Badge Unlocked: ${chosen.title}!`
              : `Milestone Unlocked: ${chosen.title}!`,
            isAchievement: isAch,
          });
          if (isAch) {
            synthAudio.playComboMilestone();
          }
          milestoneTimerRef.current = window.setTimeout(() => {
            setMilestoneBanner(null);
            milestoneTimerRef.current = null;
          }, 4000);
        }
      }

      if (isCorrect) {
        lockInputRef.current = true;
        setShowMethods(false);
        setWrongAttempts(0);
        setHintText(null);
        const nextStreak = outcome.nextProgress.currentCorrectStreak;
        setCorrectStreak(nextStreak);

        const toastMsg =
          outcome.chestClaimedBonus > 0
            ? `+${outcome.starsGained} ★ + ${outcome.chestClaimedBonus} ★ Chest!`
            : `+${outcome.starsGained} ★`;
        setFeedbackToast({ id: Date.now(), text: toastMsg, positive: true });

        sceneRef.current?.triggerCorrectFeedback();
        if (outcome.nextCombo > 0 && outcome.nextCombo % 5 === 0) {
          synthAudio.playComboMilestone();
        } else {
          synthAudio.playCorrect(outcome.nextCombo);
        }

        // Trigger a visiting animal periodically when child gets consecutive right answers (>= 2)
        if (nextStreak >= 2 && nextStreak % 2 === 0 && roundIndex + 1 < ROUND_LENGTH) {
          const species: VisitorSpecies =
            visitorCycleRef.current % 2 === 0 ? 'rabbit' : 'squirrel';
          visitorCycleRef.current += 1;
          setVisitingAnimal({ species, streak: nextStreak });
          sceneRef.current?.spawnVisitingAnimal(species);
        } else if (visitingAnimal) {
          setVisitingAnimal((prev) => (prev ? { ...prev, streak: nextStreak } : null));
        }

        const nextRoundIdx = roundIndex + 1;
        const nextRoundStats = {
          correctCount: roundStats.correctCount + 1,
          bestCombo: Math.max(roundStats.bestCombo, outcome.nextCombo),
          starsEarned:
            roundStats.starsEarned + outcome.starsGained + outcome.chestClaimedBonus,
          chestBonus: roundStats.chestBonus + outcome.chestClaimedBonus,
          totalMs: roundStats.totalMs + elapsedMs,
        };
        setRoundStats(nextRoundStats);

        advanceTimerRef.current = window.setTimeout(() => {
          lockInputRef.current = false;
          if (nextRoundIdx >= ROUND_LENGTH) {
            const cottageBonus = getRoundClearBonus(
              outcome.nextProgress.upgrades.cottage ?? 0
            );
            if (cottageBonus > 0) {
              const todayKey = getTodayDateKey();
              setProgress((prev) => {
                const hist = prev.dailyHistory.map((d) =>
                  d.date === todayKey
                    ? { ...d, starsEarned: d.starsEarned + cottageBonus }
                    : d
                );
                return {
                  ...prev,
                  stars: prev.stars + cottageBonus,
                  totalStarsEarned: prev.totalStarsEarned + cottageBonus,
                  dailyHistory: hist,
                };
              });
            }
            setVisitingAnimal(null);
            setVisitorScreenPos(null);
            sceneRef.current?.dismissVisitingAnimal();
            setRoundSummary({
              questionsAnswered: ROUND_LENGTH,
              correctCount: nextRoundStats.correctCount,
              bestCombo: nextRoundStats.bestCombo,
              starsEarned: nextRoundStats.starsEarned + cottageBonus,
              chestBonus: nextRoundStats.chestBonus,
              cottageBonus,
              averageMs: Math.round(nextRoundStats.totalMs / ROUND_LENGTH),
            });
            setScreenState('gameover');
            sceneRef.current?.triggerRoundCompleteConfetti();
            synthAudio.playRoundComplete();
          } else {
            setRoundIndex(nextRoundIdx);
            setWrongAttempts(0);
            const nextTier = getEffectiveTier(
              outcome.nextProgress.selectedDifficulty,
              outcome.nextProgress.adaptiveDifficulty,
              outcome.nextCombo
            );
            setProblem(generateProblem(outcome.nextProgress.selectedOps, nextTier));
            questionStartRef.current = Date.now();
          }
        }, 520);
      } else {
        const nextWrong = wrongAttempts + 1;
        setWrongAttempts(nextWrong);
        const hadStreak = correctStreak > 0;
        setCorrectStreak(0);
        setVisitingAnimal(null);
        setVisitorScreenPos(null);
        sceneRef.current?.dismissVisitingAnimal();
        sceneRef.current?.triggerWrongFeedback();
        setHintText(
          nextWrong >= 2
            ? `${problem.hint} Try Methods (Vertical, Base-10 Blocks & more) for step-by-step help!`
            : problem.hint
        );
        if (hadStreak) {
          synthAudio.playStreakReset();
          setFeedbackToast({
            id: Date.now(),
            text: 'Streak Reset! Check the tip',
            positive: false,
          });
        } else {
          synthAudio.playWrong();
          setFeedbackToast({
            id: Date.now(),
            text: 'Almost! Check the tip',
            positive: false,
          });
        }
      }
    },
    [
      combo,
      correctStreak,
      problem,
      progress,
      roundIndex,
      roundStats,
      screenState,
      shieldsRemaining,
      showMethods,
      showMultTable,
      showParentDashboard,
      showUpgrades,
      visitingAnimal,
      wrongAttempts,
    ]
  );

  // Clicking the visiting animal (either on 3D canvas or its speech bubble) awards +1 Bonus Star
  const handleVisitorClick = useCallback(
    (speciesOverride?: VisitorSpecies) => {
      if (!visitingAnimal && !speciesOverride) return;
      const species = speciesOverride ?? visitingAnimal?.species ?? 'rabbit';
      const todayKey = getTodayDateKey();
      setProgress((prev) => {
        const hasToday = prev.dailyHistory.some((d) => d.date === todayKey);
        const dailyHistory = hasToday
          ? prev.dailyHistory.map((d) =>
              d.date === todayKey ? { ...d, starsEarned: d.starsEarned + 1 } : d
            )
          : [...prev.dailyHistory, { date: todayKey, solved: 0, correct: 0, starsEarned: 1 }];
        return {
          ...prev,
          stars: prev.stars + 1,
          totalStarsEarned: prev.totalStarsEarned + 1,
          dailyHistory,
        };
      });
      setRoundStats((prev) => ({ ...prev, starsEarned: prev.starsEarned + 1 }));
      synthAudio.playCritterSound(species);
      setFeedbackToast({
        id: Date.now(),
        text: '+1 ★ Smart Streak Gift!',
        positive: true,
      });
      setVisitingAnimal(null);
      setVisitorScreenPos(null);
      sceneRef.current?.dismissVisitingAnimal();
    },
    [visitingAnimal]
  );
  handleVisitorClickRef.current = handleVisitorClick;

  // Auto-popup the Upgrades modal whenever something NEW becomes affordable during active play
  useEffect(() => {
    const currentAffordable = getAffordableUpgradeIds(progress);
    const prevSet = prevAffordableRef.current;
    const newlyAffordable = currentAffordable.some((id) => !prevSet.has(id));

    if (
      screenState === 'playing' &&
      !lockInputRef.current &&
      newlyAffordable &&
      !showUpgrades &&
      !showParentDashboard &&
      !showMultTable &&
      !showMethods
    ) {
      setShowUpgrades(true);
    }

    if (!lockInputRef.current || screenState !== 'playing') {
      prevAffordableRef.current = new Set(currentAffordable);
    }
  }, [
    progress,
    roundIndex,
    screenState,
    showMethods,
    showMultTable,
    showParentDashboard,
    showUpgrades,
  ]);

  const affordableUpgradeIds = useMemo(
    () => getAffordableUpgradeIds(progress),
    [progress]
  );

  // Mount Three.js WebGL scene ONCE
  useEffect(() => {
    const el = canvasMountRef.current;
    if (!el) return;
    const ctrl = new MeadowSceneController(
      el,
      {
        screenState,
        upgrades: progress.upgrades,
        karaOutfits: progress.karaEquippedOutfits,
        kaitlynOutfits: progress.kaitlynEquippedOutfits,
      },
      () => synthAudio.playBirdChirp(),
      (species) => handleVisitorClickRef.current(species),
      (pos) => setVisitorScreenPos(pos)
    );
    sceneRef.current = ctrl;

    return () => {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current);
      }
      if (milestoneTimerRef.current !== null) {
        window.clearTimeout(milestoneTimerRef.current);
      }
      ctrl.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push discrete state updates into Three.js without remounting
  useEffect(() => {
    sceneRef.current?.syncState({
      screenState,
      upgrades: progress.upgrades,
      karaOutfits: progress.karaEquippedOutfits,
      kaitlynOutfits: progress.kaitlynEquippedOutfits,
    });
  }, [
    screenState,
    progress.upgrades,
    progress.karaEquippedOutfits,
    progress.kaitlynEquippedOutfits,
  ]);

  // Unified keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const target = e.target as HTMLElement | null;
      const inInput =
        target !== null && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if (!inInput && (e.key === 'm' || e.key === 'M')) {
        setProgress((prev) => ({ ...prev, muted: !prev.muted }));
        return;
      }

      if (showEraseConfirm) {
        if (e.key === 'Escape') {
          setShowEraseConfirm(false);
        }
        return;
      }

      if (showUpgrades || showParentDashboard || showMethods || showMultTable) {
        if (e.key === 'Escape') {
          setShowUpgrades(false);
          setShowParentDashboard(false);
          setShowMethods(false);
          setShowMultTable(false);
        } else if (showMethods && !inInput && (e.key === 's' || e.key === 'S')) {
          setShowMethods(false);
        } else if (showMultTable && !inInput && (e.key === 't' || e.key === 'T')) {
          setShowMultTable(false);
        }
        return;
      }

      if (screenState === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startNewRound();
        } else if (e.key === 'r' || e.key === 'R') {
          setShowParentDashboard(true);
        }
        return;
      }

      if (screenState === 'playing') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          setScreenState('paused');
        } else if (e.key === 's' || e.key === 'S') {
          setShowMethods(true);
        } else if (e.key === 't' || e.key === 'T') {
          setShowMultTable(true);
        } else if (e.key === 'u' || e.key === 'U') {
          setShowUpgrades(true);
        } else if (e.key === 'r' || e.key === 'R') {
          setShowParentDashboard(true);
        } else if (
          wrongAttempts < 2 &&
          progress.inputMode === 'choices' &&
          ['1', '2', '3', '4'].includes(e.key)
        ) {
          const idx = Number.parseInt(e.key, 10) - 1;
          const val = problem.choices[idx];
          if (val !== undefined) submitAnswer(val);
        }
        return;
      }

      if (screenState === 'paused') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          setScreenState('playing');
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    problem.choices,
    progress.inputMode,
    screenState,
    showEraseConfirm,
    showMethods,
    showMultTable,
    showParentDashboard,
    showUpgrades,
    startNewRound,
    submitAnswer,
    wrongAttempts,
  ]);

  const canAffordAnyUpgrade = affordableUpgradeIds.length > 0;

  const todayCorrect = useMemo(() => getTodaySolvedCount(progress), [progress]);

  const handleToggleOp = (op: Operation) => {
    synthAudio.playClick();
    setProgress((prev) => {
      const exists = prev.selectedOps.includes(op);
      if (exists && prev.selectedOps.length === 1) return prev;
      const nextOps = exists
        ? prev.selectedOps.filter((o) => o !== op)
        : [...prev.selectedOps, op];
      return { ...prev, selectedOps: nextOps };
    });
  };

  const handleSelectAllOps = () => {
    synthAudio.playClick();
    setProgress((prev) => ({
      ...prev,
      selectedOps: ['add', 'sub', 'mul', 'div'],
    }));
  };

  const handleBuyUpgrade = (id: UpgradeId) => {
    const { next, purchased } = purchaseUpgrade(progress, id);
    if (!purchased) return;
    prevAffordableRef.current = new Set(getAffordableUpgradeIds(next));
    setProgress(next);
    if (id === 'lanterns') {
      setShieldsRemaining((s) => s + 1);
    }
    const def = UPGRADE_DEFS.find((u) => u.id === id);
    setShowUpgrades(false);
    setFeedbackToast({
      id: Date.now(),
      text: `★ ${def?.name ?? 'Upgrade'} Lv ${next.upgrades[id]}!`,
      positive: true,
    });
    synthAudio.playUpgrade();
    sceneRef.current?.triggerUpgradeBurst(id);
  };

  const handleResetProgress = () => {
    skipNextSaveRef.current = true;
    clearProgressCookies();
    const fresh = createInitialProgress();
    prevAffordableRef.current = new Set();
    setProgress(fresh);
    setCombo(0);
    setCorrectStreak(0);
    setShieldsRemaining(0);
    setVisitingAnimal(null);
    setVisitorScreenPos(null);
    sceneRef.current?.dismissVisitingAnimal();
    synthAudio.playClick();
  };

  const handleRequestEraseProgress = () => {
    synthAudio.playClick();
    setShowEraseConfirm(true);
  };

  const choicesDisabledForQuestion = wrongAttempts >= 2;
  const effectiveInputMode: 'choices' | 'keypad' = choicesDisabledForQuestion
    ? 'keypad'
    : progress.inputMode;
  const modalOpen =
    showUpgrades ||
    showParentDashboard ||
    showMethods ||
    showMultTable ||
    showEraseConfirm;

  return (
    <main className="relative h-full w-full overflow-hidden">
      {/* Isolated WebGL Canvas Mount */}
      <div
        ref={canvasMountRef}
        data-testid="meadow-canvas-container"
        className="absolute inset-0 h-full w-full"
      />

      {/* Milestone / Achievement Badge Unlocked Floating Banner */}
      {milestoneBanner && (
        <div
          role="status"
          data-testid={
            milestoneBanner.isAchievement ? 'achievement-notification' : 'milestone-notification'
          }
          className={`pointer-events-none fixed right-4 z-50 rounded-2xl border-2 px-4 py-2.5 font-display text-sm font-bold shadow-lg ${
            modalOpen ? 'bottom-5' : 'top-20'
          } ${
            milestoneBanner.isAchievement
              ? 'border-[#b45309] bg-[#fef3c7] text-[#451a03] shadow-[0_4px_0_#d97706]'
              : 'border-[#15803d] bg-[#dcfce7] text-[#14532d]'
          }`}
        >
          {milestoneBanner.isAchievement ? '🏅 ' : '★ '}
          {milestoneBanner.text}
        </div>
      )}

      {/* Game Shell State Views */}
      {screenState === 'title' && (
        <TitleScreen
          selectedOps={progress.selectedOps}
          selectedDifficulty={progress.selectedDifficulty}
          adaptiveDifficulty={progress.adaptiveDifficulty}
          selectedInputMode={progress.inputMode}
          stars={progress.stars}
          dailyStreak={progress.currentDailyStreak}
          muted={progress.muted}
          onToggleOp={handleToggleOp}
          onSelectAllOps={handleSelectAllOps}
          onSelectDifficulty={(tier: DifficultyLevel) => {
            synthAudio.playClick();
            setProgress((prev) => ({
              ...prev,
              selectedDifficulty: tier,
              adaptiveDifficulty: false,
              adaptiveManual: false,
            }));
          }}
          onToggleAdaptive={() => {
            synthAudio.playClick();
            setProgress((prev) => {
              const nextVal = !prev.adaptiveDifficulty;
              return {
                ...prev,
                adaptiveDifficulty: nextVal,
                adaptiveManual: nextVal,
              };
            });
          }}
          onSelectInputMode={(mode) => {
            synthAudio.playClick();
            setProgress((prev) => ({ ...prev, inputMode: mode }));
          }}
          onStart={() => startNewRound()}
          onOpenParentDashboard={() => {
            synthAudio.playClick();
            setShowParentDashboard(true);
          }}
          onResetProgress={handleRequestEraseProgress}
          onToggleMute={() =>
            setProgress((prev) => ({ ...prev, muted: !prev.muted }))
          }
        />
      )}

      {screenState === 'playing' && (
        <GameHUD
          stars={progress.stars}
          correctStreak={correctStreak}
          todayCorrect={todayCorrect}
          dailyGoal={progress.dailyGoal}
          dailyStreak={progress.currentDailyStreak}
          roundIndex={roundIndex}
          problem={problem}
          inputMode={effectiveInputMode}
          choicesDisabled={choicesDisabledForQuestion}
          wrongAttempts={wrongAttempts}
          modalOpen={modalOpen}
          hintText={hintText}
          feedbackToast={feedbackToast}
          canAffordAnyUpgrade={canAffordAnyUpgrade}
          visitingAnimal={
            visitingAnimal
              ? {
                  species: visitingAnimal.species,
                  streak: visitingAnimal.streak,
                  screenPos: visitorScreenPos,
                }
              : null
          }
          muted={progress.muted}
          onSubmitChoice={(idx) => {
            if (choicesDisabledForQuestion) return;
            const val = problem.choices[idx];
            if (val !== undefined) submitAnswer(val);
          }}
          onSubmitNumber={(val) => submitAnswer(val)}
          onToggleInputMode={() => {
            if (choicesDisabledForQuestion) return;
            setProgress((prev) => ({
              ...prev,
              inputMode: prev.inputMode === 'choices' ? 'keypad' : 'choices',
            }));
          }}
          onOpenMethods={() => {
            synthAudio.playClick();
            setShowMethods(true);
          }}
          onOpenMultiplicationTable={() => {
            synthAudio.playClick();
            setShowMultTable(true);
          }}
          onOpenUpgrades={() => {
            synthAudio.playClick();
            setShowUpgrades(true);
          }}
          onOpenParentDashboard={() => {
            synthAudio.playClick();
            setShowParentDashboard(true);
          }}
          onClickVisitor={() => handleVisitorClick()}
          onToggleMute={() =>
            setProgress((prev) => ({ ...prev, muted: !prev.muted }))
          }
          onPause={() => {
            synthAudio.playClick();
            setScreenState('paused');
          }}
          onRotateLeft={() => {
            synthAudio.playClick();
            sceneRef.current?.rotateCamera(-0.45);
          }}
          onRotateRight={() => {
            synthAudio.playClick();
            sceneRef.current?.rotateCamera(0.45);
          }}
          onZoomIn={() => {
            synthAudio.playClick();
            sceneRef.current?.zoomCamera(0.8);
          }}
          onZoomOut={() => {
            synthAudio.playClick();
            sceneRef.current?.zoomCamera(1.25);
          }}
          onResetCamera={() => {
            synthAudio.playClick();
            sceneRef.current?.resetCameraView();
          }}
        />
      )}

      {screenState === 'paused' && (
        <PauseModal
          onResume={() => {
            synthAudio.playClick();
            setScreenState('playing');
          }}
          onRestart={() => startNewRound()}
          onOpenParentDashboard={() => {
            synthAudio.playClick();
            setShowParentDashboard(true);
          }}
          onResetProgress={handleRequestEraseProgress}
          onReturnTitle={() => {
            synthAudio.playClick();
            setScreenState('title');
          }}
        />
      )}

      {screenState === 'gameover' && roundSummary && (
        <VictoryModal
          summary={roundSummary}
          onPlayNextRound={() => startNewRound()}
          onOpenUpgrades={() => {
            synthAudio.playClick();
            setShowUpgrades(true);
          }}
          onReturnTitle={() => {
            synthAudio.playClick();
            setScreenState('title');
          }}
        />
      )}

      {showMethods && (
        <ScratchPaperModal
          problem={problem}
          wrongAttempts={wrongAttempts}
          onSubmitAnswer={(val) => submitAnswer(val, true)}
          onClose={() => {
            synthAudio.playClick();
            setShowMethods(false);
          }}
        />
      )}

      {showMultTable && (
        <MultiplicationTableModal
          problem={problem}
          onClose={() => {
            synthAudio.playClick();
            setShowMultTable(false);
          }}
        />
      )}

      {showUpgrades && (
        <UpgradesModal
          progress={progress}
          onBuyUpgrade={handleBuyUpgrade}
          onClose={() => {
            synthAudio.playClick();
            setShowUpgrades(false);
          }}
        />
      )}

      {showParentDashboard && (
        <ParentDashboard
          progress={progress}
          onUpdateDailyGoal={(goal) =>
            setProgress((prev) => ({ ...prev, dailyGoal: goal }))
          }
          onLoadSampleWeek={() => {
            synthAudio.playUpgrade();
            setProgress((prev) => generateSampleWeekProgress(prev));
          }}
          onResetProgress={handleRequestEraseProgress}
          onClose={() => {
            synthAudio.playClick();
            setShowParentDashboard(false);
          }}
        />
      )}

      {showEraseConfirm && (
        <EraseProgressModal
          onConfirm={() => {
            handleResetProgress();
            setShowEraseConfirm(false);
          }}
          onCancel={() => {
            synthAudio.playClick();
            setShowEraseConfirm(false);
          }}
        />
      )}

      <OfflineIndicator />
    </main>
  );
}
