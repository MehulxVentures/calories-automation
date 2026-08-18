"use client";

import { Toaster } from "./ui/sonner";
import QueryProvider from "./query-client";
import { ThemeProvider } from "./theme-provider";
import { useCurrentUser } from "@/hooks/use-auth";

const AuthInitializer = () => {
    useCurrentUser();
    return null;
};

const Providers = ({ children }: { children: React.ReactNode }) => {
    return (
        <QueryProvider>
            <AuthInitializer />
            <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem
                disableTransitionOnChange
            >
                {children}
                <Toaster position="top-center" />
            </ThemeProvider>
        </QueryProvider>
    );
};

export default Providers;
