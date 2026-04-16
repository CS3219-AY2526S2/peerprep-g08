import { type ReactNode } from "react";
import AppNavbar from "./Navbar";
interface PageLayoutProps {
  children: ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="flex flex-col h-screen w-screen">
      <AppNavbar />
      {children}
    </div>
  );
}
