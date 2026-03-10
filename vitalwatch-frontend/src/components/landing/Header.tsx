"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { useTheme } from "next-themes";
import { Menu, X, Sun, Moon, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const navigation = [
  { name: "Platform", href: "/#platform" },
  { name: "Evidence", href: "/#evidence" },
  { name: "Solutions", href: "/#solutions" },
  { name: "Security", href: "/#security" },
  { name: "Pricing", href: "/#pricing" },
  { name: "Devices", href: "/devices" },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        mounted
          ? isScrolled
            ? "bg-white/95 dark:bg-slate-950/90 backdrop-blur-xl shadow-lg shadow-black/5 dark:shadow-black/10 border-b border-slate-200 dark:border-white/5"
            : "bg-white/80 dark:bg-transparent backdrop-blur-sm dark:backdrop-blur-none"
          : "bg-transparent"
      )}
      suppressHydrationWarning
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link href="/" className="flex items-center group">
            <Image
              src="/logo.png"
              alt="VytalWatch AI"
              width={140}
              height={48}
              className="h-10 lg:h-12 transition-transform duration-300 group-hover:scale-105"
              style={{ width: "auto", height: "auto", maxHeight: "3rem" }}
              priority
            />
          </Link>

          <div className="hidden lg:flex items-center gap-1" suppressHydrationWarning>
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="relative px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
                suppressHydrationWarning
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
            )}

            <div className="hidden sm:flex items-center gap-3">
              <Link href="/auth/login">
                <Button
                  variant="ghost"
                  className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 transition-all duration-300"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Start Free Trial
                </Button>
              </Link>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              aria-label="Toggle menu"
              suppressHydrationWarning
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="lg:hidden overflow-hidden"
            >
              <div className="py-4 border-t border-slate-200 dark:border-white/10">
                <div className="space-y-1">
                  {navigation.map((item, i) => (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link
                        href={item.href}
                        className="block px-4 py-3 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.name}
                      </Link>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 flex gap-3 px-4">
                  <Link href="/auth/login" className="flex-1">
                    <Button variant="outline" className="w-full border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/register" className="flex-1">
                    <Button className="w-full bg-blue-600 text-white">
                      Free Trial
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}
