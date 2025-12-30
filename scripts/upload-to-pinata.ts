/**
 * NFT IPFS Upload Script - Pinata Integration
 * 
 * Usage:
 *   npx ts-node --esm upload-to-pinata.ts
 * 
 * This script:
 * 1. Uploads all 7 NFT images to Pinata (IPFS)
 * 2. Generates OpenSea-standard metadata JSON for each tier
 * 3. Uploads metadata JSONs to Pinata
 * 4. Outputs all hashes to ipfs-output.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pinataSDK from '@pinata/sdk';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config();

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    console.error('❌ Missing PINATA_API_KEY or PINATA_SECRET_KEY environment variables');
    console.error('Usage: Add keys to .env file and run: npx ts-node --esm upload-to-pinata.ts');
    process.exit(1);
}

// Initialize Pinata client
const pinata = new pinataSDK(PINATA_API_KEY, PINATA_SECRET_KEY);

// NFT Tier Data (matching whitepaper values)
const NFT_TIERS = [
    {
        id: 0,
        name: 'The Shovel of the Commoner Miner',
        shortName: 'Free',
        description: 'Tier 1 Free NFT - A humble shovel for the aspiring miner. Mines 100 FIAPO tokens daily for 112 days.',
        price: 0,
        dailyMining: 100,
        totalMining: 11_200,
        miningDays: 112,
        rarity: 'Common',
        imageFile: 'tier1-free.png',
    },
    {
        id: 1,
        name: 'The Pickaxe of the Royal Guard',
        shortName: 'Bronze',
        description: 'Tier 2 Bronze NFT - A sturdy pickaxe forged for the Royal Guard. Mines 500 FIAPO tokens daily for 112 days.',
        price: 10,
        dailyMining: 500,
        totalMining: 56_000,
        miningDays: 112,
        rarity: 'Uncommon',
        imageFile: 'tier2-bronze.png',
    },
    {
        id: 2,
        name: 'The Candelabrum of the Explorer',
        shortName: 'Silver',
        description: 'Tier 3 Silver NFT - An ornate candelabrum to light the path of fortune. Mines 1,500 FIAPO tokens daily for 112 days.',
        price: 30,
        dailyMining: 1_500,
        totalMining: 168_000,
        miningDays: 112,
        rarity: 'Rare',
        imageFile: 'tier3-silver.png',
    },
    {
        id: 3,
        name: "The Power to Unlock Kingdom's Wealth",
        shortName: 'Gold',
        description: 'Tier 4 Gold NFT - A mystical key that unlocks the treasures of the kingdom. Mines 3,000 FIAPO tokens daily for 112 days.',
        price: 55,
        dailyMining: 3_000,
        totalMining: 336_000,
        miningDays: 112,
        rarity: 'Epic',
        imageFile: 'tier4-gold.png',
    },
    {
        id: 4,
        name: 'The Royal Treasure Map',
        shortName: 'Platinum',
        description: 'Tier 5 Platinum NFT - An ancient map revealing hidden riches. Mines 6,000 FIAPO tokens daily for 112 days.',
        price: 100,
        dailyMining: 6_000,
        totalMining: 672_000,
        miningDays: 112,
        rarity: 'Epic',
        imageFile: 'tier5-platinum.png',
    },
    {
        id: 5,
        name: 'The Golden Mango Eye',
        shortName: 'Diamond',
        description: 'Tier 6 Diamond NFT - A legendary artifact with the all-seeing eye. Mines 15,000 FIAPO tokens daily for 112 days.',
        price: 250,
        dailyMining: 15_000,
        totalMining: 1_680_000,
        miningDays: 112,
        rarity: 'Legendary',
        imageFile: 'tier6-diamond.png',
    },
    {
        id: 6,
        name: 'The Royal Scepter of Don Himself',
        shortName: 'Royal',
        description: 'Tier 7 Royal NFT - The ultimate symbol of power wielded by Don Fiapo himself. Mines 35,000 FIAPO tokens daily for 112 days.',
        price: 500,
        dailyMining: 35_000,
        totalMining: 3_920_000,
        miningDays: 112,
        rarity: 'Mythic',
        imageFile: 'tier7-royal.png',
    },
];

const IMAGES_DIR = path.join(__dirname, '../don-fiapo-web/public/nfts');
const OUTPUT_FILE = path.join(__dirname, 'ipfs-output.json');

interface IPFSOutput {
    timestamp: string;
    tiers: {
        id: number;
        name: string;
        imageHash: string;
        imageUrl: string;
        metadataHash: string;
        metadataUrl: string;
    }[];
}

/**
 * Generate OpenSea-standard metadata
 */
