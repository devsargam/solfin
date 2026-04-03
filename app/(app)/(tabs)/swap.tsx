import { useEmbeddedSolanaWallet } from "@privy-io/expo";
import { Connection } from "@solana/web3.js";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DEFAULT_SOL, SOLANA_DEVNET_TOKENS, Token } from "@/constants/tokens";
import {
  deserializeTransaction,
  getQuote,
  getSwapTransaction,
  JupiterQuote,
} from "@/services/jupiter";
import { MetaRow } from "@/components/swap/meta-row";
import { SegmentedControl } from "@/components/swap/segmented-control";
import { SwapDirectionButton } from "@/components/swap/swap-direction-button";
import { TokenPicker } from "@/components/swap/token-picker";

const SOLANA_RPC = "https://api.devnet.solana.com";
const TABS = ["Swap", "Send", "Buy"];

type SwapStep = "idle" | "quoting" | "confirming" | "success" | "error";

export default function SwapScreen() {
  const solanaWallet = useEmbeddedSolanaWallet();
  const [activeTab, setActiveTab] = useState(0);
  const [fromToken, setFromToken] = useState<Token>(DEFAULT_SOL);
  const [toToken, setToToken] = useState<Token>(SOLANA_DEVNET_TOKENS[1]);
  const [fromAmount, setFromAmount] = useState("");
  const [quote, setQuote] = useState<JupiterQuote | null>(null);
  const [step, setStep] = useState<SwapStep>("idle");
  const [txSignature, setTxSignature] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const walletAddress = solanaWallet.wallets?.[0]?.address ?? null;

  const resetState = useCallback(() => {
    setQuote(null);
    setStep("idle");
    setTxSignature("");
    setErrorMsg("");
  }, []);

  const swapDirection = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const tmp = fromToken;
    setFromToken(toToken);
    setToToken(tmp);
    setFromAmount("");
    resetState();
  }, [fromToken, toToken, resetState]);

  const fetchQuote = useCallback(
    async (amount: string) => {
      if (!amount || !walletAddress) return;
      const parsed = parseFloat(amount);
      if (isNaN(parsed) || parsed <= 0) return;
      setStep("quoting");
      setErrorMsg("");
      try {
        const inputAmount = Math.round(parsed * 10 ** fromToken.decimals).toString();
        const q = await getQuote(fromToken.mint, toToken.mint, inputAmount);
        setQuote(q);
        setStep("idle");
      } catch {
        setErrorMsg("Could not get quote.");
        setStep("error");
        setQuote(null);
      }
    },
    [fromToken, toToken, walletAddress],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!fromAmount) {
      resetState();
      return;
    }
    debounceRef.current = setTimeout(() => fetchQuote(fromAmount), 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fromAmount, fromToken, toToken]);

  const outputAmount = quote
    ? (parseFloat(quote.outAmount) / 10 ** toToken.decimals).toFixed(Math.min(toToken.decimals, 4))
    : "";

  const rateDisplay = quote
    ? `1 ${fromToken.symbol} = ${outputAmount} ${toToken.symbol}`
    : "-";

  const minReceived = quote
    ? `${(parseFloat(quote.otherAmountThreshold) / 10 ** toToken.decimals).toFixed(Math.min(toToken.decimals, 4))} ${toToken.symbol}`
    : "-";

  const executeSwap = useCallback(async () => {
    if (!quote || !walletAddress) return;
    const wallet = solanaWallet.wallets?.[0];
    if (!wallet) return;
    setStep("confirming");
    setErrorMsg("");
    try {
      const connection = new Connection(SOLANA_RPC, "confirmed");
      const swapTxBuf = await getSwapTransaction(quote, walletAddress);
      const transaction = deserializeTransaction(swapTxBuf);
      const provider = await wallet.getProvider();
      const { signature } = await provider.request({
        method: "signAndSendTransaction",
        params: { transaction, connection },
      });
      setTxSignature(signature);
      setStep("success");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Transaction failed.");
      setStep("error");
    }
  }, [quote, walletAddress, solanaWallet.wallets]);

  if (!walletAddress) {
    return (
      <SafeAreaView className="flex-1 bg-[#F5F5F7]">
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-xl font-bold text-gray-900 mb-2">No Wallet Found</Text>
          <Text className="text-sm text-gray-400 text-center">Log in to access your Solana wallet.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isBusy = step === "quoting" || step === "confirming";

  return (
    <SafeAreaView className="flex-1 bg-[#F5F5F7]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-white rounded-3xl p-5 shadow-sm">
            <SegmentedControl tabs={TABS} activeIndex={activeTab} onTabPress={setActiveTab} />

            <Text className="text-[13px] font-semibold text-gray-400 tracking-wider uppercase mt-5 mb-2.5 px-1">
              Sell
            </Text>

            <View className="bg-[#F9F9FB] rounded-[20px] px-[18px] py-4 border border-[#EEEEF2]">
              <View className="flex-row justify-between items-center">
                <Pressable
                  className="flex-row items-center gap-2 bg-white px-3 py-2 rounded-full shadow-sm active:bg-gray-100"
                  onPress={() => setShowFromPicker(true)}
                >
                  <View className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center">
                    <Text className="text-base">{fromToken.logo}</Text>
                  </View>
                  <Text className="text-[17px] font-bold text-gray-900">{fromToken.symbol}</Text>
                  <Text className="text-[13px] text-gray-500 mt-0.5">▾</Text>
                </Pressable>
                <Pressable className="bg-white px-2.5 py-1.5 rounded-lg border border-[#E8E8ED]">
                  <Text className="text-[11px] font-bold text-gray-500 tracking-wider">MAX</Text>
                </Pressable>
              </View>
              <View className="mt-3 items-end">
                <TextInput
                  className="text-[36px] font-bold text-gray-900 text-right tracking-tight min-w-[100px] p-0"
                  value={fromAmount}
                  onChangeText={setFromAmount}
                  placeholder="0"
                  placeholderTextColor="#D1D1D6"
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  editable={step !== "confirming"}
                />
              </View>
            </View>

            <View className="items-center h-0 z-10 -mt-[22px] mb-[22px]">
              <SwapDirectionButton onPress={swapDirection} disabled={isBusy} />
            </View>

            <Text className="text-[13px] font-semibold text-gray-400 tracking-wider uppercase mb-2.5 px-1">
              Buy
            </Text>

            <View className="bg-[#F9F9FB] rounded-[20px] px-[18px] py-4 border border-[#EEEEF2]">
              <View className="flex-row justify-between items-center">
                <Pressable
                  className="flex-row items-center gap-2 bg-white px-3 py-2 rounded-full shadow-sm active:bg-gray-100"
                  onPress={() => setShowToPicker(true)}
                >
                  <View className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center">
                    <Text className="text-base">{toToken.logo}</Text>
                  </View>
                  <Text className="text-[17px] font-bold text-gray-900">{toToken.symbol}</Text>
                  <Text className="text-[13px] text-gray-500 mt-0.5">▾</Text>
                </Pressable>
              </View>
              <View className="mt-3 items-end min-h-[44px] justify-center">
                {step === "quoting" ? (
                  <ActivityIndicator size="small" color="#111113" />
                ) : (
                  <Text className={`text-[36px] font-bold tracking-tight text-right ${quote ? "text-gray-900" : "text-[#D1D1D6]"}`}>
                    {quote ? outputAmount : "0"}
                  </Text>
                )}
              </View>
            </View>

            {quote && (
              <View className="mt-5 pt-4 border-t border-[#F0F0F3] px-1">
                <MetaRow label="Route" value={`${fromToken.symbol} → ${toToken.name}`} badge="Best Rate" />
                <MetaRow label="Minimum Received" value={minReceived} />
                <MetaRow label="Rate" value={rateDisplay} />
                <MetaRow label="Network Fee" value="~0.00001 SOL" />
              </View>
            )}

            {step === "success" && (
              <View className="items-center gap-1.5 py-5">
                <Text className="text-[44px]">✅</Text>
                <Text className="text-lg font-bold text-emerald-600">Swap Complete!</Text>
                <Text className="text-xs text-gray-400 font-mono">
                  {txSignature.slice(0, 12)}...{txSignature.slice(-8)}
                </Text>
              </View>
            )}

            {step === "error" && errorMsg && (
              <View className="items-center gap-1.5 py-5">
                <Text className="text-[44px]">❌</Text>
                <Text className="text-lg font-bold text-red-500">Swap Failed</Text>
                <Text className="text-[13px] text-red-400 text-center">{errorMsg}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View className="px-4 py-3 bg-[#F5F5F7]">
          {step === "success" ? (
            <Pressable
              className="bg-gray-900 rounded-2xl py-[18px] items-center shadow-lg active:opacity-80"
              onPress={() => { resetState(); setFromAmount(""); }}
            >
              <Text className="text-white text-base font-bold">Swap Again</Text>
            </Pressable>
          ) : step === "error" ? (
            <Pressable
              className="bg-gray-900 rounded-2xl py-[18px] items-center shadow-lg active:opacity-80"
              onPress={resetState}
            >
              <Text className="text-white text-base font-bold">Try Again</Text>
            </Pressable>
          ) : (
            <Pressable
              className={`bg-gray-900 rounded-2xl py-[18px] items-center shadow-lg ${(!quote || isBusy) ? "opacity-45" : "active:opacity-80"}`}
              onPress={executeSwap}
              disabled={!quote || isBusy}
            >
              {step === "confirming" ? (
                <View className="flex-row items-center gap-2.5">
                  <ActivityIndicator color="#fff" size="small" />
                  <Text className="text-white text-base font-bold">Confirming...</Text>
                </View>
              ) : (
                <Text className="text-white text-base font-bold">
                  {!fromAmount ? "Enter an amount" : !quote ? "Finding best route..." : "Swap"}
                </Text>
              )}
            </Pressable>
          )}
        </View>

        <TokenPicker
          visible={showFromPicker}
          tokens={SOLANA_DEVNET_TOKENS.filter((t) => t.mint !== toToken.mint)}
          selectedMint={fromToken.mint}
          onSelect={(t) => { setFromToken(t); setFromAmount(""); resetState(); }}
          onClose={() => setShowFromPicker(false)}
          title="Select Token"
        />
        <TokenPicker
          visible={showToPicker}
          tokens={SOLANA_DEVNET_TOKENS.filter((t) => t.mint !== fromToken.mint)}
          selectedMint={toToken.mint}
          onSelect={(t) => { setToToken(t); resetState(); }}
          onClose={() => setShowToPicker(false)}
          title="Select Token"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
