import { ReactNode, Suspense } from "react";
import { HomeNavigation } from "@/components/dashboard/HomeNavigation";

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="eye-shell">
      <Suspense fallback={<header className="eye-top"><span className="eye-logo"><span className="eye-logo-mark" />Anitrya</span></header>}>
        <HomeNavigation />
      </Suspense>
      <div className="eye-content">{children}</div>
    </div>
  );
}
