import { VersionedTransaction } from '@solana/web3.js';

const JUPITER_API = 'https://quote-api.jup.ag/v6';

export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: Array<{ swapInfo: { ammKey: string; label?: string; inputMint: string; outputMint: string; inAmount: string; outAmount: string; feeAmount: string; feeMint: string } }>;
  contextSlot?: number;
  timeTaken?: number;
}

export interface JupiterSwapResult {
  signature: string;
}

export async function getQuote(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps: number = 300,
): Promise<JupiterQuote> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount,
    slippageBps: slippageBps.toString(),
  });

  const res = await fetch(`${JUPITER_API}/quote?${params}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Quote failed: ${err}`);
  }

  return res.json();
}

export async function getSwapTransaction(
  quoteResponse: JupiterQuote,
  userPublicKey: string,
): Promise<Buffer> {
  const res = await fetch(`${JUPITER_API}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Swap tx failed: ${err}`);
  }

  const { swapTransaction } = await res.json();
  return Buffer.from(swapTransaction, 'base64');
}

export function deserializeTransaction(transactionBuf: Buffer): VersionedTransaction {
  const tx = VersionedTransaction.deserialize(new Uint8Array(transactionBuf));
  return tx;
}
