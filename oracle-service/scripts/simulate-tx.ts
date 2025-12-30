import fetch from 'node-fetch';

const ORACLE_URL = process.env.ORACLE_URL || 'http://localhost:3000';
const API_KEY = process.env.ORACLE_API_KEY || 'dev-secret-key';
const MOCK_PAYMENT_ID = process.argv[2] || 'PAY_MOCK_123';

async function main() {
    console.log(`🚀 Simulating Payment Confirmation for ID: ${MOCK_PAYMENT_ID}`);
    console.log(`   Target: ${ORACLE_URL}`);

    try {
        const response = await fetch(`${ORACLE_URL}/api/debug/simulate-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY,
            },
            body: JSON.stringify({
                paymentId: MOCK_PAYMENT_ID,
                txHash: `mock_tx_${Date.now()}`
            }),
        });

        const data = await response.json();
        console.log('Response:', response.status, data);

        if (response.ok) {
            console.log('✅ Payment Successfully Simulated!');
        } else {
            console.log('❌ Failed to simulate payment.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main();
