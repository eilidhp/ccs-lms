"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import JSZip from "jszip"; 

const getMimeType = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html': case 'htm': return 'text/html; charset=utf-8';
    case 'css': return 'text/css; charset=utf-8';
    case 'js': return 'application/javascript; charset=utf-8';
    case 'json': return 'application/json; charset=utf-8';
    case 'png': return 'image/png'; case 'jpg': case 'jpeg': return 'image/jpeg'; case 'gif': return 'image/gif'; case 'svg': return 'image/svg+xml';
    case 'mp4': return 'video/mp4'; case 'mp3': return 'audio/mpeg';
    case 'woff': case 'woff2': return 'font/woff2'; case 'ttf': return 'font/ttf'; case 'eot': return 'application/vnd.ms-fontobject';
    default: return 'application/octet-stream';
  }
};

export default function InstructorPortal() {
  const [activeTab, setActiveTab] = useState("builder");
  const [isSaving, setIsSaving] = useState(false);
  
  // 🧠 COURSE EDITING STATE
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [chapters, setChapters] = useState<any[]>([{ id: 1, title: "", isSubChapter: false, textContent: "", type: "text", fileUrl: "", fileName: "", isUploading: false, uploadStatus: "", questions: [] }]);
  
  // 🧠 REMINDER PUSH STATE
  const [remTitle, setRemTitle] = useState("");
  const [remDate, setRemDate] = useState("");

  const [existingCourses, setExistingCourses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [progressData, setProgressData] = useState<any[]>([]);
  
  const [viewingSubmission, setViewingSubmission] = useState<any>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { fetchAdminData(); }, []);

  const fetchAdminData = async () => {
    const { data: c } = await supabase.from('courses').select('*').order('created_at', { ascending: false }); if (c) setExistingCourses(c);
    const { data: p } = await supabase.from('profiles').select('*').order('email', { ascending: true }); if (p) setUsers(p);
    const { data: e } = await supabase.from('enrollments').select('*'); if (e) setEnrollments(e);
    const { data: s } = await supabase.from('quiz_submissions').select('*').order('submitted_at', { ascending: false }); if (s) setSubmissions(s);
    const { data: prog } = await supabase.from('course_progress').select('*'); if (prog) setProgressData(prog);
  };

  const toggleEnrollment = async (userEmail: string, courseId: number, isEnrolled: boolean) => {
    if (isEnrolled) await supabase.from('enrollments').delete().match({ user_email: userEmail, course_id: courseId });
    else await supabase.from('enrollments').insert([{ user_email: userEmail, course_id: courseId }]);
    fetchAdminData(); 
  };

  const handleDeleteCourse = async (id: number, title: string) => { if (window.confirm(`🚨 Delete "${title}"?`)) { await supabase.from('courses').delete().eq('id', id); fetchAdminData(); } };
  const handleRemoveUser = async (email: string, name: string) => { if (window.confirm(`🚨 WARNING: Are you sure you want to remove ${name || email}? This cannot be undone.`)) { await supabase.from('profiles').delete().eq('email', email); fetchAdminData(); setExpandedUser(null); } };

  // 🧠 THE MISSING FUNCTION! This safely loads the course back into the builder.
  const handleEditCourse = (course: any) => {
    setEditingCourseId(course.id);
    setCourseTitle(course.title);
    setThumbnailUrl(course.thumbnail_url || "");
    setChapters(course.chapters?.length ? course.chapters : [{ id: 1, title: "", isSubChapter: false, textContent: "", type: "text", fileUrl: "", fileName: "", isUploading: false, uploadStatus: "", questions: [] }]);
    setActiveTab("builder");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setIsUploadingThumb(true);
    const safeName = `thumb-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const { error } = await supabase.storage.from('course-content').upload(safeName, file);
    if (!error) setThumbnailUrl(supabase.storage.from('course-content').getPublicUrl(safeName).data.publicUrl);
    setIsUploadingThumb(false);
  };

  const addChapter = () => setChapters([...chapters, { id: Date.now(), title: "", isSubChapter: false, textContent: "", type: "text", fileUrl: "", fileName: "", isUploading: false, uploadStatus: "", questions: [] }]);
  const removeChapter = (id: number) => setChapters(chapters.filter(c => c.id !== id));
  const addQuizQuestion = (cIdx: number) => { const n = [...chapters]; if (!n[cIdx].questions) n[cIdx].questions = []; n[cIdx].questions.push({ qType: "mcq", question: "", options: ["", "", "", ""], answer: "" }); setChapters(n); };
  const removeQuizQuestion = (cIdx: number, qIdx: number) => { const n = [...chapters]; n[cIdx].questions.splice(qIdx, 1); setChapters(n); };
  const updateQuizQuestion = (cIdx: number, qIdx: number, f: string, v: string) => { const n = [...chapters]; n[cIdx].questions[qIdx][f] = v; setChapters(n); };
  const updateQuizOption = (cIdx: number, qIdx: number, oIdx: number, v: string) => { const n = [...chapters]; if (!n[cIdx].questions[qIdx].options) n[cIdx].questions[qIdx].options = ["","","",""]; n[cIdx].questions[qIdx].options[oIdx] = v; setChapters(n); };

  const handleFileUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const newChapters = [...chapters]; newChapters[index].isUploading = true; newChapters[index].fileName = file.name; newChapters[index].uploadStatus = "Preparing upload..."; setChapters([...newChapters]);
    
    try {
      if (newChapters[index].type === 'scorm') {
        const zip = new JSZip(); const loadedZip = await zip.loadAsync(file); const uniqueId = `scorm-${Date.now()}`;
        const fileNames = Object.keys(loadedZip.files);
        const validFiles = fileNames.filter(f => !f.includes("__MACOSX") && !f.startsWith(".") && !loadedZip.files[f].dir);
        const lowerNames = validFiles.map(f => f.toLowerCase());
        let mainFile = validFiles.find(f => f.toLowerCase().endsWith('story.html')) || validFiles.find(f => f.toLowerCase().endsWith('scormdriver/indexapi.html')) || validFiles.find(f => f.toLowerCase().endsWith('index_lms.html')) || validFiles.find(f => f.toLowerCase().endsWith('index.html')) || validFiles.find(f => f.toLowerCase().endsWith('.html')) || validFiles[0];

        const batchSize = 10; let uploadedCount = 0;
        for (let i = 0; i < validFiles.length; i += batchSize) {
          const batch = validFiles.slice(i, i + batchSize);
          await Promise.all(batch.map(async (filename) => {
            const fileData = await loadedZip.files[filename].async("arraybuffer");
            await supabase.storage.from('course-content').upload(`${uniqueId}/${filename}`, fileData, { contentType: getMimeType(filename), upsert: true });
          }));
          uploadedCount += batch.length;
          const progChapters = [...chapters];
          progChapters[index].uploadStatus = `Uploading SCORM... ${Math.round((uploadedCount / validFiles.length) * 100)}%`;
          setChapters(progChapters);
        }

        const publicUrlData = supabase.storage.from('course-content').getPublicUrl(`${uniqueId}/${mainFile}`);
        const finalChapters = [...chapters]; 
        finalChapters[index].fileUrl = encodeURI(publicUrlData.data.publicUrl); 
        finalChapters[index].isUploading = false; 
        finalChapters[index].uploadStatus = "";
        setChapters(finalChapters); 
        return;
      }

      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      await supabase.storage.from('course-content').upload(safeName, file);
      const { data: urlData } = supabase.storage.from('course-content').getPublicUrl(safeName);
      const finalChapters = [...chapters]; finalChapters[index].fileUrl = urlData.publicUrl; finalChapters[index].isUploading = false; setChapters(finalChapters);
    } catch (err) { alert("Error uploading file."); const resetChapters = [...chapters]; resetChapters[index].isUploading = false; resetChapters[index].fileName = ""; setChapters(resetChapters); }
  };

  const handleSaveCourse = async () => {
    if (!courseTitle) { alert("Enter a title!"); return; } setIsSaving(true);
    const chaptersToSave = chapters.map(({ isUploading, uploadStatus, ...rest }) => rest);
    
    // 🧠 SMART SAVE: Use Update if Editing, Insert if New!
    let error;
    if (editingCourseId) {
      const { error: err } = await supabase.from('courses').update({ title: courseTitle, thumbnail_url: thumbnailUrl, chapters: chaptersToSave }).eq('id', editingCourseId);
      error = err;
    } else {
      const { error: err } = await supabase.from('courses').insert([{ title: courseTitle, thumbnail_url: thumbnailUrl, chapters: chaptersToSave }]);
      error = err;
    }

    setIsSaving(false);
    if (!error) { 
      alert(editingCourseId ? "Course Updated Successfully!" : "Course Published!"); 
      setCourseTitle(""); setThumbnailUrl(""); setEditingCourseId(null);
      setChapters([{ id: 1, title: "", isSubChapter: false, textContent: "", type: "text", fileUrl: "", fileName: "", isUploading: false, uploadStatus: "", questions: [] }]); 
      fetchAdminData(); 
    } else {
      alert("Error saving course: " + error.message);
    }
  };

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase()) || (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div className="min-h-screen bg-gray-50 p-8 max-w-6xl mx-auto text-brand-darkGrey">
      <header className="mb-8 flex justify-between items-center border-b border-gray-200 pb-6">
        <div><span className="bg-brand-darkPurple text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">Instructor Portal</span><h1 className="text-3xl font-black text-brand-darkPurple mt-2">Change Consulting Scotland</h1></div>
        <Link href="/dashboard" className="text-brand-purple font-bold hover:text-brand-darkPurple">&larr; Back to Dashboard</Link>
      </header>

      <div className="flex gap-4 mb-8 border-b border-gray-200 overflow-x-auto pb-1">
        {["builder", "enrollments", "reports", "submissions"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 px-4 font-black text-lg transition-colors border-b-4 whitespace-nowrap ${activeTab === tab ? "border-brand-purple text-brand-darkPurple" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
            {tab === "builder" ? "🏗️ Course Builder" : tab === "enrollments" ? "👥 Manage Enrollments" : tab === "reports" ? "📈 Progress Reports" : "📊 Quiz Submissions"}
          </button>
        ))}
      </div>

      {activeTab === "enrollments" && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
          <div className="flex justify-between items-center mb-2"><h2 className="text-2xl font-black text-brand-darkPurple">Learner Enrollments</h2><input type="text" placeholder="Search users by name or email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="border border-gray-300 rounded-lg p-2.5 text-sm font-bold outline-none focus:border-brand-purple w-64" /></div>
          <div className="space-y-3">
            {filteredUsers.map(user => {
              const isAdmin = user.email.toLowerCase().endsWith("@changeconsultingscotland.co.uk");
              return (
              <div key={user.email} className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden shadow-sm">
                <div onClick={() => setExpandedUser(expandedUser === user.email ? null : user.email)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition">
                  <div className="flex items-center gap-4"><div className="w-10 h-10 bg-brand-yellow rounded-full flex items-center justify-center font-black text-brand-darkPurple">{user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}</div><div><h3 className="font-bold text-brand-darkGrey leading-tight">{user.full_name || "No Name Provided"} {isAdmin && <span className="ml-2 text-[10px] bg-brand-purple text-white px-2 py-0.5 rounded-full uppercase">Instructor</span>}</h3><p className="text-sm font-bold text-gray-500 leading-tight">{user.email}</p></div></div>
                  <div className="flex items-center gap-4">{!isAdmin && <button onClick={(e) => { e.stopPropagation(); handleRemoveUser(user.email, user.full_name); }} className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-bold hover:bg-red-200 transition shadow-sm border border-red-200">🗑️ Remove User</button>}<span className="text-gray-400 font-bold w-4 text-center">{expandedUser === user.email ? "▲" : "▼"}</span></div>
                </div>
                {expandedUser === user.email && (
                  <div className="p-4 bg-white border-t border-gray-200">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Course Access Selection:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">{existingCourses.map(course => { const isEnrolled = enrollments.some(e => e.user_email === user.email && e.course_id === course.id); return (<label key={course.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isEnrolled ? "bg-brand-success/10 border-brand-success" : "bg-white border-gray-300 hover:border-brand-purple"}`}><input type="checkbox" checked={isEnrolled} onChange={() => toggleEnrollment(user.email, course.id, isEnrolled)} className="w-5 h-5 accent-brand-success rounded cursor-pointer" /><span className={`font-bold text-sm truncate ${isEnrolled ? "text-brand-success" : "text-gray-600"}`}>{course.title}</span></label>); })}</div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-xs font-bold text-brand-purple uppercase tracking-wider mb-3">📅 Push Calendar Reminder to User</h4>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input type="text" value={remTitle} onChange={e => setRemTitle(e.target.value)} placeholder="e.g. Please finish Module 1" className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm font-bold outline-none focus:border-brand-purple" />
                        <input type="date" value={remDate} onChange={e => setRemDate(e.target.value)} className="border border-gray-300 rounded-lg p-2.5 text-sm font-bold outline-none focus:border-brand-purple text-gray-500 w-40" />
                        <button onClick={async () => {
                          if(!remTitle || !remDate) return alert('Enter a title and date!');
                          const {error} = await supabase.from('calendar_events').insert([{ user_email: user.email, title: remTitle, event_date: remDate, link_url: "" }]); 
                          if(!error) { alert('Reminder sent!'); setRemTitle(''); setRemDate(''); fetchAdminData(); } else { alert(error.message) }
                        }} className="bg-brand-purple text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-brand-darkPurple transition shadow-sm whitespace-nowrap">Send Reminder &rarr;</button>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )})}
          </div>
        </div>
      )}

      {activeTab === "reports" && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200"><h2 className="text-2xl font-black text-brand-darkPurple mb-6">Learner Progress Reports</h2><div className="space-y-6">{users.filter(u => !u.email.toLowerCase().endsWith("@changeconsultingscotland.co.uk")).map(user => { const userEnrolls = enrollments.filter(e => e.user_email === user.email); if (userEnrolls.length === 0) return null; return (<div key={user.email} className="border border-gray-200 p-6 rounded-xl bg-gray-50"><div className="flex justify-between items-start mb-4 border-b border-gray-200 pb-4"><div><h3 className="font-bold text-lg text-brand-darkGrey">{user.full_name || "No Name Provided"}</h3><p className="text-sm font-bold text-gray-500">{user.email}</p></div><div className="text-right"><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Last Log In</p><p className="text-sm font-bold text-brand-purple">{user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never"}</p></div></div><div className="space-y-3">{userEnrolls.map(enr => { const course = existingCourses.find(c => c.id === enr.course_id); if (!course) return null; const totalMods = course.chapters?.length || 0; const prog = progressData.find(p => p.user_email === user.email && p.course_id === course.id); const compMods = prog?.completed_chapters?.length || 0; const percent = totalMods === 0 ? 0 : Math.round((compMods / totalMods) * 100); return (<div key={course.id} className="bg-white border border-gray-200 p-3 rounded-lg flex items-center justify-between shadow-sm"><span className="font-bold text-sm text-gray-700 w-1/3 truncate pr-4">{course.title}</span><div className="flex-1 px-4"><div className="w-full bg-gray-100 rounded-full h-2.5"><div className="bg-brand-success h-2.5 rounded-full" style={{ width: `${percent}%` }}></div></div></div><span className="font-bold text-brand-success text-sm w-16 text-right">{percent}%</span></div>); })}</div></div>); })}</div></div>
      )}

      {activeTab === "submissions" && (
         <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200"><h2 className="text-2xl font-black text-brand-darkPurple mb-6">Learner Quiz Responses</h2>{submissions.length === 0 ? <p className="text-gray-500 font-bold">No quizzes completed yet.</p> : (<div className="space-y-4">{submissions.map(sub => (<div key={sub.id} className="border border-gray-200 p-4 rounded-lg flex justify-between items-center bg-gray-50 flex-wrap gap-4"><div><h3 className="font-bold text-brand-darkGrey text-lg">{sub.user_email}</h3><p className="text-sm font-bold text-gray-500">{sub.course_title} - {sub.chapter_title}</p><p className="text-xs text-brand-purple mt-1 font-bold">{sub.score_text}</p></div><button onClick={() => setViewingSubmission(sub)} className="bg-brand-purple text-white px-4 py-2 rounded font-bold shadow-sm hover:bg-brand-darkPurple transition">View Answers</button></div>))}</div>)}{viewingSubmission && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"><div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-brand-darkPurple">Submission Details</h2><button onClick={() => setViewingSubmission(null)} className="text-gray-400 hover:text-brand-purple font-bold text-3xl">&times;</button></div><div className="space-y-6">{viewingSubmission.answers && viewingSubmission.answers.map((ans: any, i: number) => (<div key={i} className="bg-gray-50 p-4 rounded border border-gray-200"><p className="font-bold text-brand-darkGrey mb-2">Q: {ans.question}</p><div className="bg-white p-4 rounded border border-gray-300 font-medium text-brand-purple whitespace-pre-wrap">{ans.learner_answer || 'No answer provided'}</div></div>))}</div></div></div>)}</div>
      )}

      {activeTab === "builder" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8"><div className="lg:col-span-2 space-y-6"><div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          
          <h2 className="text-lg font-bold text-brand-purple mb-4">{editingCourseId ? "✏️ Editing Existing Course" : "Course Details"}</h2>
          
          <input type="text" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} placeholder="Course Title..." className="w-full border border-gray-300 rounded-lg p-3 mb-6 outline-none focus:border-brand-purple font-bold text-lg" /><h3 className="text-sm font-bold text-gray-700 mb-2">Course Dashboard Thumbnail</h3><div className="flex items-center gap-4">{thumbnailUrl ? <img src={thumbnailUrl} className="w-24 h-16 object-cover rounded border border-gray-200" alt="thumb" /> : <div className="w-24 h-16 bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-xs font-bold text-gray-400">No Img</div>}<label className="cursor-pointer bg-brand-lightYellow/30 border border-brand-yellow px-4 py-2 rounded-lg text-sm font-bold text-brand-darkPurple hover:bg-brand-lightYellow transition">Upload Thumbnail Image<input type="file" accept="image/*" className="hidden" onChange={handleThumbUpload} disabled={isUploadingThumb}/></label></div></div><div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"><div className="flex justify-between items-center mb-6"><h2 className="text-lg font-bold text-brand-purple">Curriculum Builder</h2><button onClick={addChapter} className="bg-brand-yellow text-brand-darkPurple px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-brand-lightYellow">+ Add Module</button></div><div className="space-y-6">{chapters.map((chapter, i) => (<div key={chapter.id} className="bg-gray-50 p-5 border border-gray-200 rounded-lg space-y-4 shadow-sm relative group"><div className="flex items-center gap-3 flex-wrap"><span className="w-8 h-8 flex items-center justify-center bg-brand-darkPurple text-white rounded font-bold shrink-0 shadow-sm">{i + 1}</span>
                    <input type="text" value={chapter.title} onChange={(e) => { const n = [...chapters]; n[i].title = e.target.value; setChapters(n); }} placeholder="Module Title..." className="flex-1 border border-gray-300 p-2.5 rounded-lg outline-none focus:border-brand-purple bg-white font-bold min-w-[150px]" />
                    <select value={chapter.type} onChange={(e) => { const n = [...chapters]; n[i].type = e.target.value; setChapters(n); }} className="border border-gray-300 p-2.5 rounded-lg outline-none focus:border-brand-purple bg-white text-sm font-bold text-gray-600"><option value="text">📝 Text Only</option><option value="video">🎥 Video</option><option value="pdf">📄 PDF</option><option value="scorm">📦 SCORM</option><option value="quiz">❓ Quiz</option></select>
                    
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-300 text-sm font-bold text-gray-600 hover:border-brand-purple">
                      <input type="checkbox" checked={chapter.isSubChapter || false} onChange={(e) => { const n = [...chapters]; n[i].isSubChapter = e.target.checked; setChapters(n); }} className="w-4 h-4 accent-brand-purple cursor-pointer" /> Is Sub-Chapter
                    </label>

                    <button onClick={() => removeChapter(chapter.id)} className="text-red-400 font-bold px-2 text-2xl hover:text-red-600">&times;</button></div><div className="ml-11"><textarea value={chapter.textContent || ""} onChange={(e) => { const n = [...chapters]; n[i].textContent = e.target.value; setChapters(n); }} placeholder={chapter.type === 'text' ? "Type your course content here..." : "Add context, instructions, or body text..."} className="w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[100px] outline-none focus:border-brand-purple bg-white resize-y" /></div>{chapter.type === 'quiz' && (<div className="ml-11 bg-brand-lightYellow/10 p-5 rounded-lg border-2 border-brand-yellow/50"><div className="flex justify-between items-center mb-4"><h4 className="font-bold text-brand-darkPurple text-sm uppercase tracking-wider">📝 Questions</h4><button onClick={() => addQuizQuestion(i)} className="text-xs bg-brand-yellow text-brand-darkPurple px-3 py-1.5 rounded font-bold shadow-sm hover:bg-brand-lightYellow">+ Add Q</button></div>{chapter.questions?.map((q: any, qIndex: number) => (<div key={qIndex} className="bg-white p-4 border border-gray-200 rounded-lg relative shadow-sm mb-4"><button onClick={() => removeQuizQuestion(i, qIndex)} className="absolute -top-3 -right-3 bg-white text-red-500 border border-gray-200 rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-sm">&times;</button><div className="flex gap-3 mb-3"><select value={q.qType || 'mcq'} onChange={(e) => updateQuizQuestion(i, qIndex, 'qType', e.target.value)} className="w-1/3 p-3 border border-gray-300 rounded outline-none font-bold text-sm"><option value="mcq">⭕ Multiple Choice</option><option value="short">✏️ Short Text</option><option value="long">📄 Long Text</option></select><input placeholder="Question prompt..." value={q.question} onChange={(e) => updateQuizQuestion(i, qIndex, 'question', e.target.value)} className="w-2/3 p-3 border border-gray-300 rounded outline-none font-bold text-sm" /></div>{(!q.qType || q.qType === 'mcq') && (<><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">{[0, 1, 2, 3].map((oIdx) => (<input key={oIdx} placeholder={`Option ${oIdx + 1}`} value={q.options[oIdx] || ""} onChange={(e) => updateQuizOption(i, qIndex, oIdx, e.target.value)} className="p-2 border border-gray-300 rounded text-sm outline-none" />))}</div><select value={q.answer} onChange={(e) => updateQuizQuestion(i, qIndex, 'answer', e.target.value)} className="w-full p-2.5 border border-brand-purple/50 bg-brand-purple/5 rounded text-sm font-bold text-brand-darkPurple outline-none"><option value="">Select CORRECT answer...</option>{q.options.map((opt: string, oIndex: number) => opt && <option key={oIndex} value={opt}>{opt}</option>)}</select></>)}</div>))}</div>)}{chapter.type !== 'quiz' && chapter.type !== 'text' && (<div className="ml-11 flex items-center gap-4 bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">{chapter.isUploading ? <span className="text-brand-purple font-bold text-sm animate-pulse">⏳ {chapter.uploadStatus || "Uploading..."}</span> : chapter.fileUrl ? <span className="text-brand-success font-bold text-sm truncate">✓ attached</span> : (<><span className="flex-1 text-sm text-gray-500 font-bold">Attach file:</span><label className="cursor-pointer bg-brand-purple/10 px-4 py-2 rounded-md text-sm font-bold text-brand-purple hover:bg-brand-purple/20 transition whitespace-nowrap">☁️ Choose File<input type="file" className="hidden" accept={chapter.type === 'scorm' ? '.zip' : undefined} onChange={(e) => handleFileUpload(i, e)} /></label></>)}</div>)}</div>))}</div></div></div><div className="space-y-6"><div className="bg-brand-darkPurple p-6 rounded-xl shadow-lg text-white sticky top-8 h-fit"><h2 className="text-lg font-bold mb-6 text-brand-yellow">Publish Course</h2>
        
        {/* 🧠 DYNAMIC SAVE BUTTON */}
        <button onClick={handleSaveCourse} disabled={isSaving || chapters.some(c => c.isUploading)} className="w-full bg-brand-yellow text-brand-darkPurple font-bold py-3.5 rounded-lg hover:bg-brand-lightYellow transition disabled:opacity-50">
          {editingCourseId ? "💾 Save Changes" : "Save & Publish \u2192"}
        </button>
        {editingCourseId && (
          <button onClick={() => { setEditingCourseId(null); setCourseTitle(""); setThumbnailUrl(""); setChapters([{ id: 1, title: "", isSubChapter: false, textContent: "", type: "text", fileUrl: "", fileName: "", isUploading: false, uploadStatus: "", questions: [] }]); }} className="w-full mt-3 bg-white/10 text-white font-bold py-2 rounded-lg hover:bg-white/20 transition">Cancel Edit</button>
        )}

        </div><div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"><h2 className="text-lg font-bold text-brand-purple mb-4 border-b border-gray-100 pb-4">🗑️ Live Courses</h2>{existingCourses.length === 0 ? <p className="text-gray-500 font-bold">No courses published.</p> : (<div className="space-y-2">{existingCourses.map(c => (<div key={c.id} className="flex flex-col xl:flex-row xl:items-center justify-between py-2 border-b border-gray-100 last:border-0 gap-2"><span className="text-sm font-bold text-brand-darkGrey truncate pr-4">{c.title}</span><div className="flex gap-2 shrink-0">
          
          {/* ✅ THE BUTTON IS NOW SAFE TO USE! */}
          <button onClick={() => handleEditCourse(c)} className="bg-blue-50 text-blue-600 px-3 py-1 rounded text-xs font-bold hover:bg-blue-100 transition border border-blue-200">Edit</button>
          <button onClick={() => handleDeleteCourse(c.id, c.title)} className="bg-red-50 text-red-600 px-3 py-1 rounded text-xs font-bold hover:bg-red-100 transition border border-red-200">Delete</button>

          </div></div>))}</div>)}</div></div></div>
      )}
    </div>
  );
}