"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { useOnlinePing } from "@/hooks/useOnlinePing";
import { Toaster } from "sonner";
import ThemeColorInit from "@/components/shared/ThemeColorInit";
import { PollingContext, usePollingProvider } from "@/hooks/usePolling";

function OnlinePingProvider({ children }: { children: React.ReactNode }) {
  useOnlinePing();
  return <>{children}</>;
}

function PollingProvider({ children }: { children: React.ReactNode }) {
  const polling = usePollingProvider();
  return (
    <PollingContext.Provider value={polling}>
      {children}
    </PollingContext.Provider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
          forcedTheme={undefined}
        >
          <OnlinePingProvider>
            <PollingProvider>
              <ThemeColorInit />
              {children}
              <Toaster position="bottom-right" theme="dark" />
            </PollingProvider>
          </OnlinePingProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
