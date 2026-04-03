import BN from 'bn.js';
import { Percentage, ReadOnlyWallet } from '@orca-so/common-sdk';
import {
  buildWhirlpoolClient,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  swapQuoteByInputToken,
  WhirlpoolContext,
} from '@orca-so/whirlpools-sdk';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';

const SOLANA_RPC = 'https://api.devnet.solana.com';
const DEFAULT_SLIPPAGE_BPS = 300;
const READ_ONLY_WALLET = '11111111111111111111111111111111';

type SupportedPool = {
  label: string;
  poolAddress: string;
  tokenA: string;
  tokenB: string;
};

const SUPPORTED_POOLS: SupportedPool[] = [
  {
    label: 'Orca SOL / devUSDC',
    poolAddress: '3KBZiL2g8C7tiJ32hTv5v3KM7aK9htpqTw4cTXz1HvPt',
    tokenA: 'So11111111111111111111111111111111111111112',
    tokenB: 'BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k',
  },
  {
    label: 'Orca devUSDC / devUSDT',
    poolAddress: '63cMwvN8eoaD39os9bKP8brmA7Xtov9VxahnPufWCSdg',
    tokenA: 'BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k',
    tokenB: 'H8UekPGwePSmQ3ttuYGPU1szyFfjZR4N53rymSFwpLPm',
  },
];

export interface OrcaQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  slippageBps: number;
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
  poolAddress: string;
  poolLabel: string;
  estimatedFeeAmount: string;
}

function getSupportedPool(inputMint: string, outputMint: string) {
  return (
    SUPPORTED_POOLS.find(
      (pool) =>
        (pool.tokenA === inputMint && pool.tokenB === outputMint) ||
        (pool.tokenA === outputMint && pool.tokenB === inputMint),
    ) ?? null
  );
}

function createOrcaContext(walletAddress: string) {
  const connection = new Connection(SOLANA_RPC, 'confirmed');
  const wallet = new ReadOnlyWallet(new PublicKey(walletAddress));
  return WhirlpoolContext.from(connection, wallet);
}

export async function getQuote(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps: number = DEFAULT_SLIPPAGE_BPS,
): Promise<OrcaQuote> {
  const supportedPool = getSupportedPool(inputMint, outputMint);

  if (!supportedPool) {
    throw new Error('UNSUPPORTED_PAIR');
  }

  const ctx = createOrcaContext(READ_ONLY_WALLET);
  const client = buildWhirlpoolClient(ctx);
  const whirlpool = await client.getPool(supportedPool.poolAddress);
  const quote = await swapQuoteByInputToken(
    whirlpool,
    inputMint,
    new BN(amount),
    Percentage.fromFraction(slippageBps, 10_000),
    ORCA_WHIRLPOOL_PROGRAM_ID,
    ctx.fetcher,
  );

  return {
    inputMint,
    outputMint,
    inAmount: amount,
    outAmount: quote.estimatedAmountOut.toString(),
    otherAmountThreshold: quote.otherAmountThreshold.toString(),
    slippageBps,
    poolAddress: supportedPool.poolAddress,
    poolLabel: supportedPool.label,
    estimatedFeeAmount: quote.estimatedFeeAmount.toString(),
    routePlan: [
      {
        swapInfo: {
          ammKey: supportedPool.poolAddress,
          label: supportedPool.label,
          inputMint,
          outputMint,
          inAmount: amount,
          outAmount: quote.estimatedAmountOut.toString(),
          feeAmount: quote.estimatedFeeAmount.toString(),
          feeMint: inputMint,
        },
      },
    ],
  };
}

export async function getSwapTransaction(
  quoteResponse: OrcaQuote,
  userPublicKey: string,
): Promise<Transaction> {
  const ctx = createOrcaContext(userPublicKey);
  const client = buildWhirlpoolClient(ctx);
  const whirlpool = await client.getPool(quoteResponse.poolAddress);
  const quote = await swapQuoteByInputToken(
    whirlpool,
    quoteResponse.inputMint,
    new BN(quoteResponse.inAmount),
    Percentage.fromFraction(quoteResponse.slippageBps, 10_000),
    ORCA_WHIRLPOOL_PROGRAM_ID,
    ctx.fetcher,
  );

  const txBuilder = await whirlpool.swap(quote, new PublicKey(userPublicKey));
  const payload = await txBuilder.build({ maxSupportedTransactionVersion: 'legacy' });

  if (!(payload.transaction instanceof Transaction)) {
    throw new Error('Expected a legacy transaction from Orca.');
  }

  return payload.transaction;
}
