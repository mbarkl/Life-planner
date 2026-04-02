"use client";

import { Header } from "@/components/layout/Header";
import { QuickDump } from "@/components/dashboard/QuickDump";
import { TodayPanel } from "@/components/dashboard/TodayPanel";
import { Suggestions } from "@/components/dashboard/Suggestions";
import { ProjectsSidebar } from "@/components/dashboard/ProjectsSidebar";
import { GoalsPanel } from "@/components/dashboard/GoalsPanel";
import { FollowUpReminders } from "@/components/dashboard/FollowUpReminders";
import { useState } from "react";

export default function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Quick Dump */}
          <QuickDump onProcessed={() => setRefreshKey((k) => k + 1)} />

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" key={refreshKey}>
            {/* Left column — Today + Suggestions */}
            <div className="lg:col-span-2 space-y-6">
              <TodayPanel />
              <Suggestions />
            </div>

            {/* Right column — Projects + Goals */}
            <div className="space-y-6">
              <FollowUpReminders />
              <ProjectsSidebar />
              <GoalsPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
