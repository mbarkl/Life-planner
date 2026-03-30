"use client";

import { Brain } from "lucide-react";

export function Header({ title }: { title: string }) {
  return (
    <header className="h-14 border-b flex items-center px-6 shrink-0">
      <div className="flex items-center gap-3">
        <Brain className="w-5 h-5 text-violet-400 md:hidden" />
        <h1 className="font-semibold text-lg">{title}</h1>
      </div>
    </header>
  );
}
