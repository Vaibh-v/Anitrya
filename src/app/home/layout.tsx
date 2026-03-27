import { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1680px]">
        <Sidebar />
        <main className="min-w-0 flex-1 px-8 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}