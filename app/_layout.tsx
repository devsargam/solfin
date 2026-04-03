import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { PrivyProvider } from '@privy-io/expo';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { queryClient } from '@/lib/query-client';

export const unstable_settings = {
  anchor: '(app)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId="cmnhlwscp00un0bjjce18970h"
        clientId="client-WY6Xn2uRHhYkpNdqYkvF92XxkbTJorq3ZC1JF2QQpxsmF"
        config={{
          embedded: {
            solana: {
              createOnLogin: 'users-without-wallets',
            },
            ethereum: {
              createOnLogin: 'users-without-wallets',
            },
          },
        }}
      >
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
            <Stack.Screen name="sign-in" options={{ title: 'Sign In' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </PrivyProvider>
    </QueryClientProvider>
  );
}
