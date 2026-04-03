import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Token } from "@/constants/tokens";

interface TokenCardProps {
  token: Token;
  balance: string;
  amount: string;
  onAmountChange: (value: string) => void;
  onTokenPress: () => void;
  onMaxPress: () => void;
  editable: boolean;
  usdValue: string;
}

export function TokenCard({
  token,
  balance,
  amount,
  onAmountChange,
  onTokenPress,
  onMaxPress,
  editable,
  usdValue,
}: TokenCardProps) {
  return (
    <View style={s.card}>
      <View style={s.top}>
        <Pressable
          onPress={onTokenPress}
          style={({ pressed }) => [
            s.tokenSelector,
            pressed && s.tokenSelectorPressed,
          ]}
        >
          <View style={s.tokenIconWrap}>
            <Text style={s.tokenIcon}>{token.logo}</Text>
          </View>
          <Text style={s.tokenSymbol}>{token.symbol}</Text>
          <View style={s.chevron}>
            <Text style={s.chevronIcon}>▾</Text>
          </View>
        </Pressable>

        <View style={s.balanceRow}>
          <Text style={s.balanceLabel}>Balance: {balance}</Text>
          <Pressable onPress={onMaxPress} style={s.maxPill}>
            <Text style={s.maxText}>MAX</Text>
          </Pressable>
        </View>
      </View>

      <View style={s.inputSection}>
        <Pressable
          style={s.inputWrap}
          onPress={() => {}}
        >
          <Text style={s.amountDisplay}>
            {amount || "0"}
          </Text>
          {amount === "" && (
            <Text style={s.placeholderText}>0</Text>
          )}
        </Pressable>
        <Text style={s.usdValue}>{usdValue}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "#E8E8ED",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  tokenSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: "#F3F3F6",
  },
  tokenSelectorPressed: {
    backgroundColor: "#E8E8ED",
  },
  tokenIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  tokenIcon: {
    fontSize: 18,
    textAlign: "center",
    lineHeight: 32,
  },
  tokenSymbol: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111113",
    letterSpacing: 0.3,
  },
  chevron: {
    marginLeft: -2,
    justifyContent: "center",
  },
  chevronIcon: {
    fontSize: 14,
    color: "#111113",
    marginTop: 2,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingLeft: 8,
  },
  balanceLabel: {
    fontSize: 12,
    color: "#93949B",
    letterSpacing: 0.2,
  },
  maxPill: {
    backgroundColor: "#E8E8ED",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  maxText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B6B77",
    letterSpacing: 0.8,
  },
  inputSection: {
    alignItems: "flex-end",
    minWidth: 140,
  },
  inputWrap: {
    alignItems: "flex-end",
  },
  amountDisplay: {
    fontSize: 36,
    fontWeight: "700",
    color: "#111113",
    letterSpacing: -0.5,
    textAlign: "right",
    includeFontPadding: false,
  },
  placeholderText: {
    fontSize: 36,
    fontWeight: "700",
    color: "#C5C5CC",
    letterSpacing: -0.5,
    textAlign: "right",
    position: "absolute",
    right: 0,
  },
  usdValue: {
    fontSize: 13,
    color: "#93949B",
    marginTop: 4,
    textAlign: "right",
    letterSpacing: 0.1,
  },
});
