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
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState<boolean>(false);

  const saveProfile = useSaveInvestorProfile();

  const handleSelectOption = (questionId: string, score: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: score,
    }));
  };

  const handleNext = () => {
    if (currentStep < INVESTOR_QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Calculate final score
      const totalScore = Object.values(answers).reduce((sum, val) => sum + val, 0);
      const result = calculateProfile(totalScore);
      
      saveProfile.mutate(
        { answers, total_score: totalScore, result },
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
      setCurrentStep((prev) => prev - 1);
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
  const isOptionSelected = currentQuestion ? answers[currentQuestion.id] !== undefined : false;
  const progressPercent = ((currentStep + (showResult ? 1 : 0)) / INVESTOR_QUESTIONS.length) * 100;

  // Calculate profile results
  const totalScore = Object.values(answers).reduce((sum, val) => sum + val, 0);
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
                <h3 className="text-lg font-bold text-white leading-snug">
                  {currentQuestion.question}
                </h3>

                <div className="flex flex-col gap-2 mt-2">
                  {currentQuestion.options.map((option) => {
                    const isSelected = answers[currentQuestion.id] === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelectOption(currentQuestion.id, option.value)}
                        className={cn(
                          "flex items-center gap-4 rounded-xl p-4 text-left text-xs font-medium border transition-all duration-200",
                          isSelected
                            ? "bg-[#d946ef]/10 border-[#d946ef]/40 shadow-[0_0_20px_rgba(217,70,239,0.06)] text-white ring-1 ring-[#d946ef]/30"
                            : "bg-[#1A1D24] border-white/[0.06] hover:bg-white/[0.04] text-slate-300"
                        )}
                      >
                        {/* Radio Dot Indicator */}
                        <div
                          className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                            isSelected
                              ? "border-[#d946ef] bg-[#d946ef]"
                              : "border-white/20 bg-transparent"
                          )}
                        >
                          {isSelected && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-scaleIn" />
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
