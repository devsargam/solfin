import { useEmbeddedSolanaWallet, usePrivy } from "@privy-io/expo";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MetaRow } from "@/components/swap/meta-row";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getSolanaPortfolio } from "@/services/portfolio";
import {
  executeSwap,
  fetchQuote,
  RAYDIUM_HOSTS,
  RaydiumQuote,
} from "@/services/raydium-swap";
import { parseSwapIntent } from "@/services/swap-intent";

const SOLANA_RPC = "https://api.devnet.solana.com";
const DEFAULT_PROMPT = "swap 1 SOL to USDC";

type SwapExecutionState = "idle" | "confirming" | "success";

function getSwapErrorMessage({
  walletAddress,
  parseError,
  quoteError,
  executeError,
}: {
  walletAddress: string | null;
  parseError: string | null;
  quoteError: string;
  executeError: string;
}) {
  if (!walletAddress) {
    return "Connect to your embedded Solana wallet to preview swaps.";
  }

  if (parseError) {
    return parseError;
  }

  return executeError || quoteError;
}

export default function HomeScreen() {
  const { user, logout } = usePrivy();
  const solanaWallet = useEmbeddedSolanaWallet();
  const walletAddress = solanaWallet.wallets?.[0]?.address ?? null;

  const [intent, setIntent] = useState(DEFAULT_PROMPT);
  const debouncedIntent = useDebouncedValue(intent, 450);
  const [executionState, setExecutionState] =
    useState<SwapExecutionState>("idle");
  const [executeError, setExecuteError] = useState("");
  const [txSignature, setTxSignature] = useState("");
  const [txExplorerUrl, setTxExplorerUrl] = useState("");
  const [copiedWallet, setCopiedWallet] = useState(false);

  const { parsed, error: parseError } = parseSwapIntent(debouncedIntent);
  const userEmail = user?.linked_accounts.find(
    (account) => account.type === "email",
  )?.address;

  const quoteQuery = useQuery<RaydiumQuote>({
    queryKey: [
      "raydium-quote",
      parsed?.fromToken.mint,
      parsed?.toToken.mint,
      parsed?.amount,
    ],
    enabled: Boolean(parsed && !parseError),
    queryFn: async () => {
      if (!parsed) {
        throw new Error("Missing parsed swap intent.");
      }

      return fetchQuote(
        RAYDIUM_HOSTS.devnet,
        parsed.fromToken.mint,
        parsed.toToken.mint,
        parseFloat(parsed.amount),
        parsed.fromToken.decimals,
        100,
      );
    },
  });

  const quote = quoteQuery.data ?? null;

  const balanceQuery = useQuery({
    queryKey: ["solana-balance", walletAddress],
    enabled: Boolean(walletAddress),
    queryFn: () => getSolanaPortfolio(walletAddress!),
    refetchInterval: 15_000,
  });

  const devnetBalance = balanceQuery.data?.nativeBalance ?? null;

  const outputAmount =
    quote && parsed
      ? (
          Number(quote.data.outputAmount) /
          10 ** parsed.toToken.decimals
        ).toFixed(Math.min(parsed.toToken.decimals, 4))
      : "";

  const minReceived =
    quote && parsed
      ? `${(
          Number(quote.data.otherAmountThreshold) /
          10 ** parsed.toToken.decimals
        ).toFixed(
          Math.min(parsed.toToken.decimals, 4),
        )} ${parsed.toToken.symbol}`
      : "-";

  const priceImpact = quote ? `${quote.data.priceImpactPct.toFixed(2)}%` : "-";

  const quoteError =
    quoteQuery.error instanceof Error ? quoteQuery.error.message : "";
  const errorMsg = getSwapErrorMessage({
    walletAddress,
    parseError,
    quoteError,
    executeError,
  });

  const handleSwap = async () => {
    if (!quote || !parsed || !walletAddress) {
      return;
    }

    const wallet = solanaWallet.wallets?.[0];
    if (!wallet) {
      return;
    }

    setExecutionState("confirming");
    setExecuteError("");

    try {
      const connection = new Connection(SOLANA_RPC, "confirmed");
      const provider = await wallet.getProvider();

      const walletAdapter = {
        publicKey: new PublicKey(walletAddress),
        signTransaction: async <T extends VersionedTransaction>(
          tx: T,
        ): Promise<T> => {
          const result = await provider.request({
            method: "signTransaction",
            params: { transaction: tx },
          });
          return result.signedTransaction as T;
        },
      };

      const result = await executeSwap(
        connection,
        RAYDIUM_HOSTS.devnet,
        walletAdapter,
        {
          inputMint: parsed.fromToken.mint,
          outputMint: parsed.toToken.mint,
          inputDecimals: parsed.fromToken.decimals,
          outputDecimals: parsed.toToken.decimals,
          amount: parseFloat(parsed.amount),
          slippageBps: 100,
          txVersion: "V0",
          computeUnitPriceMicroLamports: "465840",
        },
      );

      setTxSignature(result.signature);
      setTxExplorerUrl(result.explorerUrl);
      setExecutionState("success");
      balanceQuery.refetch();
    } catch (error) {
      setExecutionState("idle");
      setExecuteError(
        error instanceof Error ? error.message : "Transaction failed.",
      );
    }
  };

  const isQuoting = quoteQuery.isFetching;
  const isBusy = isQuoting || executionState === "confirming";
  const callToAction =
    executionState === "confirming"
      ? "Confirming swap..."
      : isQuoting
        ? "Finding the best route..."
        : errorMsg
          ? "Fix the route to continue"
          : !parsed
            ? "Describe the swap you want"
            : !quote
              ? "Waiting for a valid route"
              : `Swap ${parsed.fromToken.symbol} for ${parsed.toToken.symbol}`;

  const handleCopyWallet = async () => {
    if (!walletAddress) {
      return;
    }

    await Clipboard.setStringAsync(walletAddress);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 1500);
  };

  const handleIntentChange = (value: string) => {
    setIntent(value);
    setTxSignature("");
    setTxExplorerUrl("");
    setExecuteError("");
    setExecutionState("idle");
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f3f0e8]" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 16,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="rounded-[30px] border border-[#dfd8c8] bg-[#f8f5ed] px-5 py-6">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-[28px] font-bold text-[#1b1b18]">
                  Solfin
                </Text>
                <Text className="mt-2 text-[15px] leading-6 text-[#5d5a50]">
                  Type the swap you want. We&apos;ll route it through Raydium
                  devnet pools and keep the confirmation step explicit.
                </Text>
              </View>
              <Pressable
                className="rounded-full border border-[#d4ccbb] px-4 py-2"
                onPress={logout}
              >
                <Text className="text-[13px] font-semibold text-[#3a392f]">
                  Log out
                </Text>
              </Pressable>
            </View>

            <View className="mt-6 rounded-[26px] bg-[#161512] px-4 py-4">
              <Text className="text-[12px] uppercase tracking-[2px] text-[#c7c1b4]">
                Intent Console
              </Text>
              <TextInput
                className="mt-3 min-h-[160px] text-[28px] font-semibold leading-[38px] text-[#f7f2e8]"
                multiline
                value={intent}
                onChangeText={handleIntentChange}
                placeholder="swap 1 SOL to USDC"
                placeholderTextColor="#7f7b70"
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text className="mt-3 text-[13px] text-[#9e988b]">
                Supports devnet swaps via Raydium — e.g. `swap 1.25 SOL to USDC`
                or `swap 10 USDC to RAY`.
              </Text>
            </View>

            <View className="mt-5 rounded-[24px] border border-[#e2dbce] bg-white px-4 py-4">
              <Text className="text-[12px] uppercase tracking-[2px] text-[#8a8478]">
                Review
              </Text>
              <Text className="mt-2 text-[21px] font-semibold text-[#1b1b18]">
                {parsed
                  ? `${parsed.amount} ${parsed.fromToken.symbol} to ${parsed.toToken.symbol}`
                  : "Waiting for a valid swap intent"}
              </Text>
              {walletAddress ? (
                <View className="mt-2 flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-[14px] leading-6 text-[#696556]">
                      Wallet {walletAddress.slice(0, 4)}...
                      {walletAddress.slice(-4)} connected
                      {userEmail ? ` for ${userEmail}` : ""}.
                    </Text>
                    {balanceQuery.isFetching && !balanceQuery.data ? (
                      <Text className="mt-1 text-[12px] text-[#9e988b]">
                        Loading balance...
                      </Text>
                    ) : devnetBalance !== null ? (
                      <Text className="mt-1 text-[14px] font-semibold text-[#1b1b18]">
                        {devnetBalance} SOL
                        <Text className="text-[11px] font-normal text-[#9e988b]">
                          {" "}
                          (devnet)
                        </Text>
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    className="rounded-full border border-[#d4ccbb] px-3 py-1.5"
                    onPress={handleCopyWallet}
                  >
                    <Text className="text-[12px] font-semibold text-[#3a392f]">
                      {copiedWallet ? "Copied" : "Copy"}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Text className="mt-1 text-[14px] leading-6 text-[#696556]">
                  Sign in and create your embedded wallet before requesting a
                  quote.
                </Text>
              )}

              <View className="mt-4">
                <MetaRow
                  label="Network"
                  value="Solana Devnet"
                  badge="Raydium"
                />
                <MetaRow
                  label="Route"
                  value={
                    parsed
                      ? `${parsed.fromToken.symbol} → ${parsed.toToken.symbol} (Raydium)`
                      : "-"
                  }
                />
                <MetaRow
                  label="You receive"
                  value={
                    quote && parsed
                      ? `${outputAmount} ${parsed.toToken.symbol}`
                      : "-"
                  }
                />
                <MetaRow label="Minimum received" value={minReceived} />
                <MetaRow label="Price impact" value={priceImpact} />
              </View>

              {executionState === "success" && (
                <View className="mt-4 rounded-2xl bg-emerald-50 px-4 py-4">
                  <Text className="text-base font-bold text-emerald-700">
                    Swap complete
                  </Text>
                  <Text className="mt-1 text-[13px] text-emerald-700">
                    Signature {txSignature.slice(0, 12)}...
                    {txSignature.slice(-8)}
                  </Text>
                </View>
              )}

              {errorMsg ? (
                <View className="mt-4 rounded-2xl bg-red-50 px-4 py-4">
                  <Text className="text-sm font-semibold text-red-600">
                    {errorMsg}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>

        <View className="border border-[#dfd8c8] bg-[#f3f0e8] px-5 py-4">
          <Pressable
            className={`items-center rounded-[22px] bg-[#1b1b18] py-[18px] ${
              !quote || isBusy ? "opacity-50" : "active:opacity-85"
            }`}
            onPress={handleSwap}
            disabled={!quote || isBusy}
          >
            {isBusy ? (
              <View className="flex-row items-center gap-3">
                <ActivityIndicator size="small" color="#f7f2e8" />
                <Text className="text-base font-bold text-[#f7f2e8]">
                  {executionState === "confirming"
                    ? "Confirming swap..."
                    : "Fetching quote..."}
                </Text>
              </View>
            ) : (
              <Text className="text-base font-bold text-[#f7f2e8]">
                {callToAction}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
