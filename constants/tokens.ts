export interface Token {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  logo: string;
}

export const SOLANA_DEVNET_TOKENS: Token[] = [
  {
    symbol: 'SOL',
    name: 'Solana',
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    logo: '◎',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    mint: '4zMMC9srt5Ri5XoGcrwQ45rJQpeKfKaZLMcZFDuwTf7E',
    decimals: 6,
    logo: '$',
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    mint: 'Es9vMFrzaCVCmSRJYQ6k4WfM6RfxfYQhW7M6Y82FgVHm',
    decimals: 6,
    logo: '₮',
  },
  {
    symbol: 'BONK',
    name: 'Bonk',
    mint: ' DezXAZ8z7PnrnRJjz3wgXb1R5ZtG1FBa8hDbWfsJcJWX',
    decimals: 5,
    logo: '🐕',
  },
  {
    symbol: 'JUP',
    name: 'Jupiter',
    mint: '3u5FnFPoJ7ZyZvSTabJ7UkuFDb35i6eCY9bWgBtYLDpm',
    decimals: 6,
    logo: '🪐',
  },
];

export const DEFAULT_SOL = SOLANA_DEVNET_TOKENS[0];
export const DEFAULT_USDC = SOLANA_DEVNET_TOKENS[1];
