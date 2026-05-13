"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" or "notes"
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventModal, setSelectedEventModal] = useState<any>(null);
  
  // Notes & Progress state
  const [allProgress, setAllProgress] = useState<any[]>([]);
  const [myNotes, setMyNotes] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }
      const email = session.user.email || "";
      setUserEmail(email);

      const isAdmin = email.toLowerCase().endsWith("@changeconsultingscotland.co.uk");
      if (isAdmin) {
        const { data } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
        setCourses(data || []);
      } else {
        const { data: enr } = await supabase.from('enrollments').select('course_id, courses(*)').eq('user_email', email);
        if (enr && enr.length > 0) setCourses(enr.map(e => e.courses).filter(c => c !== null));
        else setCourses([]);
      }

      // Load Progress for the % bars
      const { data: prog } = await supabase.from('course_progress').select('*').eq('user_email', email);
      if (prog) setAllProgress(prog);

      fetchEvents(email);
      
      // Fetch Notes
      const { data: nts } = await supabase.from('user_notes').select('*').eq('user_email', email).order('updated_at', { ascending: false });
      if (nts) setMyNotes(nts);

      setLoading(false);
    }
    loadDashboard();
  }, [router]);

  const fetchEvents = async (email: string) => { const { data } = await supabase.from('calendar_events').select('*').eq('user_email', email); if (data) setEvents(data); };
  const handleSignOut = async () => { await supabase.auth.signOut(); router.push("/"); };

  const year = currentDate.getFullYear(); const month = currentDate.getMonth(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const firstDay = new Date(year, month, 1).getDay(); const startOffset = firstDay === 0 ? 6 : firstDay - 1; const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const handleAddEvent = async (day: number) => { const title = window.prompt(`Log a reminder for ${day} ${monthNames[month]}:`); if (!title) return; const link_url = window.prompt(`Optional: Add a link for this event`); const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; await supabase.from('calendar_events').insert({ user_email: userEmail, event_date: dateStr, title, link_url: link_url || "" }); fetchEvents(userEmail); };
  const handleDeleteEvent = async (id: number) => { if(window.confirm("Delete reminder?")) { await supabase.from('calendar_events').delete().eq('id', id); fetchEvents(userEmail); setSelectedEventModal(null); } };

  if (loading) return <div className="min-h-screen flex justify-center items-center text-brand-purple font-bold text-xl bg-gray-50">Authenticating...</div>;
  const isAdmin = userEmail.toLowerCase().endsWith("@changeconsultingscotland.co.uk");

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto relative">
      {selectedEventModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedEventModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center border-t-8 border-brand-yellow" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-brand-darkPurple mb-2">{selectedEventModal.title}</h3>
            <p className="text-sm font-bold text-gray-500 mb-6">{selectedEventModal.event_date}</p>
            {selectedEventModal.link_url && <a href={selectedEventModal.link_url.startsWith('http') ? selectedEventModal.link_url : `https://${selectedEventModal.link_url}`} target="_blank" rel="noreferrer" className="block w-full bg-brand-purple text-white font-bold py-3 rounded-lg mb-3 hover:bg-brand-darkPurple transition">🔗 Open Link</a>}
            <button onClick={() => handleDeleteEvent(selectedEventModal.id)} className="block w-full bg-red-50 text-red-600 font-bold py-3 rounded-lg border border-red-200 mb-3 hover:bg-red-100 transition">🗑️ Delete Reminder</button>
            <button onClick={() => setSelectedEventModal(null)} className="block w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-lg hover:bg-gray-200 transition">Cancel</button>
          </div>
        </div>
      )}

      <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><h1 className="text-3xl font-black text-brand-darkPurple">My Dashboard</h1><div className="flex items-center gap-4">{isAdmin && <Link href="/admin/builder" className="bg-brand-darkPurple text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm">⚙️ Instructor Portal</Link>}<div className="flex items-center gap-3 bg-white p-1.5 pr-4 rounded-full border border-gray-200 shadow-sm"><div className="w-10 h-10 rounded-full bg-brand-yellow text-brand-darkPurple flex items-center justify-center font-black text-lg shadow-inner border border-brand-lightYellow">{userEmail.charAt(0).toUpperCase()}</div><button onClick={handleSignOut} className="text-sm font-bold text-gray-400 hover:text-red-500 transition">Sign Out</button></div></div></header>

      <div className="flex gap-4 mb-8 border-b border-gray-200 overflow-x-auto pb-1">
        <button onClick={() => setActiveTab("overview")} className={`pb-3 px-4 font-black text-lg transition-colors border-b-4 whitespace-nowrap ${activeTab === "overview" ? "border-brand-purple text-brand-darkPurple" : "border-transparent text-gray-400 hover:text-gray-600"}`}>📚 Course Overview</button>
        <button onClick={() => setActiveTab("notes")} className={`pb-3 px-4 font-black text-lg transition-colors border-b-4 whitespace-nowrap ${activeTab === "notes" ? "border-brand-purple text-brand-darkPurple" : "border-transparent text-gray-400 hover:text-gray-600"}`}>📝 Go to My Notes</button>
      </div>

      {activeTab === "notes" && (
        <div className="space-y-6">
          {myNotes.length === 0 ? <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500 font-bold">You haven't saved any notes yet!</div> : 
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myNotes.map(note => (
              <div key={note.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col hover:border-brand-purple transition group">
                <h3 className="font-black text-brand-darkPurple text-lg mb-1">{note.course_title}</h3>
                <h4 className="text-sm font-bold text-brand-purple mb-4 pb-2 border-b border-gray-100">{note.chapter_title}</h4>
                <p className="text-gray-700 whitespace-pre-wrap flex-1 text-sm">{note.content}</p>
                <div className="mt-4 pt-4 border-t border-gray-100 text-xs font-bold text-gray-400 text-right">
                  Last updated: {new Date(note.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>}
        </div>
      )}

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-brand-purple border-b border-gray-200 pb-2">Enrolled Courses</h2>
            {courses.length === 0 ? <p className="text-gray-500 font-bold p-12 text-center border-2 border-dashed border-gray-300 rounded-xl bg-white">No enrolled courses yet.</p> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courses.map((c: any, i: number) => {
                  const fallbackBg = ["bg-brand-darkPurple", "bg-brand-purple", "bg-brand-yellow", "bg-gray-800"][i % 4];
                  
                  // Safer math calculation for Progress Percentages!
                  const cProg = allProgress.find(p => Number(p.course_id) === Number(c.id));
                  const totalChapters = c.chapters?.length || 1;
                  // We ensure we only count UNIQUE completed chapters!
                  const uniqueCompleted = cProg?.completed_chapters ? Array.from(new Set(cProg.completed_chapters)).length : 0;
                  const progressPercent = Math.min(100, Math.round((uniqueCompleted / totalChapters) * 100));

                  return (
                    <Link href={`/course/${c.id}`} key={c.id}>
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer flex flex-col h-full group">
                        <div className={`h-48 ${fallbackBg} relative flex items-center justify-center bg-cover bg-center border-b border-gray-100`} style={c.thumbnail_url ? { backgroundImage: `url(${c.thumbnail_url})` } : {}}>{!c.thumbnail_url && <span className="text-white/30 font-bold tracking-wider uppercase text-sm">Course Content</span>}</div>
                        <div className="p-6 flex-1 flex flex-col"><h3 className="font-bold text-lg mb-4 text-brand-darkGrey">{c.title}</h3><div className="mt-auto flex justify-between text-sm font-bold text-gray-500 mb-2"><span className="text-brand-purple">{progressPercent}% Complete</span><span>{totalChapters} Modules</span></div><div className="w-full bg-gray-100 rounded-full h-2.5"><div className="bg-brand-purple h-2.5 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div></div></div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit sticky top-8">
            <h2 className="text-xl font-bold text-brand-darkPurple mb-6 flex items-center gap-2">📅 Interactive Calendar</h2>
            <div className="flex justify-between items-center mb-6 bg-gray-50 p-3 rounded-lg border border-gray-200"><button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-600 hover:text-brand-purple font-bold transition">&lt;</button><h3 className="font-black text-brand-darkPurple text-lg">{monthNames[month]} {year}</h3><button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-600 hover:text-brand-purple font-bold transition">&gt;</button></div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2 text-xs font-bold text-gray-400"><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div><div>S</div></div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startOffset }).map((_, i) => <div key={`blank-${i}`} className="p-2" />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1; const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayEvents = events.filter(e => e.event_date === dateStr);
                const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                
                return (
                  <div key={day} onClick={(e) => { if ((e.target as HTMLElement).tagName !== 'DIV' || !(e.target as HTMLElement).className.includes('text-[9px]')) handleAddEvent(day); }} className={`min-h-[50px] p-1 border rounded cursor-pointer relative group transition ${isToday ? 'border-brand-purple bg-brand-purple/5' : dayEvents.length > 0 ? "border-brand-yellow bg-brand-lightYellow/10" : "hover:border-brand-purple hover:bg-gray-50 border-gray-100"}`}>
                    <span className={`text-sm font-bold block text-center ${dayEvents.length > 0 || isToday ? 'text-brand-darkPurple' : 'text-gray-500'}`}>{day}</span>
                    <div className="mt-1 space-y-1">{dayEvents.map(ev => <div key={ev.id} onClick={(e) => { e.stopPropagation(); setSelectedEventModal(ev); }} className="text-[9px] bg-brand-yellow text-brand-darkPurple rounded px-1 py-1 truncate font-bold text-center cursor-pointer hover:bg-brand-lightYellow shadow-sm" title="Click to View/Delete">{ev.link_url ? '🔗 ' : ''}{ev.title}</div>)}</div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 text-center mt-4 font-bold italic">Click any empty space to log a reminder.</p>
          </div>
        </div>
      )}
    </div>
  );
}