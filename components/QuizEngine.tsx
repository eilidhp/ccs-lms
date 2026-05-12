"use client";
import { useState } from "react";
import confetti from "canvas-confetti";
import { supabase } from "@/lib/supabase";

export default function QuizEngine({ 
  onPass, questions, courseId, courseTitle, chapterTitle, userEmail 
}: { 
  onPass: () => void, questions?: any[], courseId: number, courseTitle: string, chapterTitle: string, userEmail: string 
}) {
  const activeQuestions = questions && questions.length > 0 ? questions : [
    { question: "No questions added yet.", qType: "mcq", options: ["Acknowledge"], answer: "Acknowledge" }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-grading only applies to Multiple Choice Questions (MCQs)
  const mcqQuestions = activeQuestions.filter((q: any) => !q.qType || q.qType === 'mcq');
  const passMark = Math.ceil(mcqQuestions.length * 0.8);

  const calculateScore = () => {
    let score = 0;
    activeQuestions.forEach((q: any, i: number) => {
      if ((!q.qType || q.qType === 'mcq') && responses[i] === q.answer) score += 1;
    });
    return score;
  };

  const currentScore = calculateScore();

  const handleNext = async () => {
    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsSubmitting(true);
      
      // Save EVERYTHING to the database!
      const answersToSave = activeQuestions.map((q: any, i: number) => ({
        question: q.question,
        type: q.qType || 'mcq',
        learner_answer: responses[i] || "No answer provided"
      }));

      await supabase.from('quiz_submissions').insert([{
        user_email: userEmail,
        course_id: courseId,
        course_title: courseTitle,
        chapter_title: chapterTitle,
        score_text: mcqQuestions.length > 0 ? `${currentScore} / ${mcqQuestions.length} MCQs correct` : "Open Text Evaluation",
        answers: answersToSave
      }]);

      setShowResults(true);
      setIsSubmitting(false);

      if (mcqQuestions.length === 0 || currentScore >= passMark) {
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 }, colors: ["#9F3392", "#FFCB0D"] });
      }
    }
  };

  const handleRetake = () => { setCurrentIndex(0); setResponses({}); setShowResults(false); };

  if (showResults) {
    const passed = mcqQuestions.length === 0 || currentScore >= passMark;
    return (
      <div className="bg-white p-8 sm:p-12 rounded-xl shadow-lg border-t-8 border-brand-purple text-center">
        <span className="text-7xl block mb-6">{passed ? "🏆" : "📚"}</span>
        <h3 className="text-3xl font-black text-brand-darkPurple mb-2">{passed ? "Evaluation Complete!" : "Keep Learning!"}</h3>
        {mcqQuestions.length > 0 && <p className="text-gray-500 font-bold mb-8 text-lg">You scored {currentScore} out of {mcqQuestions.length} on the graded questions.</p>}
        {mcqQuestions.length === 0 && <p className="text-gray-500 font-bold mb-8 text-lg">Your text responses have been submitted to your instructor for review.</p>}
        
        {passed ? (
          <div className="space-y-6">
            <div className="bg-brand-success/10 border-2 border-brand-success text-brand-success p-4 rounded-xl font-bold">Excellent work! Your submission has been securely saved.</div>
            <button onClick={onPass} className="w-full bg-brand-purple text-white font-black py-4 rounded-xl hover:bg-brand-darkPurple shadow-md text-lg">Continue to Next Module &rarr;</button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-red-50 border-2 border-red-200 text-red-600 p-4 rounded-xl font-bold">An 80% on multiple choice questions is required to pass. Please review and try again.</div>
            <button onClick={handleRetake} className="w-full bg-brand-yellow text-brand-darkPurple font-bold py-4 rounded-xl hover:bg-brand-lightYellow shadow-md text-lg">&#x21bb; Retake Assessment</button>
          </div>
        )}
      </div>
    );
  }

  const currentQ = activeQuestions[currentIndex];
  const qType = currentQ.qType || 'mcq';

  return (
    <div className="bg-white p-8 sm:p-12 rounded-xl shadow-lg border-t-8 border-brand-yellow">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="inline-block bg-brand-yellow text-brand-darkPurple text-xs font-bold px-3 py-1 rounded-full mb-2 uppercase tracking-wider">Evaluation</div>
          <h2 className="text-xl font-black text-brand-darkPurple">Knowledge Check</h2>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Question {currentIndex + 1} of {activeQuestions.length}</span>
          <div className="w-full sm:w-32 bg-gray-200 rounded-full h-2 mt-2 sm:ml-auto"><div className="bg-brand-purple h-2 rounded-full transition-all" style={{ width: `${((currentIndex + 1) / activeQuestions.length) * 100}%` }}></div></div>
        </div>
      </div>
      
      <h3 className="text-2xl font-bold text-brand-darkGrey mb-8 leading-tight">{currentQ.question}</h3>
      
      <div className="space-y-3 mb-8">
        {qType === 'mcq' && currentQ.options.map((opt: string, i: number) => opt && (
          <button key={i} onClick={() => setResponses({ ...responses, [currentIndex]: opt })} className={`w-full text-left p-5 rounded-xl border-2 transition-all ${responses[currentIndex] === opt ? "border-brand-purple bg-brand-purple/5 font-bold text-brand-purple shadow-sm transform scale-[1.01]" : "border-gray-200 hover:bg-gray-50 font-bold text-gray-600"}`}>{opt}</button>
        ))}
        {qType === 'short' && (
          <input type="text" placeholder="Type your answer here..." value={responses[currentIndex] || ""} onChange={(e) => setResponses({ ...responses, [currentIndex]: e.target.value })} className="w-full p-4 border-2 border-gray-200 rounded-xl outline-none focus:border-brand-purple font-bold text-gray-700" />
        )}
        {qType === 'long' && (
          <textarea placeholder="Type your detailed answer here..." value={responses[currentIndex] || ""} onChange={(e) => setResponses({ ...responses, [currentIndex]: e.target.value })} className="w-full p-4 border-2 border-gray-200 rounded-xl outline-none focus:border-brand-purple font-bold text-gray-700 min-h-[150px] resize-y" />
        )}
      </div>

      <button onClick={handleNext} disabled={!responses[currentIndex] || isSubmitting} className="w-full bg-brand-darkPurple text-white font-bold py-4 rounded-xl disabled:opacity-50 hover:bg-brand-purple shadow-md text-lg">
        {isSubmitting ? "Submitting..." : currentIndex === activeQuestions.length - 1 ? "Submit Evaluation" : "Next Question \u2192"}
      </button>
    </div>
  );
}