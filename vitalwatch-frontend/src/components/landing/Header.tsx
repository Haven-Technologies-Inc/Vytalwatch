"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { useTheme } from "next-themes";
import { Menu, X, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Home", href: "#home" },
  { name: "About", href: "#about" },
  { name: "Why Choose Us", href: "#why-choose" },
  { name: "Use Cases", href: "#use-cases" },
  { name: "Pricing", href: "#pricing" },
  { name: "FAQs", href: "#faqs" },
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
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-slate-950/95 backdrop-blur-lg shadow-sm border-b border-slate-800/50"
          : "bg-slate-950/30 backdrop-blur-sm"
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="VytalWatch AI"
              width={140}
              height={48}
              className="h-12"
              style={{ width: 'auto', height: 'auto', maxHeight: '3rem' }}
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-slate-400 hover:text-white transition-colors text-sm"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
            )}

            {/* Auth Buttons */}
            <div className="hidden sm:flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth/register">
                <Button>Start Free Trial</Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-slate-800">
            <div className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800 flex gap-3 px-4">
              <Link href="/auth/login" className="flex-1">
                <Button variant="outline" className="w-full">Sign In</Button>
              </Link>
              <Link href="/auth/register" className="flex-1">
                <Button className="w-full">Free Trial</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
