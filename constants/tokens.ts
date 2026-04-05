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
    name: 'USD Coin (Devnet)',
    mint: 'USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT',
    decimals: 6,
    logo: '$',
  },
  {
    symbol: 'RAY',
    name: 'Raydium (Devnet)',
    mint: 'DRay3aNHKdjZ4P4DoRnyxdKh6jBrf4HpjfDkQF7MFPpR',
    decimals: 6,
    logo: '☀',
  },
];

export const DEFAULT_SOL = SOLANA_DEVNET_TOKENS[0];
export const DEFAULT_USDC = SOLANA_DEVNET_TOKENS[1];
