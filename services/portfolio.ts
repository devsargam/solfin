import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { createPublicClient, formatEther, formatUnits, http } from 'viem';
import { mainnet } from 'viem/chains';

import { SOLANA_DEVNET_TOKENS } from '@/constants/tokens';

const SOLANA_RPC = 'https://api.devnet.solana.com';
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ETHPLORER_BASE_URL = 'https://api.ethplorer.io';

const ethereumClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const knownSolanaTokens = new Map(
  SOLANA_DEVNET_TOKENS.map((token) => [token.mint, { symbol: token.symbol, name: token.name }]),
);

export interface PortfolioTokenBalance {
  symbol: string;
  name: string;
  amount: string;
  address: string;
  logo?: string | null;
}

export interface SolanaPortfolio {
  nativeBalance: string;
  tokens: PortfolioTokenBalance[];
}

export interface EthereumPortfolio {
  nativeBalance: string;
  tokens: PortfolioTokenBalance[];
}

function shortenTokenAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export async function getSolanaPortfolio(address: string): Promise<SolanaPortfolio> {
  const connection = new Connection(SOLANA_RPC, 'confirmed');
  const owner = new PublicKey(address);

  const [nativeBalanceLamports, tokenAccounts] = await Promise.all([
    connection.getBalance(owner),
    connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }),
  ]);

  const tokens = tokenAccounts.value
    .map((account) => {
      const parsedInfo = account.account.data.parsed.info;
      const tokenAmount = parsedInfo.tokenAmount;
      const uiAmount = Number(tokenAmount.uiAmount ?? 0);

      if (uiAmount <= 0) {
        return null;
      }

      const mint = parsedInfo.mint as string;
      const knownToken = knownSolanaTokens.get(mint);

      return {
        symbol: knownToken?.symbol ?? shortenTokenAddress(mint),
        name: knownToken?.name ?? 'Unknown SPL token',
        amount: tokenAmount.uiAmountString ?? uiAmount.toString(),
        address: mint,
        logo: null,
      };
    })
    .filter((token): token is PortfolioTokenBalance => token !== null)
    .sort((a, b) => Number(b.amount) - Number(a.amount));

  return {
    nativeBalance: Number(nativeBalanceLamports / LAMPORTS_PER_SOL).toFixed(4),
    tokens,
  };
}

interface EthplorerTokenInfo {
  address: string;
  decimals?: string;
  name?: string;
  symbol?: string;
  image?: string;
}

interface EthplorerTokenBalance {
  balance: string;
  tokenInfo: EthplorerTokenInfo;
}

interface EthplorerAddressInfo {
  tokens?: EthplorerTokenBalance[];
}

export async function getEthereumPortfolio(address: `0x${string}`): Promise<EthereumPortfolio> {
  const [nativeBalanceWei, tokenResponse] = await Promise.all([
    ethereumClient.getBalance({ address }),
    fetch(`${ETHPLORER_BASE_URL}/getAddressInfo/${address}?apiKey=freekey`),
  ]);

  let tokens: PortfolioTokenBalance[] = [];

  if (tokenResponse.ok) {
    const data = (await tokenResponse.json()) as EthplorerAddressInfo;
    tokens = (data.tokens ?? [])
      .map((token) => {
        const decimals = Number(token.tokenInfo.decimals ?? 0);
        const formattedAmount = formatUnits(BigInt(token.balance), decimals);

        if (Number(formattedAmount) <= 0) {
          return null;
        }

        return {
          symbol: token.tokenInfo.symbol ?? shortenTokenAddress(token.tokenInfo.address),
          name: token.tokenInfo.name ?? 'ERC-20 token',
          amount: formattedAmount,
          address: token.tokenInfo.address,
          logo: token.tokenInfo.image
            ? `${ETHPLORER_BASE_URL}/${token.tokenInfo.image.replace(/^\/+/, '')}`
            : null,
        };
      })
      .filter((token): token is PortfolioTokenBalance => token !== null)
      .sort((a, b) => Number(b.amount) - Number(a.amount));
  }

  return {
    nativeBalance: Number(formatEther(nativeBalanceWei)).toFixed(6),
    tokens,
  };
}
