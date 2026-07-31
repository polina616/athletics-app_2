"use client";

import { useAppStore } from "@/store/useAppStore";
import MeetSetup from "@/components/MeetSetup";
import Dashboard from "@/components/Dashboard";
import SyncStatus from "@/components/SyncStatus";

export default function HomePage() {
  const currentMeetId = useAppStore((s) => s.currentMeetId);
  const setCurrentMeetId = useAppStore((s) => s.setCurrentMeetId);

  return (
    <main className="min-h-screen bg-transparent relative z-0">
      {!currentMeetId ? (
        <MeetSetup ownerId="local_user" onCreated={(id) => setCurrentMeetId(id)} />
      ) : (
        <Dashboard meetId={currentMeetId} />
      )}
      <SyncStatus />
    </main>
  );
}