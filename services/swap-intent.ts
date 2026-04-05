import { SOLANA_DEVNET_TOKENS, Token } from '@/constants/tokens';

export interface ParsedSwapIntent {
  amount: string;
  fromToken: Token;
  toToken: Token;
}

export interface SwapIntentResult {
  parsed: ParsedSwapIntent | null;
  error: string | null;
}

const TOKEN_ALIASES = new Map<string, Token>();

for (const token of SOLANA_DEVNET_TOKENS) {
  TOKEN_ALIASES.set(token.symbol.toLowerCase(), token);
  TOKEN_ALIASES.set(token.name.toLowerCase(), token);
}

TOKEN_ALIASES.set('usd coin', SOLANA_DEVNET_TOKENS[1]);
TOKEN_ALIASES.set('raydium', SOLANA_DEVNET_TOKENS[2]);

function findToken(rawValue: string) {
  return TOKEN_ALIASES.get(rawValue.trim().toLowerCase()) ?? null;
}

export function parseSwapIntent(input: string): SwapIntentResult {
  const normalized = input.trim().replace(/\s+/g, ' ');

  if (!normalized) {
    return { parsed: null, error: null };
  }

  const match = normalized.match(
    /^(?:swap|quote|convert)?\s*([0-9]*\.?[0-9]+)\s+([a-zA-Z ]+?)\s+(?:to|for|into)\s+([a-zA-Z ]+)$/i,
  );

  if (!match) {
    return {
      parsed: null,
      error: 'Try something like "swap 1.5 SOL to USDC".',
    };
  }

  const [, amount, fromTokenName, toTokenName] = match;
  const fromToken = findToken(fromTokenName);
  const toToken = findToken(toTokenName);

  if (!fromToken || !toToken) {
    return {
      parsed: null,
      error: 'I can only quote the devnet tokens currently listed in the app.',
    };
  }

  if (fromToken.mint === toToken.mint) {
    return {
      parsed: null,
      error: 'Choose two different tokens for the swap.',
    };
  }

  return {
    parsed: {
      amount,
      fromToken,
      toToken,
    },
    error: null,
  };
}
