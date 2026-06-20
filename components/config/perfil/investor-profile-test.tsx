"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  INVESTOR_QUESTIONS,
  PROFILE_RESULTS,
  calculateProfile,
  type InvestorProfileType,
} from "@/lib/investor-profile";
import { useSaveInvestorProfile } from "@/hooks/use-investor-profile";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface InvestorProfileTestProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvestorProfileTest({ open, onOpenChange }: InvestorProfileTestProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number | number[]>>({});
  const [showResult, setShowResult] = useState<boolean>(false);

  const saveProfile = useSaveInvestorProfile();

  const handleSelectOption = (questionId: string, score: number, isMultiSelect?: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId];
      if (isMultiSelect) {
        let nextArray: number[];
        if (Array.isArray(current)) {
          if (current.includes(score)) {
            nextArray = current.filter((val) => val !== score);
          } else {
            nextArray = [...current, score];
          }
        } else {
          nextArray = [score];
        }
        return {
          ...prev,
          [questionId]: nextArray,
        };
      } else {
        return {
          ...prev,
          [questionId]: score,
        };
      }
    });
  };

  const getQuestionScore = (questionId: string, value: number | number[] | undefined, isMultiSelect?: boolean): number => {
    if (value === undefined) return 0;
    if (isMultiSelect) {
      if (Array.isArray(value) && value.length > 0) {
        return Math.max(...value); // ALyC standard: maximum tier selected is user's knowledge/experience score
      }
      return 0;
    }
    return typeof value === "number" ? value : 0;
  };

  const calculateTotalScore = (currentAnswers: Record<string, number | number[]>) => {
    return INVESTOR_QUESTIONS.reduce((sum, q) => {
      const val = currentAnswers[q.id];
      return sum + getQuestionScore(q.id, val, q.isMultiSelect);
    }, 0);
  };

  const handleNext = () => {
    if (currentStep < INVESTOR_QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Calculate final score
      const totalScore = calculateTotalScore(answers);
      const result = calculateProfile(totalScore);
      
      saveProfile.mutate(
        { answers: answers as Record<string, number>, total_score: totalScore, result },
        {
          onSuccess: () => {
            setShowResult(true);
          },
        }
      );
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev + 1 - 1 - 1); // equivalent to currentStep - 1
    }
  };

  const handleClose = () => {
    // Reset test state and close modal
    onOpenChange(false);
    // Timeout to prevent UI glitching during close animation
    setTimeout(() => {
      setCurrentStep(0);
      setAnswers({});
      setShowResult(false);
    }, 300);
  };

  const currentQuestion = INVESTOR_QUESTIONS[currentStep];
  const isOptionSelected = currentQuestion
    ? currentQuestion.isMultiSelect
      ? Array.isArray(answers[currentQuestion.id]) && (answers[currentQuestion.id] as number[]).length > 0
      : answers[currentQuestion.id] !== undefined
    : false;

  const progressPercent = ((currentStep + (showResult ? 1 : 0)) / INVESTOR_QUESTIONS.length) * 100;

  // Calculate profile results
  const totalScore = calculateTotalScore(answers);
  const calculatedResultKey = calculateProfile(totalScore);
  const resultDetails = PROFILE_RESULTS[calculatedResultKey];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#1F2229] border border-white/[0.06] rounded-[24px] p-6 text-white overflow-hidden flex flex-col min-h-[480px] justify-between">
        <DialogTitle className="sr-only">Test de Perfil de Inversor</DialogTitle>
        <DialogDescription className="sr-only">Evaluación de perfil de riesgo al estilo ALyC de Argentina</DialogDescription>
        
        {/* Header: Progress Bar */}
        <div className="flex flex-col gap-3 w-full">
          <div className="flex justify-between items-center text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            <span>Test de Inversor</span>
            <span>
              {showResult
                ? "Resultado"
                : `Pregunta ${currentStep + 1} de ${INVESTOR_QUESTIONS.length}`}
            </span>
          </div>
          {/* Progress Bar Container */}
          <div className="h-1 w-full bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#d946ef] to-[#06b6d4]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
          </div>
        </div>

        {/* Body: Wizard Steps */}
        <div className="flex-1 flex flex-col justify-center my-6 min-h-[250px]">
          <AnimatePresence mode="wait">
            {!showResult ? (
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-bold text-white leading-snug">
                    {currentQuestion.question}
                  </h3>
                  {currentQuestion.isMultiSelect && (
                    <span className="text-[10px] uppercase font-bold text-fuchsia-400 tracking-wider">
                      Selección múltiple (podés elegir más de una opción)
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  {currentQuestion.options.map((option) => {
                    const isSelected = currentQuestion.isMultiSelect
                      ? Array.isArray(answers[currentQuestion.id]) && (answers[currentQuestion.id] as number[]).includes(option.value)
                      : answers[currentQuestion.id] === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelectOption(currentQuestion.id, option.value, currentQuestion.isMultiSelect)}
                        className={cn(
                          "flex items-center gap-4 rounded-xl p-4 text-left text-xs font-medium border transition-all duration-200",
                          isSelected
                            ? "bg-[#d946ef]/10 border-[#d946ef]/40 shadow-[0_0_20px_rgba(217,70,239,0.06)] text-white ring-1 ring-[#d946ef]/30"
                            : "bg-[#1A1D24] border-white/[0.06] hover:bg-white/[0.04] text-slate-300"
                        )}
                      >
                        {/* Checkbox or Radio Indicator */}
                        <div
                          className={cn(
                            "w-4 h-4 border flex items-center justify-center transition-all shrink-0",
                            currentQuestion.isMultiSelect ? "rounded" : "rounded-full",
                            isSelected
                              ? "border-[#d946ef] bg-[#d946ef]"
                              : "border-white/20 bg-transparent"
                          )}
                        >
                          {isSelected && (
                            currentQuestion.isMultiSelect ? (
                              <svg
                                className="w-2.5 h-2.5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={4}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-white animate-scaleIn" />
                            )
                          )}
                        </div>
                        <span className="flex-1 leading-normal">{option.text}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="result-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-center gap-4 py-4"
              >
                {/* Animated emoji reveal */}
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-4xl shadow-xl shadow-black/10"
                >
                  {resultDetails.emoji}
                </motion.div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Tu Perfil Resultante
                  </span>
                  <div
                    className={cn(
                      "px-4 py-1.5 rounded-full border text-sm font-extrabold uppercase tracking-wide inline-block mx-auto",
                      resultDetails.color
                    )}
                  >
                    {resultDetails.name}
                  </div>
                </div>

                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                  {resultDetails.description}
                </p>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1A1D24] border border-white/[0.04] rounded-lg mt-2 text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">
                  <Sparkles className="size-3" />
                  Smart Insights adaptados activados
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer: Navigation */}
        <div className="flex justify-between items-center gap-3 pt-4 border-t border-white/[0.06] w-full">
          {!showResult ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="h-10 rounded-xl border-white/[0.06] bg-transparent hover:bg-white/[0.04] text-slate-300 text-xs font-semibold px-4 flex items-center gap-1.5"
              >
                <ChevronLeft className="size-4" />
                Anterior
              </Button>

              <Button
                type="button"
                onClick={handleNext}
                disabled={!isOptionSelected || saveProfile.isPending}
                className="h-10 rounded-xl bg-gradient-to-r from-[#d946ef] to-[#06b6d4] hover:opacity-90 text-white font-semibold text-xs shadow-lg shadow-fuchsia-500/20 transition-all border-0 px-5 flex items-center gap-1.5"
              >
                {saveProfile.isPending ? (
                  "Procesando..."
                ) : currentStep === INVESTOR_QUESTIONS.length - 1 ? (
                  <>
                    Ver Resultado
                    <ChevronRight className="size-4" />
                  </>
                ) : (
                  <>
                    Siguiente
                    <ChevronRight className="size-4" />
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={handleClose}
              className="h-11 w-full rounded-xl bg-gradient-to-r from-[#d946ef] to-[#06b6d4] hover:opacity-90 text-white font-bold text-xs shadow-lg shadow-fuchsia-500/20 transition-all border-0 uppercase tracking-wider"
            >
              Guardar y Cerrar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
