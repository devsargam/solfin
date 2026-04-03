import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

interface SwapDirectionButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export function SwapDirectionButton({ onPress, disabled }: SwapDirectionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="absolute z-10 left-1/2 -ml-[22px] -mt-[22px] w-11 h-11 bg-white rounded-full items-center justify-center border-4 border-gray-50 shadow-lg active:bg-gray-100 active:scale-95"
    >
      <View className="items-center justify-center gap-0.5">
        <View className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[7px] border-l-transparent border-r-transparent border-b-gray-900" />
        <View className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[7px] border-l-transparent border-r-transparent border-t-gray-900" />
      </View>
    </Pressable>
  );
}
