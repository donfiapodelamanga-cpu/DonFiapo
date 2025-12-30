import { 
  HeroSection, 
  TokenomicsSection, 
  SupplyInfoSection,
  StakingTiersSection,
  FeeStructureSection,
  RewardsSystemSection,
  RoadmapSection, 
  StakingPreviewSection, 
  CTASection 
} from "@/components/sections";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TokenomicsSection />
      <SupplyInfoSection />
      <StakingTiersSection />
      <FeeStructureSection />
      <RewardsSystemSection />
      <RoadmapSection />
      <StakingPreviewSection />
      <CTASection />
    </>
  );
}
