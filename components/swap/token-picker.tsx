import React from "react";
import {
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { Token } from "@/constants/tokens";

interface TokenPickerProps {
  visible: boolean;
  tokens: Token[];
  selectedMint: string;
  onSelect: (token: Token) => void;
  onClose: () => void;
  title: string;
}

export function TokenPicker({
  visible,
  tokens,
  selectedMint,
  onSelect,
  onClose,
  title,
}: TokenPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.35)" }} onPress={onClose}>
        <Pressable
          className="bg-white rounded-t-3xl px-6 pt-3 pb-10"
          style={{ maxHeight: "70%" }}
          onPress={(e: any) => e.stopPropagation()}
        >
          <View className="w-9 h-1 rounded-full bg-gray-300 self-center mb-4" />
          <Text className="text-lg font-bold text-gray-900 mb-3">{title}</Text>
          <View className="h-px bg-gray-100 mb-2" />
          {tokens.map((token) => {
            const isSelected = token.mint === selectedMint;
            return (
              <Pressable
                key={token.mint}
                className={`flex-row items-center justify-between py-3.5 px-3 rounded-2xl ${isSelected ? "bg-blue-50" : ""}`}
                onPress={() => {
                  onSelect(token);
                  onClose();
                }}
              >
                <View className="flex-row items-center gap-3.5">
                  <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                    <Text className="text-xl">{token.logo}</Text>
                  </View>
                  <View>
                    <Text className="text-base font-bold text-gray-900">{token.symbol}</Text>
                    <Text className="text-[13px] text-gray-400 mt-0.5">{token.name}</Text>
                  </View>
                </View>
                {isSelected && (
                  <View className="w-6 h-6 rounded-full bg-gray-900 items-center justify-center">
                    <Text className="text-white text-xs font-bold">✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
