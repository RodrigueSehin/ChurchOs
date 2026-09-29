import type { plans as plansTable } from "@/lib/db/schema";
import { MarketingNav } from "@/features/marketing/components/marketing-nav";
import { HeroSection } from "@/features/marketing/components/hero-section";
import { ModuleBadges } from "@/features/marketing/components/module-badges";
import { FeatureShowcase } from "@/features/marketing/components/feature-showcase";
import { WhyChooseUs } from "@/features/marketing/components/why-choose-us";
import { PricingSection } from "@/features/marketing/components/pricing-section";
import { TestimonialsSection } from "@/features/marketing/components/testimonials-section";
import { FaqSection } from "@/features/marketing/components/faq-section";
import { CtaBanner } from "@/features/marketing/components/cta-banner";
import { MarketingFooter } from "@/features/marketing/components/marketing-footer";

type Plan = typeof plansTable.$inferSelect;

export function LandingPage({ plans }: { plans: Plan[] }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <MarketingNav />
      <main>
        <HeroSection />
        <ModuleBadges />
        <FeatureShowcase />
        <WhyChooseUs />
        <PricingSection plans={plans} />
        <TestimonialsSection />
        <FaqSection />
        <CtaBanner />
      </main>
      <MarketingFooter />
    </div>
  );
}
