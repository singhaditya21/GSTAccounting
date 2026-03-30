"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

export function IdleTimeoutListener({ timeoutMinutes = 30 }: { timeoutMinutes?: number }) {
  const { signOut } = useAuth();
  const router = useRouter();
  const timeoutSeconds = timeoutMinutes * 60;
  const timerId = useRef<NodeJS.Timeout | null>(null);
  
  const [showWarning, setShowWarning] = useState(false);

  const resetTimer = () => {
    setShowWarning(false);
    if (timerId.current) clearTimeout(timerId.current);
    
    // Set absolute kill switch
    timerId.current = setTimeout(() => {
       executeForcedLogout();
    }, timeoutSeconds * 1000);

    // Show warning 60 seconds before kill
    if (timeoutSeconds > 60) {
       setTimeout(() => {
          setShowWarning(true);
       }, (timeoutSeconds - 60) * 1000);
    }
  };

  const executeForcedLogout = async () => {
    try {
      await signOut();
      router.push("/sign-in?idle_timeout=true");
    } catch(e) {
      window.location.href = "/sign-in";
    }
  };

  useEffect(() => {
    const events = ["mousemove", "keydown", "wheel", "touchstart", "click"];
    
    // Throttle events so we don't nuke the main thread
    let throttleTimer = false;
    const handleActivity = () => {
       if (!throttleTimer) {
         resetTimer();
         throttleTimer = true;
         setTimeout(() => { throttleTimer = false; }, 1000);
       }
    };

    events.forEach(evt => window.addEventListener(evt, handleActivity));
    resetTimer(); // Init

    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleActivity));
      if (timerId.current) clearTimeout(timerId.current);
    };
  }, [timeoutSeconds]);

  if (!showWarning) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] animate-in slide-in-from-bottom-5">
      <div className="bg-rose-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-rose-500">
         <AlertTriangle className="w-5 h-5 animate-pulse" />
         <div>
           <p className="text-sm font-bold">Session Expiry Warning</p>
           <p className="text-xs text-rose-200">System will auto-lock due to compliance inactivity.</p>
         </div>
      </div>
    </div>
  );
}
