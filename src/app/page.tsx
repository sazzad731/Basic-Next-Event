import { EventsSection } from "@/components/pages/home/EventsSection";
import HeroSection from "@/components/pages/home/HeroSection";
import { ServiceSection } from "@/components/pages/home/ServiceSection";
import { SubscribeSection } from "@/components/pages/home/SubscribeSection";
import { TestimonialSection } from "@/components/pages/home/TestimonialSection";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <ServiceSection />
      <EventsSection />
      <TestimonialSection />
      <SubscribeSection />
    </div>
  );
}
