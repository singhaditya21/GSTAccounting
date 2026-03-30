"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Caught inside error boundary:", error);
  }, [error]);

  const isDbError = 
    error.message?.includes("database") || 
    error.message?.includes("credentials") || 
    error.message?.includes("PrismaClientInitializationError") ||
    error.message?.includes("Authentication failed");

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
      <div className="max-w-2xl w-full bg-white border rounded-xl shadow-sm p-8 relative overflow-hidden">
        {/* Top Edge Warning Line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-rose-500"></div>

        <div className="flex items-start gap-4">
          <div className="p-3 bg-rose-100 dark:bg-rose-950/30 rounded-full shrink-0 mt-1">
             {isDbError ? <Database className="w-6 h-6 text-rose-600" /> : <AlertCircle className="w-6 h-6 text-rose-600" />}
          </div>
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-zinc-900">
              {isDbError ? "Database Connection Refused" : "Application Runtime Error"}
            </h1>
            
            <p className="text-zinc-600 text-sm leading-relaxed">
              {isDbError 
                ? "The Prisma ORM could not authenticate against your PostgreSQL database. This usually means your DATABASE_URL environment variable is either missing, pointing to a server that isn't running, or using placeholder credentials."
                : error.message || "An unexpected error occurred during rendering."}
            </p>

            {isDbError && (
              <div className="space-y-4">
                <div className="bg-zinc-100 p-4 rounded-md text-xs font-mono text-zinc-800 break-all border overflow-x-auto">
                  DATABASE_URL="postgresql://user:password@localhost:5432/gstswift?schema=public"
                </div>
                
                <h3 className="text-sm font-bold text-zinc-800">Setup Instructions:</h3>
                <ol className="list-decimal list-inside text-sm text-zinc-600 space-y-2 ml-1">
                  <li>Create a free cloud PostgreSQL edge database at <a href="https://neon.tech" className="text-indigo-600 font-medium hover:underline" target="_blank">Neon.tech</a> or <a href="https://supabase.com" className="text-indigo-600 font-medium hover:underline" target="_blank">Supabase</a>.</li>
                  <li>Copy your unique <code>DATABASE_URL</code> connection string.</li>
                  <li>Paste it into your local <code>.env</code> file.</li>
                  <li>Synchronize the database by running <code>npx prisma db push</code>.</li>
                  <li>Restart your Next.js server.</li>
                </ol>
              </div>
            )}

            <div className="pt-4 flex items-center gap-3 border-t">
              <Button onClick={() => reset()} className="bg-zinc-900 hover:bg-zinc-800 text-white">
                <RefreshCw className="w-4 h-4 mr-2" /> Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
