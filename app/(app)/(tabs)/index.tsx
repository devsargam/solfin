import { useQuery } from '@tanstack/react-query';
import { useEmbeddedSolanaWallet, usePrivy } from '@privy-io/expo';
import { Connection } from '@solana/web3.js';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetaRow } from '@/components/swap/meta-row';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  getQuote,
  getSwapTransaction,
  OrcaQuote,
} from '@/services/orca';
import { parseSwapIntent } from '@/services/swap-intent';

const SOLANA_RPC = 'https://api.devnet.solana.com';
const DEFAULT_PROMPT = 'swap 1 SOL to USDC';

type SwapStep = 'idle' | 'quoting' | 'confirming' | 'success' | 'error';

export default function HomeScreen() {
  const { user, logout } = usePrivy();
  const solanaWallet = useEmbeddedSolanaWallet();
  const walletAddress = solanaWallet.wallets?.[0]?.address ?? null;

  const [intent, setIntent] = useState(DEFAULT_PROMPT);
  const debouncedIntent = useDebouncedValue(intent, 450);
  const [step, setStep] = useState<SwapStep>('idle');
  const [executeError, setExecuteError] = useState('');
  const [txSignature, setTxSignature] = useState('');
  const [copiedWallet, setCopiedWallet] = useState(false);

  const { parsed, error: parseError } = parseSwapIntent(debouncedIntent);
  const userEmail = user?.linked_accounts.find((account) => account.type === 'email')?.address;

  useEffect(() => {
    setTxSignature('');
    setExecuteError('');
  }, [debouncedIntent]);

  const quoteQuery = useQuery<OrcaQuote>({
    queryKey: ['swap-quote', walletAddress, parsed?.fromToken.mint, parsed?.toToken.mint, parsed?.amount],
    enabled: Boolean(walletAddress && parsed && !parseError),
    queryFn: async () => {
      if (!parsed) {
        throw new Error('Missing parsed swap intent.');
      }

      const amountInBaseUnits = Math.round(
        parseFloat(parsed.amount) * 10 ** parsed.fromToken.decimals,
      ).toString();

      return getQuote(parsed.fromToken.mint, parsed.toToken.mint, amountInBaseUnits);
    },
  });

  const quote = quoteQuery.data ?? null;

  const outputAmount =
    quote && parsed
      ? (parseFloat(quote.outAmount) / 10 ** parsed.toToken.decimals).toFixed(
          Math.min(parsed.toToken.decimals, 4),
        )
      : '';

  const minReceived =
    quote && parsed
      ? `${(
          parseFloat(quote.otherAmountThreshold) /
          10 ** parsed.toToken.decimals
        ).toFixed(Math.min(parsed.toToken.decimals, 4))} ${parsed.toToken.symbol}`
      : '-';

  const quoteError = quoteQuery.error instanceof Error ? quoteQuery.error.message : '';
  const errorMsg = !walletAddress
    ? 'Connect to your embedded Solana wallet to preview swaps.'
    : parseError
      ? parseError
      : quoteError.includes('UNSUPPORTED_PAIR')
        ? 'That pair is not enabled yet. Right now we support Orca devnet pools for SOL/USDC and USDC/USDT.'
        : executeError || quoteError;

  useEffect(() => {
    if (step === 'confirming' || step === 'success') {
      return;
    }

    if (parseError || executeError || quoteQuery.isError) {
      setStep('error');
      return;
    }

    if (quoteQuery.isFetching) {
      setStep('quoting');
      return;
    }

    setStep('idle');
  }, [executeError, parseError, quoteQuery.isError, quoteQuery.isFetching, step]);

  const executeSwap = async () => {
    if (!quote || !parsed || !walletAddress) {
      return;
    }

    const wallet = solanaWallet.wallets?.[0];
    if (!wallet) {
      return;
    }

    setStep('confirming');
    setExecuteError('');

    try {
      const connection = new Connection(SOLANA_RPC, 'confirmed');
      const transaction = await getSwapTransaction(quote, walletAddress);
      const provider = await wallet.getProvider();
      const { signature } = await provider.request({
        method: 'signAndSendTransaction',
        params: { transaction, connection },
      });
      setTxSignature(signature);
      setStep('success');
    } catch (error) {
      setStep('error');
      setExecuteError(error instanceof Error ? error.message : 'Transaction failed.');
    }
  };

  const isBusy = quoteQuery.isFetching || step === 'confirming';
  const callToAction = step === 'confirming'
    ? 'Confirming swap...'
    : step === 'quoting'
      ? 'Finding the best route...'
      : errorMsg
        ? 'Fix the route to continue'
        : !parsed
          ? 'Describe the swap you want'
          : !quote
            ? 'Waiting for a valid route'
            : `Swap ${parsed.fromToken.symbol} for ${parsed.toToken.symbol}`;

  const handleCopyWallet = async () => {
    if (!walletAddress) {
      return;
    }

    await Clipboard.setStringAsync(walletAddress);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 1500);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f3f0e8]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="rounded-[30px] border border-[#dfd8c8] bg-[#f8f5ed] px-5 py-6">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-[28px] font-bold text-[#1b1b18]">Solfin</Text>
                <Text className="mt-2 text-[15px] leading-6 text-[#5d5a50]">
                  Type the swap you want. We&apos;ll route it through live Orca devnet pools and
                  keep the confirmation step explicit.
                </Text>
              </View>
              <Pressable
                className="rounded-full border border-[#d4ccbb] px-4 py-2"
                onPress={logout}
              >
                <Text className="text-[13px] font-semibold text-[#3a392f]">Log out</Text>
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
                onChangeText={setIntent}
                placeholder='swap 1 SOL to USDC'
                placeholderTextColor="#7f7b70"
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text className="mt-3 text-[13px] text-[#9e988b]">
                Current parser supports live devnet swaps like `swap 1.25 SOL to USDC` and
                `swap 5 USDC to USDT`.
              </Text>
            </View>

            <View className="mt-5 rounded-[24px] border border-[#e2dbce] bg-white px-4 py-4">
              <Text className="text-[12px] uppercase tracking-[2px] text-[#8a8478]">
                Review
              </Text>
              <Text className="mt-2 text-[21px] font-semibold text-[#1b1b18]">
                {parsed
                  ? `${parsed.amount} ${parsed.fromToken.symbol} to ${parsed.toToken.symbol}`
                  : 'Waiting for a valid swap intent'}
              </Text>
              {walletAddress ? (
                <View className="mt-2 flex-row items-center justify-between gap-3">
                  <Text className="flex-1 text-[14px] leading-6 text-[#696556]">
                    Wallet {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)} connected
                    {userEmail ? ` for ${userEmail}` : ''}.
                  </Text>
                  <Pressable
                    className="rounded-full border border-[#d4ccbb] px-3 py-1.5"
                    onPress={handleCopyWallet}
                  >
                    <Text className="text-[12px] font-semibold text-[#3a392f]">
                      {copiedWallet ? 'Copied' : 'Copy'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Text className="mt-1 text-[14px] leading-6 text-[#696556]">
                  Sign in and create your embedded wallet before requesting a quote.
                </Text>
              )}

              <View className="mt-4">
                <MetaRow label="Network" value="Solana Devnet" badge="Testing" />
                <MetaRow
                  label="Route"
                  value={
                    quote?.poolLabel ??
                    (parsed ? `${parsed.fromToken.symbol} -> ${parsed.toToken.symbol}` : '-')
                  }
                />
                <MetaRow label="You receive" value={quote && parsed ? `${outputAmount} ${parsed.toToken.symbol}` : '-'} />
                <MetaRow label="Minimum received" value={minReceived} />
                <MetaRow
                  label="Pool fee"
                  value={
                    quote && parsed
                      ? `${(
                          parseFloat(quote.estimatedFeeAmount) /
                          10 ** parsed.fromToken.decimals
                        ).toFixed(Math.min(parsed.fromToken.decimals, 6))} ${parsed.fromToken.symbol}`
                      : '-'
                  }
                />
              </View>

              {step === 'success' && (
                <View className="mt-4 rounded-2xl bg-emerald-50 px-4 py-4">
                  <Text className="text-base font-bold text-emerald-700">Swap complete</Text>
                  <Text className="mt-1 text-[13px] text-emerald-700">
                    Signature {txSignature.slice(0, 12)}...{txSignature.slice(-8)}
                  </Text>
                </View>
              )}

              {errorMsg ? (
                <View className="mt-4 rounded-2xl bg-red-50 px-4 py-4">
                  <Text className="text-sm font-semibold text-red-600">{errorMsg}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>

        <View className="border-t border-[#dfd8c8] bg-[#f3f0e8] px-5 py-4">
          <Pressable
            className={`items-center rounded-[22px] bg-[#1b1b18] py-[18px] ${
              !quote || isBusy ? 'opacity-50' : 'active:opacity-85'
            }`}
            onPress={executeSwap}
            disabled={!quote || isBusy}
          >
            {isBusy ? (
              <View className="flex-row items-center gap-3">
                <ActivityIndicator size="small" color="#f7f2e8" />
                <Text className="text-base font-bold text-[#f7f2e8]">
                  {step === 'confirming' ? 'Confirming swap...' : 'Fetching quote...'}
                </Text>
              </View>
            ) : (
              <Text className="text-base font-bold text-[#f7f2e8]">{callToAction}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
