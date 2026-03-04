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
  MiningBanner,
  ExchangeListingsSection
} from "@/components/sections";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <MiningBanner />
      <ExchangeListingsSection />
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

