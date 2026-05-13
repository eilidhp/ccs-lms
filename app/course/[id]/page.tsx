"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import QuestionModal from "@/components/QuestionModal";
import QuizEngine from "@/components/QuizEngine";

export default function CoursePlayer() {
  const params = useParams(); const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showQuestion, setShowQuestion] = useState(false);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);

  const [completedChapters, setCompletedChapters] = useState<number[]>([]);
  const [currentNote, setCurrentNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    (window as any).API = { LMSInitialize: () => "true", LMSGetValue: () => "", LMSSetValue: () => "true", LMSCommit: () => "true", LMSFinish: () => "true", LMSGetLastError: () => "0", LMSGetErrorString: () => "No Error", LMSGetDiagnostic: () => "No Error" };
    (window as any).API_1484_11 = (window as any).API;

    async function fetchData() {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user.email || ""; setUserEmail(email);
      if (!params?.id) return;

      const { data: c } = await supabase.from('courses').select('*').eq('id', params.id).single();
      if (c) setCourse(c);

      // GUARANTEED MATH FIX: Ensure it correctly selects existing progress!
      const { data: prog } = await supabase.from('course_progress').select('*').match({ user_email: email, course_id: params.id }).maybeSingle();
      if (prog) setCompletedChapters(prog.completed_chapters || []);

      setLoading(false);
    }
    fetchData();
  }, [params?.id]);

  useEffect(() => {
    async function loadNote() {
      if (!userEmail || !course) return;
      const { data } = await supabase.from('user_notes').select('content').match({ user_email: userEmail, course_id: course.id, chapter_index: activeChapterIndex }).maybeSingle();
      setCurrentNote(data ? data.content : "");
    }
    loadNote();
  }, [activeChapterIndex, userEmail, course]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-brand-purple font-bold text-xl bg-gray-50">Loading course...</div>;
  if (!course) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold text-xl bg-gray-50">Course not found.</div>;

  const currentChapter = course.chapters?.[activeChapterIndex] || { title: "Introduction", type: "video" };
  const isAdmin = userEmail.toLowerCase().endsWith("@changeconsultingscotland.co.uk");
  
  const highestCompleted = completedChapters.length > 0 ? Math.max(...completedChapters) : -1;
  const maxAllowedIndex = isAdmin ? 999 : highestCompleted + 1;
  const isCurrentlyCompleted = completedChapters.includes(activeChapterIndex);

  const handleSaveNote = async () => {
    setIsSavingNote(true);
    await supabase.from('user_notes').upsert({ user_email: userEmail, course_id: course.id, chapter_index: activeChapterIndex, course_title: course.title, chapter_title: currentChapter.title, content: currentNote }, { onConflict: 'user_email,course_id,chapter_index' });
    setTimeout(() => setIsSavingNote(false), 1000);
  };

  const handleNextModule = async () => {
    const newCompleted = Array.from(new Set([...completedChapters, activeChapterIndex]));
    setCompletedChapters(newCompleted);
    
    // GUARANTEED MATH FIX: Use a specific ID update if it exists so it doesn't fail silently!
    const { data: existing } = await supabase.from('course_progress').select('id').match({ user_email: userEmail, course_id: course.id }).maybeSingle();
    
    if (existing) {
      await supabase.from('course_progress').update({ completed_chapters: newCompleted, last_accessed: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('course_progress').insert({ user_email: userEmail, course_id: course.id, completed_chapters: newCompleted, last_accessed: new Date().toISOString() });
    }

    if (activeChapterIndex < (course.chapters?.length || 0) - 1) setActiveChapterIndex(activeChapterIndex + 1);
    else { alert("🎉 Course Complete! Returning to dashboard."); router.push('/dashboard'); }
  };

  const isScorm = currentChapter.type === 'scorm';

  const renderMediaContent = () => {
    if (currentChapter.type === 'text') return null; 
    if (currentChapter.type === 'quiz') return <div className="w-full mb-8 max-w-4xl mx-auto"><QuizEngine onPass={handleNextModule} questions={currentChapter.questions || []} userEmail={userEmail} courseId={course.id} courseTitle={course.title} chapterTitle={currentChapter.title} /></div>;
    if (!currentChapter.fileUrl) return <div className="w-full aspect-video bg-gray-900 rounded-xl flex items-center justify-center text-gray-500 shadow-lg mb-8 font-bold">No media attached.</div>;

    switch (currentChapter.type) {
      case 'video': return <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg border border-gray-200 mb-8"><video controls className="w-full h-full object-contain" src={currentChapter.fileUrl} controlsList="nodownload">Error</video></div>;
      case 'pdf': return <div className="w-full h-[600px] rounded-xl overflow-hidden shadow-lg border border-gray-200 bg-gray-50 mb-8"><iframe src={`${currentChapter.fileUrl}#toolbar=0`} className="w-full h-full" /></div>;
      // FULL SCREEN SCORM
      case 'scorm': return <div className="absolute inset-0 w-full h-full flex flex-col"><div className="w-full h-8 bg-brand-darkPurple text-center text-[10px] font-bold text-brand-yellow uppercase tracking-widest flex items-center justify-center z-10 shrink-0 pointer-events-none">📦 SCORM Module Running</div><iframe src={currentChapter.fileUrl} className="w-full flex-1 border-0 bg-white" allowFullScreen /></div>;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-white text-brand-darkGrey overflow-hidden">
      <aside className={`${sidebarOpen ? "w-80" : "w-0"} transition-all duration-300 bg-gray-50 border-r border-gray-200 flex flex-col shrink-0 overflow-hidden z-20`}>
        <div className="p-6 bg-white border-b border-gray-200"><Link href="/dashboard" className="text-sm text-brand-purple font-bold mb-6 block hover:text-brand-darkPurple">&larr; Back to Dashboard</Link><h2 className="font-black text-lg text-brand-darkPurple mb-2 line-clamp-3">{course.title}</h2><span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{course.chapters?.length || 0} Modules</span></div>
        <div className="p-4 flex-1 overflow-y-auto">
           <ul className="space-y-2 mt-2">
             {course.chapters?.map((chapter: any, index: number) => {
               const isLocked = index > maxAllowedIndex;
               const isCompleted = completedChapters.includes(index);
               // SUB-CHAPTER INDENTATION
               const indentClass = chapter.isSubChapter ? "ml-6 text-sm border-l-4 border-l-brand-purple/30 bg-white shadow-sm" : "";
               
               return (
                 <li key={chapter.id || index} onClick={() => !isLocked && setActiveChapterIndex(index)} className={`p-3 font-bold rounded-lg border transition-all flex items-center gap-3 ${indentClass} ${isLocked ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200' : index === activeChapterIndex ? "bg-brand-purple/10 text-brand-purple border-brand-purple shadow-sm cursor-pointer" : "text-gray-500 hover:bg-gray-200 border-transparent cursor-pointer"}`}>
                   <span className="text-xl w-6 text-center">{isLocked ? '🔒' : isCompleted ? '✅' : chapter.isSubChapter ? '↳' : chapter.type === 'video' ? '🎥' : chapter.type === 'scorm' ? '📦' : chapter.type === 'quiz' ? '❓' : chapter.type === 'text' ? '📝' : '📄'}</span>
                   <span className="truncate flex-1">{chapter.title || `Module ${index + 1}`}</span>
                 </li>
               )
             })}
           </ul>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-gray-50/30 overflow-hidden relative">
        <header className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0 shadow-sm z-10"><button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-brand-darkGrey font-bold text-sm hover:text-brand-purple">☰ {sidebarOpen ? "Minimise Menu" : "Table of Contents"}</button></header>
        
        {/* CONDITIONAL SCORM FULL SCREEN */}
        {isScorm ? (
          <div className="flex-1 w-full h-full bg-white relative">
            {renderMediaContent()}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 lg:p-12">
            <div className="max-w-4xl mx-auto w-full pb-8">
              <h1 className="text-3xl font-black text-brand-darkPurple mb-6">{currentChapter.title || "Module Content"}</h1>
              {currentChapter.textContent && <div className="mb-8 p-6 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-700 leading-relaxed text-lg whitespace-pre-wrap">{currentChapter.textContent}</div>}
              
              {renderMediaContent()}
              
              {currentChapter.type !== 'quiz' && (
                <div className="bg-brand-lightYellow/20 p-6 rounded-xl border border-brand-yellow/50">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-brand-darkPurple block">📝 My Personal Notes</label>
                    <button onClick={handleSaveNote} disabled={isSavingNote} className="text-xs bg-brand-yellow text-brand-darkPurple font-bold px-3 py-1.5 rounded shadow-sm hover:bg-brand-lightYellow transition">{isSavingNote ? "Saved! ✓" : "💾 Save Note"}</button>
                  </div>
                  <textarea value={currentNote} onChange={(e) => setCurrentNote(e.target.value)} className="w-full border border-gray-300 rounded-lg p-4 text-sm min-h-[120px] bg-white outline-none resize-y focus:border-brand-purple mb-1" placeholder="Jot down thoughts... (Click Save Note to secure them)"/>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider text-right">Notes are saved securely to your profile.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BOTTOM ACTION BAR */}
        {currentChapter.type !== 'quiz' && !isCurrentlyCompleted && (
          <div className="bg-white border-t border-gray-200 p-6 px-8 lg:px-12 flex justify-end shrink-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative z-20">
            <button onClick={() => setShowQuestion(true)} className="bg-brand-purple text-white px-8 py-3.5 rounded-full font-bold text-lg hover:-translate-y-1 transition border-2 border-brand-darkPurple hover:bg-brand-darkPurple cursor-pointer shadow-md">Complete Module &rarr;</button>
          </div>
        )}

        {currentChapter.type !== 'quiz' && isCurrentlyCompleted && activeChapterIndex < (course.chapters?.length || 0) - 1 && (
           <div className="bg-white border-t border-gray-200 p-6 px-8 lg:px-12 flex justify-end shrink-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative z-20">
             <button onClick={() => setActiveChapterIndex(activeChapterIndex + 1)} className="bg-gray-800 text-white px-8 py-3.5 rounded-full font-bold text-lg hover:-translate-y-1 transition border-2 border-black hover:bg-black cursor-pointer shadow-md">Next Module &rarr;</button>
           </div>
        )}
        
        {showQuestion && <QuestionModal question="Are you ready to lock in your progress and unlock the next module?" options={["Yes, save my progress!", "No, I need to review"]} correctAnswer="Yes, save my progress!" onSuccess={() => { setShowQuestion(false); handleNextModule(); }} />}
      </main>
    </div>
  );
}