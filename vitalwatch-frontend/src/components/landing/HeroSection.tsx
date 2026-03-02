"use client";

import { Button } from "@/components/ui/Button";
import {
  ArrowRight,
  Activity,
  Heart,
  Shield,
  Brain,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";

export function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const nodes: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    const nodeCount = Math.min(60, Math.floor((canvas.offsetWidth * canvas.offsetHeight) / 15000));
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 1,
      });
    }

    const animate = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > w) node.vx *= -1;
        if (node.y < 0 || node.y > h) node.vy *= -1;
      });

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (dist < 180) {
            const opacity = (1 - dist / 180) * 0.08;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach((node) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(59, 130, 246, 0.4)";
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <section
      id="home"
      className="relative min-h-[100dvh] flex items-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-20 overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-50"
      />

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.08)_0%,_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(124,58,237,0.06)_0%,_transparent_50%)]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column - Copy */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeInUp}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs sm:text-sm font-medium mb-6 sm:mb-8">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span>AI-Powered Remote Patient Monitoring</span>
              </div>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-[1.1] tracking-tight"
            >
              Smarter monitoring.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400">
                Better outcomes.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-base sm:text-lg lg:text-xl text-slate-400 mb-8 sm:mb-10 leading-relaxed max-w-xl"
            >
              VytalWatch combines FDA-cleared devices with predictive AI to
              monitor patients remotely, flag risks early, and help clinical
              teams act before emergencies happen.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-10 sm:mb-12">
              <Link href="/auth/register">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 sm:px-8 shadow-xl shadow-blue-600/20 hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Start Free Trial
                </Button>
              </Link>
              <Link href="#book-demo">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-white/5 transition-all duration-300"
                >
                  Request a Demo
                </Button>
              </Link>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-500"
            >
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-500" />
                <span>HIPAA Compliant</span>
              </span>
              <span className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-blue-400" />
                <span>FDA-Cleared Devices</span>
              </span>
              <span className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-violet-400" />
                <span>AI-Powered Insights</span>
              </span>
            </motion.div>
          </motion.div>

          {/* Right column - Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/10 via-violet-600/10 to-cyan-600/10 rounded-3xl blur-2xl" />

            <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/40 overflow-hidden">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-5 py-3.5 bg-slate-900/50 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md bg-white/5 text-[11px] text-slate-500 font-mono">
                    vytalwatch.ai/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-5 space-y-3.5">
                {/* Patient header */}
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-semibold">
                      JD
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">
                        John Doe, 67
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        CHF, Hypertension, T2DM
                      </p>
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-medium">
                    Stable
                  </div>
                </div>

                {/* Vitals grid */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="p-3.5 rounded-xl bg-white/5 border border-white/5"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="h-3.5 w-3.5 text-rose-400" />
                      <span className="text-[11px] text-slate-400">
                        Heart Rate
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-white tracking-tight">
                      72{" "}
                      <span className="text-xs text-slate-500 font-normal">
                        bpm
                      </span>
                    </p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] text-emerald-400">
                        Normal
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="p-3.5 rounded-xl bg-white/5 border border-white/5"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-3.5 w-3.5 text-blue-400" />
                      <span className="text-[11px] text-slate-400">
                        Blood Pressure
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-white tracking-tight">
                      128/82
                    </p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] text-emerald-400">
                        Controlled
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="p-3.5 rounded-xl bg-white/5 border border-white/5"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-3.5 w-3.5 text-violet-400" />
                      <span className="text-[11px] text-slate-400">SpO2</span>
                    </div>
                    <p className="text-2xl font-bold text-white tracking-tight">
                      97
                      <span className="text-xs text-slate-500 font-normal">
                        %
                      </span>
                    </p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] text-emerald-400">
                        Normal
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0 }}
                    className="p-3.5 rounded-xl bg-white/5 border border-white/5"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-[11px] text-slate-400">Weight</span>
                    </div>
                    <p className="text-2xl font-bold text-white tracking-tight">
                      185{" "}
                      <span className="text-xs text-slate-500 font-normal">
                        lbs
                      </span>
                    </p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] text-emerald-400">
                        Stable
                      </span>
                    </div>
                  </motion.div>
                </div>

                {/* AI Alert */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Brain className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-blue-300 font-medium">
                      AI Insight
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      BP trending upward over 7 days. Consider medication review.
                    </p>
                  </div>
                  <div className="flex-shrink-0 px-2 py-0.5 rounded-md bg-blue-500/10 text-[10px] text-blue-400 font-medium">
                    Review
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-950 to-transparent" />
    </section>
  );
}
