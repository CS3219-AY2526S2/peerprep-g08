
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { HeroUIProvider } from "@heroui/react";
import { ToastProvider } from "@heroui/toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

// TODO: re-enable strict mode (removed due to websocket dev in collab-service)
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <HeroUIProvider>
      <ToastProvider placement="top-center" />
      <main className="light text-foreground bg-background">
        <App />
      </main>
    </HeroUIProvider>
  </QueryClientProvider>,
);
