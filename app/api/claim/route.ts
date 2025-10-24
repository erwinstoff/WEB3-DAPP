import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'claims.json');

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}));
  } catch (e) {
    console.warn('[claims API] could not ensure data file', e);
  }
}

function readClaims(): Record<string, any> {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    console.warn('[claims API] read failed', e);
    return {};
  }
}

function writeClaims(data: Record<string, any>) {
  try {
    ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn('[claims API] write failed', e);
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const addressRaw = url.searchParams.get('address');
    if (!addressRaw) return NextResponse.json({ error: 'missing address' }, { status: 400 });

    // Accept formats like `0xabc...` or `0xabc...:1` (address:chain)
    const normalizedAddress = (() => {
      const parts = addressRaw.split(':');
      return parts[0].trim().toLowerCase();
    })();

    if (!normalizedAddress || !normalizedAddress.startsWith('0x')) {
      return NextResponse.json({ error: 'invalid address' }, { status: 400 });
    }

    const claims = readClaims();
    const rec = claims[normalizedAddress];
    // Return 200 with found:false rather than 404 to avoid browser console errors
    if (!rec) return NextResponse.json({ found: false }, { status: 200 });

    return NextResponse.json({ found: true, record: rec.record }, { status: 200 });
  } catch (e) {
    console.error('[claims API] GET error', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { record, signature } = body || {};
    if (!record || !signature || !record.address) return NextResponse.json({ error: 'invalid payload' }, { status: 400 });

    // Verify signature: signer must equal record.address
    const message = JSON.stringify(record);
    let signer: string;
    try {
      signer = ethers.verifyMessage(message, signature);
    } catch (e) {
      console.warn('[claims API] signature verify failed', e);
      return NextResponse.json({ error: 'invalid signature' }, { status: 403 });
    }

    if (signer.toLowerCase() !== record.address.toLowerCase()) {
      return NextResponse.json({ error: 'signature mismatch' }, { status: 403 });
    }

    const claims = readClaims();
    claims[record.address.toLowerCase()] = { record, signature, savedAt: Date.now() };
    writeClaims(claims);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('[claims API] POST error', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
