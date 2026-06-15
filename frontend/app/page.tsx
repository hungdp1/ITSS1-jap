import Image from "next/image";
import Header from "@/components/layouts/Header-1";
import Footer from "@/components/layouts/Footer";
import HeroSection from "@/components/pages/home/HeroSection";
import MissionSection from "@/components/pages/home/MissionSection";
import EventsSection from "@/components/pages/home/EventsSection";
import StatsSection from "@/components/pages/home/StatsSection";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F6FAF8] font-sans">
      <Header />
      <main className="flex-1 w-full max-w-7xl mt-18 flex flex-col items-center p-12 gap-16 mx-auto sm:items-start">
        <HeroSection />
        <MissionSection />
        <EventsSection />
        <StatsSection />
      </main>
      <Footer />
    </div>
  );
}