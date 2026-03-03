"use client";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Activity, Heart, Shield } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const nodes: { x: number; y: number; vx: number; vy: number }[] = [];
    for (let i = 0; i < 50; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;
      });
      nodes.forEach((a, i) => {
        nodes.slice(i + 1).forEach((b) => {
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.15 - dist / 1000})`;
            ctx.stroke();
          }
        });
        ctx.beginPath();
        ctx.arc(a.x, a.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(59, 130, 246, 0.6)";
        ctx.fill();
      });
      requestAnimationFrame(animate);
    };
    animate();

    return () => window.removeEventListener("resize", resize);
  }, [isMounted]);

  return (
    <section id="home" className="relative min-h-screen flex items-center bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 pt-20 overflow-hidden">
      {isMounted && <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />}
      {!isMounted && <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem]" />}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm mb-6">
              <Activity className="h-4 w-4" />
              <span>AI-Powered Healthcare Platform</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              The Future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Remote Patient Monitoring</span>
            </h1>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              Harness the power of AI to predict health risks before they become emergencies. Reduce hospital readmissions by 40% with real-time monitoring and intelligent alerts.
            </p>
            <div className="flex flex-wrap gap-4 mb-10">
              <Link href="/auth/register">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white px-8" rightIcon={<ArrowRight className="h-5 w-5" />}>
                  Start Free Trial
                </Button>
              </Link>
              <Link href="#book-demo">
                <Button size="lg" variant="outline" className="border-slate-600 text-white hover:bg-slate-800">
                  Book a Demo
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-emerald-500" />HIPAA Compliant</span>
              <span className="flex items-center gap-2"><Heart className="h-4 w-4 text-red-500" />FDA Approved</span>
            </div>
          </div>
          
          <div className="hidden lg:block relative">
            <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-slate-400 text-sm ml-2">Patient Monitoring Dashboard</span>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                      <Heart className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Heart Rate</p>
                      <p className="text-slate-400 text-sm">Real-time monitoring</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-400">72 <span className="text-sm">BPM</span></p>
                    <p className="text-xs text-emerald-400">Normal</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Blood Pressure</p>
                      <p className="text-slate-400 text-sm">AI prediction active</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-400">120/80</p>
                    <p className="text-xs text-blue-400">Optimal</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center animate-pulse">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">AI Alert</p>
                      <p className="text-amber-400 text-sm">Weight trend detected</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-amber-400">+3 lbs</p>
                    <p className="text-xs text-amber-400">Review needed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
