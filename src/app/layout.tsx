import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { Toaster } from "sonner";
import { baseMetadata } from "@/lib/seo";

export const metadata = baseMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <QueryProvider>
          <ThemeProvider>
            <AuthProvider>
            {children}
            </AuthProvider>
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "hsl(var(--card))",
                  color: "hsl(var(--card-foreground))",
                  border: "1px solid hsl(var(--border))",
                },
              }}
            />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
