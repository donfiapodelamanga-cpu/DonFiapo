import {
  HeroSection,
  TokenomicsSection,
  SupplyInfoSection,
  NFTEvolutionSection,
  StakingTiersSection,
  FeeStructureSection,
  RewardsSystemSection,
  RoadmapSection,
  StakingPreviewSection,
  CTASection,
  MiningBanner
} from "@/components/sections";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <MiningBanner />
      <TokenomicsSection />
      <SupplyInfoSection />
      <NFTEvolutionSection />
      <StakingTiersSection />
      <FeeStructureSection />
      <RewardsSystemSection />
      <RoadmapSection />
      <StakingPreviewSection />
      <CTASection />
    </>
  );
}

