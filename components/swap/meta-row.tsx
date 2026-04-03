import React from "react";
import { Text, View } from "react-native";

interface MetaRowProps {
  label: string;
  value: string;
  badge?: string;
}

export function MetaRow({ label, value, badge }: MetaRowProps) {
  return (
    <View className="flex-row justify-between items-center py-2.5">
      <View className="flex-row items-center gap-2">
        <Text className="text-[13px] text-gray-400 tracking-wide">{label}</Text>
        {badge && (
          <View className="bg-emerald-50 px-2 py-[3px] rounded-md">
            <Text className="text-[10px] font-bold text-emerald-600 tracking-wide">
              {badge}
            </Text>
          </View>
        )}
      </View>
      <Text className="text-[13px] text-gray-900 font-medium tracking-wide">
        {value}
      </Text>
    </View>
  );
}
