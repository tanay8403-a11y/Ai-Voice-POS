/**
 * Step progress indicator for the registration wizard. Shows completed
 * steps as checked, current step highlighted, future steps dimmed.
 * Clicking a completed step jumps back to it (via goToStep, which only
 * allows backward navigation — enforced in useRegistration, not here).
 */

import { Check } from "lucide-react";

const STEP_LABELS = {
  owner: "Owner Details",
  business: "Business Details",
  billing: "Billing Details",
  review: "Review & Submit",
};

export default function ProgressStepper({ steps, stepIndex, onStepClick }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, idx) => {
        const isCompleted = idx < stepIndex;
        const isCurrent = idx === stepIndex;
        const clickable = isCompleted;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <button
                onClick={() => clickable && onStepClick(idx)}
                disabled={!clickable}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  isCompleted
                    ? "bg-emerald-500 text-white cursor-pointer"
                    : isCurrent
                    ? "bg-[#0B1E4A] text-white"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                {isCompleted ? <Check size={16} /> : idx + 1}
              </button>
              <span className={`text-xs mt-1.5 font-medium whitespace-nowrap ${isCurrent ? "text-[#0B1E4A]" : "text-slate-400"}`}>
                {STEP_LABELS[step] || step}
              </span>
            </div>

            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 ${isCompleted ? "bg-emerald-500" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}