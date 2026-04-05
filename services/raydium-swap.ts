import {
  Connection,
  PublicKey,
  VersionedTransaction,
} from '@solana/web3.js';

export interface WalletAdapter {
  publicKey: PublicKey;
  signTransaction<T extends VersionedTransaction>(tx: T): Promise<T>;
}

export interface SwapConfig {
  inputMint: string;
  outputMint: string;
  inputDecimals: number;
  outputDecimals: number;
  amount: number;
  slippageBps: number;
  txVersion: 'V0' | 'LEGACY';
  computeUnitPriceMicroLamports: string;
}

export interface SwapResult {
  signature: string;
  inputAmount: string;
  outputAmount: string;
  priceImpactPct: number;
  explorerUrl: string;
}

export interface RaydiumQuote {
  success: boolean;
  data: {
    inputMint: string;
    outputMint: string;
    inputAmount: string;
    outputAmount: string;
    otherAmountThreshold: string;
    priceImpactPct: number;
    routePlan: Array<{
      swapInfo: {
        ammKey: string;
        label?: string;
        inputMint: string;
        outputMint: string;
        inAmount: string;
        outAmount: string;
        feeAmount: string;
        feeMint: string;
      };
    }>;
  };
  msg?: string;
}

export const RAYDIUM_HOSTS = {
  devnet: 'https://transaction-v1-devnet.raydium.io',
  mainnet: 'https://transaction-v1.raydium.io',
};

function toBaseUnits(amount: number, decimals: number): string {
  return String(Math.round(amount * 10 ** decimals));
}

function fromBaseUnits(baseUnits: string, decimals: number): number {
  return Number(baseUnits) / 10 ** decimals;
}

export async function fetchQuote(
  raydiumHost: string,
  inputMint: string,
  outputMint: string,
  amount: number,
  inputDecimals: number,
  slippageBps: number,
  txVersion: 'V0' | 'LEGACY' = 'V0',
): Promise<RaydiumQuote> {
  const baseUnits = toBaseUnits(amount, inputDecimals);

  const url = new URL(`${raydiumHost}/compute/swap-base-in`);
  url.searchParams.set('inputMint', inputMint);
  url.searchParams.set('outputMint', outputMint);
  url.searchParams.set('amount', baseUnits);
  url.searchParams.set('slippageBps', String(slippageBps));
  url.searchParams.set('txVersion', txVersion);

  const response = await fetch(url.toString());
  const data: RaydiumQuote = await response.json();

  if (!data.success) {
    throw new Error(`Quote failed: ${data.msg ?? 'Unknown error'}`);
  }

  return data;
}

export async function buildTransaction(
  raydiumHost: string,
  quote: RaydiumQuote,
  walletPubkey: string,
  txVersion: 'V0' | 'LEGACY' = 'V0',
  computeUnitPriceMicroLamports: string = '465840',
): Promise<string[]> {
  const response = await fetch(`${raydiumHost}/transaction/swap-base-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      swapResponse: quote,
      wallet: walletPubkey,
      txVersion,
      wrapSol: true,
      unwrapSol: true,
      computeUnitPriceMicroLamports,
    }),
  });

  const data: any = await response.json();

  if (!data.success) {
    throw new Error(`Transaction build failed: ${data.msg ?? 'Unknown error'}`);
  }

  return data.data.map((d: any) => d.transaction as string);
}

export async function executeSwap(
  connection: Connection,
  raydiumHost: string,
  wallet: WalletAdapter,
  config: SwapConfig,
): Promise<SwapResult> {
  const quote = await fetchQuote(
    raydiumHost,
    config.inputMint,
    config.outputMint,
    config.amount,
    config.inputDecimals,
    config.slippageBps,
    config.txVersion,
  );

  const base64Txs = await buildTransaction(
    raydiumHost,
    quote,
    wallet.publicKey.toString(),
    config.txVersion,
    config.computeUnitPriceMicroLamports,
  );

  let lastSignature = '';

  for (const base64Tx of base64Txs) {
    const txBuffer = Buffer.from(base64Tx, 'base64');
    const transaction = VersionedTransaction.deserialize(txBuffer);

    const signedTx = await wallet.signTransaction(transaction);

    const signature = await connection.sendRawTransaction(
      signedTx.serialize(),
      {
        skipPreflight: false,
        maxRetries: 3,
      },
    );

    const latestBlockhash = await connection.getLatestBlockhash();
    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      'confirmed',
    );

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    lastSignature = signature;
  }

  const cluster = raydiumHost.includes('devnet') ? 'devnet' : 'mainnet';

  return {
    signature: lastSignature,
    inputAmount: toBaseUnits(config.amount, config.inputDecimals),
    outputAmount: quote.data.outputAmount,
    priceImpactPct: quote.data.priceImpactPct,
    explorerUrl: `https://explorer.solana.com/tx/${lastSignature}?cluster=${cluster}`,
  };
}
