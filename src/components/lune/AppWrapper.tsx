"use client";

import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WalletProvider } from "@/context/WalletContext";
import { SessionContextProvider } from "@/context/SessionContext";
import { BadgesProvider } from "@/context/BadgesContext";
import { SocialProvider } from "@/context/SocialContext";

const queryClient = new QueryClient();

export const AppWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionContextProvider>
        <WalletProvider>
          <SocialProvider>
            <BadgesProvider>
            <TooltipProvider>
              {children}
              <Toaster />
              <Sonner />
            </TooltipProvider>
            </BadgesProvider>
          </SocialProvider>
        </WalletProvider>
      </SessionContextProvider>
    </QueryClientProvider>
  );
};