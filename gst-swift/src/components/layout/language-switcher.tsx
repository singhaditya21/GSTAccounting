"use client";

import { useState } from "react";
import { setLocale } from "@/app/actions/locale-action";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

const languages = [
  { code: "en", name: "English 🇺🇸" },
  { code: "hi", name: "हिन्दी 🇮🇳" },
  { code: "es", name: "Español 🇪🇸" },
];

export function LanguageSwitcher() {
  const [isPending, setIsPending] = useState(false);

  const handleLanguageChange = async (code: string) => {
    setIsPending(true);
    await setLocale(code);
    setIsPending(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="h-9 w-9 flex items-center justify-center rounded-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm disabled:opacity-50 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900 outline-none" disabled={isPending}>
        <Globe className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        {languages.map((lang) => (
          <DropdownMenuItem 
            key={lang.code} 
            onClick={() => handleLanguageChange(lang.code)}
            className="cursor-pointer flex items-center gap-2"
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
