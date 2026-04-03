import React from "react";
import { Pressable, Text, View } from "react-native";

interface SegmentedControlProps {
  tabs: string[];
  activeIndex: number;
  onTabPress: (index: number) => void;
}

export function SegmentedControl({ tabs, activeIndex, onTabPress }: SegmentedControlProps) {
  return (
    <View className="flex-row bg-gray-100 rounded-2xl p-1 mb-6">
      {tabs.map((tab, i) => (
        <Pressable
          key={tab}
          onPress={() => onTabPress(i)}
          className={`flex-1 py-2.5 px-4 rounded-xl items-center justify-center ${
            i === activeIndex ? "bg-white shadow-sm" : ""
          }`}
        >
          <Text
            className={`text-sm font-semibold tracking-wide ${
              i === activeIndex ? "text-gray-900" : "text-gray-400"
            }`}
          >
            {tab}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
