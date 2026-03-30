"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, X, MessageCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export function GlobalChatWidget({ orgId }: { orgId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input, id: Date.now().toString() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage], orgId }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error! status: ${response.status}`);
      }

      if (!response.body) throw new Error("No stream logic enabled.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = { role: "assistant", text: "", id: (Date.now() + 1).toString() };
      
      setMessages((prev) => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // Vercel AI SDK format strings ("0: ....")
        const lines = chunk.split("\n").filter(l => l.trim().startsWith("0:"));
        for (const line of lines) {
           try {
              const text = JSON.parse(line.substring(2));
              assistantMessage.text += text;
              setMessages((prev) => prev.map(m => m.id === assistantMessage.id ? { ...m, text: assistantMessage.text } : m));
           } catch (e) {}
        }
      }
    } catch (error: any) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `⚠️ Connection Error: ${error.message}\nIf this persists, the NVIDIA API Model may not support the current inference parameters or model string.`, id: Date.now().toString() }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window Panel */}
      <div 
        className={`mb-4 transition-all duration-300 origin-bottom-right ${
          isOpen 
            ? "opacity-100 scale-100 translate-y-0" 
            : "opacity-0 scale-95 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="w-[380px] h-[600px] max-h-[80vh] flex flex-col bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl overflow-hidden relative">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 backdrop-blur-sm relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow-inner">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-none">Financial Intelligence</h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  z-ai/glm4.7
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon-sm" className="h-8 w-8 rounded-full text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4 w-full">
            <div className="flex flex-col gap-4 pb-4">
              {messages.length === 0 && (
                <div className="text-center py-10 space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                    <Bot className="w-8 h-8 text-zinc-400 dark:text-zinc-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">GST-Compliant Assistant</p>
                    <p className="text-xs text-zinc-500 px-4">I track your global ledgers. Ask me about your organization's financials.</p>
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <div key={m.id} className={`flex gap-3 text-sm ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role !== 'user' && (
                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm leading-relaxed ${
                    m.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : 'bg-zinc-100/80 dark:bg-zinc-900/80 text-zinc-800 dark:text-zinc-200 rounded-bl-none border border-zinc-200/50 dark:border-zinc-800/50'
                  }`}>
                    <div className="whitespace-pre-wrap">{m.text || (m as any).content}</div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 text-sm justify-start">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="bg-zinc-100/80 dark:bg-zinc-900/80 text-zinc-800 dark:text-zinc-200 rounded-2xl rounded-bl-none px-4 py-3 border border-zinc-200/50 dark:border-zinc-800/50 flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/60 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/60 animate-bounce delay-75"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/60 animate-bounce delay-150"></span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </ScrollArea>

          {/* Input Form */}
          <div className="p-3 bg-white/50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="relative flex items-center">
              <Input 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder="Ask financial questions..."
                className="flex-1 rounded-full px-5 py-5 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus-visible:ring-indigo-600 pr-12 shadow-inner text-sm"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                disabled={isLoading || !input.trim()} 
                size="icon" 
                className="absolute right-1.5 shrink-0 rounded-full bg-indigo-600 hover:bg-indigo-700 w-8 h-8 shadow-sm transition-transform active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Floating Action Button (FAB) */}
      <Button 
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className={`w-14 h-14 rounded-full shadow-2xl transition-all duration-300 border-2 overflow-hidden ${
          isOpen ? 'bg-zinc-800 hover:bg-zinc-900 border-transparent text-white scale-90' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 hover:shadow-indigo-500/25 border-indigo-400/30 dark:border-indigo-500/40'
        }`}
      >
        <span className="sr-only">Toggle AI Assistant</span>
        <div className={`relative flex items-center justify-center transition-transform duration-300 w-full h-full ${isOpen ? 'rotate-90' : 'rotate-0'}`}>
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <MessageCircle className="w-6 h-6 text-white ml-0.5" />
          )}
        </div>
      </Button>
    </div>
  );
}
