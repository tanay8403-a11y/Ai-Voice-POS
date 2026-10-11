/**
 * Shared Back/Next/Submit button row for each wizard step. Submit vs
 * Next is controlled by isLastStep; loading state disables both buttons
 * and shows a spinner label instead of a separate spinner component.
 */

export default function FormButtons({ isFirstStep, isLastStep, onBack, onNext, onSubmit, submitting }) {
  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
      <button
        type="button"
        onClick={onBack}
        disabled={isFirstStep || submitting}
        className="text-sm font-semibold text-slate-500 px-5 py-2.5 rounded-lg hover:bg-slate-100 disabled:opacity-0 disabled:pointer-events-none transition-colors"
      >
        ← Back
      </button>

      {isLastStep ? (
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="bg-emerald-600 text-white text-sm font-semibold px-8 py-2.5 rounded-lg disabled:opacity-50 hover:bg-emerald-700 transition-colors"
        >
          {submitting ? "Creating your store…" : "Complete Registration"}
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          disabled={submitting}
          className="bg-[#0B1E4A] text-white text-sm font-semibold px-8 py-2.5 rounded-lg disabled:opacity-50 hover:bg-[#132a63] transition-colors"
        >
          Next →
        </button>
      )}
    </div>
  );
}