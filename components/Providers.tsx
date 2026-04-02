"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { useOnlinePing } from "@/hooks/useOnlinePing";
import { Toaster } from "sonner";

function OnlinePingProvider({ children }: { children: React.ReactNode }) {
  useOnlinePing();
  return <>{children}</>;
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
            {children}
            <Toaster position="bottom-right" theme="dark" />
          </OnlinePingProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
