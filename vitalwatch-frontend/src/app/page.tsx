import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { SocialProofBar } from "@/components/landing/SocialProofBar";
import { EvidenceSection } from "@/components/landing/EvidenceSection";
import { PlatformSection } from "@/components/landing/PlatformSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { UseCasesSection } from "@/components/landing/UseCasesSection";
import { SecuritySection } from "@/components/landing/SecuritySection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { BookDemoSection } from "@/components/landing/BookDemoSection";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main>
        <HeroSection />
        <SocialProofBar />
        <EvidenceSection />
        <PlatformSection />
        <HowItWorksSection />
        <UseCasesSection />
        <SecuritySection />
        <PricingSection />
        <FAQSection />
        <BookDemoSection />
      </main>
      <Footer />
    </div>
  );
}
