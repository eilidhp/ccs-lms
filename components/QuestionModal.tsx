"use client";
import { useState } from "react";
import confetti from "canvas-confetti";

export default function QuestionModal({ 
  question, options, correctAnswer, onSuccess 
}: { 
  question: string, options: string[], correctAnswer: string, onSuccess: () => void 
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (selected === correctAnswer) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ["#9F3392", "#FFCB0D"] });
      setTimeout(onSuccess, 1500); // Wait for confetti before moving on!
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full border-t-8 border-brand-purple">
        <h2 className="text-2xl font-black text-brand-darkPurple mb-6 text-center leading-tight">
          Complete Module
        </h2>

        <p className="text-gray-500 font-bold mb-6 text-center text-sm">{question}</p>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-bold text-center animate-pulse">
            Please confirm to lock in progress.
          </div>
        )}

        <div className="space-y-3 mb-8">
          {options.map((opt: string) => (
            <button 
              key={opt} 
              onClick={() => { setSelected(opt); setError(false); }}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all font-bold ${
                selected === opt 
                  ? "border-brand-purple bg-brand-purple/10 text-brand-purple shadow-sm" 
                  : "border-gray-200 text-gray-600 hover:border-brand-purple hover:bg-gray-50"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <button 
          onClick={handleSubmit} 
          disabled={!selected}
          className="w-full bg-brand-darkPurple text-white font-bold py-4 rounded-xl disabled:opacity-50 hover:bg-brand-purple transition shadow-md text-lg"
        >
          Confirm & Continue &rarr;
        </button>
      </div>
    </div>
  );
}