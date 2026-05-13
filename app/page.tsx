"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    // Hide false verification errors from the URL cleanly
    if (typeof window !== 'undefined' && window.location.hash.includes('error=')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push("/dashboard");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) router.push("/dashboard");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErrorMsg(""); setSuccessMsg("");
    let error;

    if (isLogin) {
      const res = await supabase.auth.signInWithPassword({ email, password });
      error = res.error;
      if (!error) {
        await supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('email', email.toLowerCase());
        router.push("/dashboard");
      }
    } else {
      if (!fullName) { setErrorMsg("Please provide your full name."); setLoading(false); return; }
      const res = await supabase.auth.signUp({ email, password });
      error = res.error;
      
      // If sign up works, check if it auto-logged them in (Email Confirm is OFF)
      // or if it requires verification (Email Confirm is ON)
      if (!error) {
        await supabase.from('profiles').upsert({ email: email.toLowerCase(), full_name: fullName, last_login: new Date().toISOString() });
        
        if (res.data.session) {
           router.push("/dashboard");
        } else {
           // EXACT WORDING UPDATED HERE
           setSuccessMsg("You should shortly receive an email asking to verify your email address. Simply follow the URL within the email and then return to the Log In page.");
           setLoading(false);
        }
        return;
      }
    }

    if (error) { 
      if (error.message.includes("Error sending confirmation Email") || error.message.includes("rate limit")) {
        setErrorMsg("Error sending confirmation Email: Please check your Supabase SMTP settings, or wait a few minutes if you've hit the rate limit.");
      } else {
        setErrorMsg(error.message); 
      }
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="bg-brand-darkPurple p-8 text-center border-b-4 border-brand-yellow">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide leading-tight">Change Consulting<br/>Scotland</h1>
          <p className="text-brand-lightYellow font-bold mt-4 tracking-widest uppercase text-sm">Learning Portal</p>
        </div>
        
        <div className="p-8">
          <h2 className="text-2xl font-bold text-brand-darkGrey mb-6 text-center">{isLogin ? "Welcome back" : "Create your account"}</h2>
          {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold mb-4 border border-red-200 text-center">{errorMsg}</div>}

          {successMsg ? (
            <div className="bg-brand-success/10 border-2 border-brand-success p-6 rounded-xl text-center space-y-4">
              <span className="text-4xl block">✉️</span>
              <p className="text-brand-success font-bold text-sm leading-relaxed">{successMsg}</p>
              <button onClick={() => { setSuccessMsg(""); setIsLogin(true); }} className="text-sm font-bold underline text-brand-success hover:text-green-800">Return to Log In</button>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                  <input type="text" required={!isLogin} value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-brand-purple bg-gray-50" placeholder="Jane Doe" />
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-brand-purple bg-gray-50" placeholder="you@changeconsultingscotland.co.uk" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-brand-purple bg-gray-50" placeholder="••••••••" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-brand-purple text-white font-bold py-3.5 rounded-lg hover:bg-brand-darkPurple transition shadow-md mt-4 disabled:opacity-50">
                {loading ? "Authenticating..." : isLogin ? "Log In \u2192" : "Sign Up \u2192"}
              </button>
            </form>
          )}

          {!successMsg && (
            <div className="mt-6 text-center">
              <button type="button" onClick={() => { setIsLogin(!isLogin); setErrorMsg(""); }} className="text-sm font-bold text-gray-500 hover:text-brand-purple transition">
                {isLogin ? "Need an account? Sign Up" : "Already have an account? Log In"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}