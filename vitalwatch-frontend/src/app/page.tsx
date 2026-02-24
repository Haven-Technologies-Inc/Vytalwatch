import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { AboutSection } from "@/components/landing/AboutSection";
import { WhyChooseSection } from "@/components/landing/WhyChooseSection";
import { UseCasesSection } from "@/components/landing/UseCasesSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { BookDemoSection } from "@/components/landing/BookDemoSection";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <AboutSection />
        <WhyChooseSection />
        <UseCasesSection />
        <PricingSection />
        <FAQSection />
        <BookDemoSection />
      </main>
      <Footer />
    </div>
  );
}
