import { ThemeProvider } from "next-themes";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class" // обязательно "class", чтобы Tailwind работал
          defaultTheme="dark" // тёмная тема по умолчанию
          enableSystem={false} // отключаем системные предпочтения
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