function generateMetadata(tier: typeof NFT_TIERS[0], imageHash: string): object {
    return {
        name: tier.name,
        description: tier.description,
        image: `ipfs://${imageHash}`,
        external_url: `https://donfiapocoin.com/nft/${tier.shortName.toLowerCase()}`,
        attributes: [
            { trait_type: 'Tier', value: tier.shortName },
            { trait_type: 'Rarity', value: tier.rarity },
            { trait_type: 'Daily Mining', value: tier.dailyMining, display_type: 'number' },
            { trait_type: 'Total Mining', value: tier.totalMining, display_type: 'number' },
            { trait_type: 'Mining Period (Days)', value: tier.miningDays, display_type: 'number' },
            { trait_type: 'Price USD', value: tier.price, display_type: 'number' },
        ],
    };
}

/**
 * Main upload function
 */
async function main() {
    console.log('🚀 Starting NFT IPFS Upload to Pinata\n');

    // Test Pinata connection
    try {
        await pinata.testAuthentication();
        console.log('✅ Pinata authentication successful!\n');
    } catch (err) {
        console.error('❌ Pinata authentication failed:', err);
        process.exit(1);
    }

    const output: IPFSOutput = {
        timestamp: new Date().toISOString(),
        tiers: [],
    };

    for (const tier of NFT_TIERS) {
        console.log(`📦 Processing Tier ${tier.id}: ${tier.name}`);

        // 1. Upload image
        const imagePath = path.join(IMAGES_DIR, tier.imageFile);
        if (!fs.existsSync(imagePath)) {
            console.error(`   ❌ Image not found: ${imagePath}`);
            continue;
        }

        console.log(`   📸 Uploading image...`);
        const readableStream = fs.createReadStream(imagePath);
        const imageResult = await pinata.pinFileToIPFS(readableStream, {
            pinataMetadata: { name: `DonFiapo-NFT-${tier.shortName}-Image` },
            pinataOptions: { cidVersion: 1 },
        });
        console.log(`   ✅ Image uploaded: ${imageResult.IpfsHash}`);

        // 2. Generate and upload metadata
        const metadata = generateMetadata(tier, imageResult.IpfsHash);
        console.log(`   📝 Uploading metadata...`);
        const metadataResult = await pinata.pinJSONToIPFS(metadata, {
            pinataMetadata: { name: `DonFiapo-NFT-${tier.shortName}-Metadata` },
            pinataOptions: { cidVersion: 1 },
        });
        console.log(`   ✅ Metadata uploaded: ${metadataResult.IpfsHash}`);

        output.tiers.push({
            id: tier.id,
            name: tier.name,
            imageHash: imageResult.IpfsHash,
            imageUrl: `https://gateway.pinata.cloud/ipfs/${imageResult.IpfsHash}`,
            metadataHash: metadataResult.IpfsHash,
            metadataUrl: `https://gateway.pinata.cloud/ipfs/${metadataResult.IpfsHash}`,
        });

        console.log('');
    }

    // Save output
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`\n✅ All uploads complete!`);
    console.log(`📄 Output saved to: ${OUTPUT_FILE}`);

    // Print summary
    console.log('\n📋 Summary:');
    console.log('─'.repeat(80));
    for (const tier of output.tiers) {
        console.log(`Tier ${tier.id}: ${tier.name}`);
        console.log(`  Image:    ipfs://${tier.imageHash}`);
        console.log(`  Metadata: ipfs://${tier.metadataHash}`);
    }
    console.log('─'.repeat(80));

    // Generate code snippets
    console.log('\n📝 Code to update in config.ts:\n');
    console.log('nftTiers: [');
    for (const tier of output.tiers) {
        const t = NFT_TIERS[tier.id];
        console.log(`  { id: ${tier.id}, name: '${t.name}', ipfsImage: 'ipfs://${tier.imageHash}', ipfsMetadata: 'ipfs://${tier.metadataHash}' },`);
    }
    console.log(']');
}

main().catch(console.error);
