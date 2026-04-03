import { useQuery } from '@tanstack/react-query';
import { useEmbeddedEthereumWallet, useEmbeddedSolanaWallet, usePrivy } from '@privy-io/expo';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getEthereumPortfolio, getSolanaPortfolio, PortfolioTokenBalance } from '@/services/portfolio';

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function TokenRow({
  token,
  accent,
}: {
  token: PortfolioTokenBalance;
  accent: string;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl border border-[#ebe4d7] bg-white px-4 py-3">
      <View className="flex-1 pr-3">
        <Text className="text-[15px] font-semibold text-[#171612]">{token.symbol}</Text>
        <Text className="mt-1 text-[13px] text-[#726d5e]">{token.name}</Text>
        <Text className="mt-1 text-[12px] text-[#9a9486]">{formatAddress(token.address)}</Text>
      </View>
      <View
        className="rounded-full px-3 py-2"
        style={{ backgroundColor: accent }}
      >
        <Text className="text-[13px] font-bold text-[#171612]">{token.amount}</Text>
      </View>
    </View>
  );
}

function WalletCard({
  title,
  network,
  address,
  nativeSymbol,
  nativeBalance,
  tokens,
  accent,
  copied,
  onCopy,
}: {
  title: string;
  network: string;
  address: string | null;
  nativeSymbol: string;
  nativeBalance: string | null;
  tokens: PortfolioTokenBalance[];
  accent: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <View className="rounded-[28px] border border-[#e0d8ca] bg-[#f8f5ed] px-5 py-5">
      <Text className="text-[12px] uppercase tracking-[2px] text-[#8c8679]">{network}</Text>
      <Text className="mt-2 text-[24px] font-bold text-[#171612]">{title}</Text>
      {address ? (
        <View className="mt-2 flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-[14px] text-[#615d51]">{address}</Text>
          <Pressable
            className="rounded-full border border-[#d4ccbb] px-3 py-1.5"
            onPress={onCopy}
          >
            <Text className="text-[12px] font-semibold text-[#3a392f]">
              {copied ? 'Copied' : 'Copy'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Text className="mt-2 text-[14px] text-[#615d51]">Wallet not available yet.</Text>
      )}

      <View className="mt-4 rounded-[22px] bg-white px-4 py-4">
        <Text className="text-[12px] uppercase tracking-[2px] text-[#8c8679]">Native</Text>
        <Text className="mt-2 text-[28px] font-bold text-[#171612]">
          {nativeBalance ?? '--'} {nativeSymbol}
        </Text>
      </View>

      <View className="mt-4 gap-3">
        <Text className="text-[12px] uppercase tracking-[2px] text-[#8c8679]">Tokens</Text>
        {tokens.length > 0 ? (
          tokens.map((token) => <TokenRow key={token.address} token={token} accent={accent} />)
        ) : (
          <View className="rounded-2xl border border-dashed border-[#ddd4c4] px-4 py-4">
            <Text className="text-[14px] text-[#726d5e]">No token balances found.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user } = usePrivy();
  const solanaWallet = useEmbeddedSolanaWallet();
  const ethereumWallet = useEmbeddedEthereumWallet();
  const solanaAddress = solanaWallet.wallets?.[0]?.address ?? null;
  const ethereumAddress = (ethereumWallet.wallets?.[0]?.address as `0x${string}` | undefined) ?? null;
  const userEmail = user?.linked_accounts.find((account) => account.type === 'email')?.address;

  const [copiedField, setCopiedField] = useState<'solana' | 'ethereum' | null>(null);

  const copyAddress = async (value: string, field: 'solana' | 'ethereum') => {
    await Clipboard.setStringAsync(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const portfolioQuery = useQuery({
    queryKey: ['portfolio', solanaAddress, ethereumAddress],
    enabled: Boolean(solanaAddress || ethereumAddress),
    queryFn: async () => {
      const [solanaData, ethereumData] = await Promise.all([
        solanaAddress ? getSolanaPortfolio(solanaAddress) : Promise.resolve(null),
        ethereumAddress ? getEthereumPortfolio(ethereumAddress) : Promise.resolve(null),
      ]);

      return {
        solana: solanaData,
        ethereum: ethereumData,
      };
    },
  });

  const loading = portfolioQuery.isLoading || portfolioQuery.isFetching;
  const error = portfolioQuery.error instanceof Error ? portfolioQuery.error.message : '';
  const solanaPortfolio = portfolioQuery.data?.solana ?? null;
  const ethereumPortfolio = portfolioQuery.data?.ethereum ?? null;

  return (
    <SafeAreaView className="flex-1 bg-[#f3f0e8]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-[28px] font-bold text-[#171612]">Profile</Text>
            <Text className="mt-2 text-[15px] leading-6 text-[#5f5b50]">
              Your embedded wallet addresses and the balances we can currently surface from Solana
              devnet and Ethereum.
            </Text>
            {userEmail ? (
            <Text className="mt-2 text-[13px] text-[#8b8578]">Signed in as {userEmail}</Text>
          ) : null}
        </View>
        <Pressable
          className="rounded-full border border-[#d4ccbb] px-4 py-2"
          onPress={() => portfolioQuery.refetch()}
        >
          <Text className="text-[13px] font-semibold text-[#3a392f]">Refresh</Text>
        </Pressable>
        </View>

        {loading ? (
          <View className="mt-10 items-center">
            <ActivityIndicator size="large" color="#171612" />
            <Text className="mt-4 text-[14px] text-[#726d5e]">Loading balances...</Text>
          </View>
        ) : null}

        {error ? (
          <View className="mt-6 rounded-2xl bg-red-50 px-4 py-4">
            <Text className="text-sm font-semibold text-red-600">{error}</Text>
          </View>
        ) : null}

        {!loading ? (
          <View className="mt-6 gap-5">
            <WalletCard
              title="Solana Wallet"
              network="Solana Devnet"
              address={solanaAddress}
              nativeSymbol="SOL"
              nativeBalance={solanaPortfolio?.nativeBalance ?? null}
              tokens={solanaPortfolio?.tokens ?? []}
              accent="#e6f4ef"
              copied={copiedField === 'solana'}
              onCopy={() => {
                if (solanaAddress) {
                  copyAddress(solanaAddress, 'solana');
                }
              }}
            />

            <WalletCard
              title="Ethereum Wallet"
              network="Ethereum Mainnet"
              address={ethereumAddress}
              nativeSymbol="ETH"
              nativeBalance={ethereumPortfolio?.nativeBalance ?? null}
              tokens={ethereumPortfolio?.tokens ?? []}
              accent="#ece9ff"
              copied={copiedField === 'ethereum'}
              onCopy={() => {
                if (ethereumAddress) {
                  copyAddress(ethereumAddress, 'ethereum');
                }
              }}
            />

            <View className="rounded-2xl border border-[#e0d8ca] bg-[#f8f5ed] px-4 py-4">
              <Text className="text-[13px] leading-6 text-[#726d5e]">
                Solana tokens are loaded directly from devnet token accounts. Ethereum ERC-20
                balances are currently discovered through Ethplorer for convenience while we keep
                the client-only setup lightweight.
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
