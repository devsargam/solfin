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
    mint: 'BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k',
    decimals: 6,
    logo: '$',
  },
  {
    symbol: 'USDT',
    name: 'Tether USD (Devnet)',
    mint: 'H8UekPGwePSmQ3ttuYGPU1szyFfjZR4N53rymSFwpLPm',
    decimals: 6,
    logo: '₮',
  },
];

export const DEFAULT_SOL = SOLANA_DEVNET_TOKENS[0];
export const DEFAULT_USDC = SOLANA_DEVNET_TOKENS[1];
