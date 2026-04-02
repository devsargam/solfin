import { AuthBoundary } from '@privy-io/expo';
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

function FullScreenLoader() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" />
    </View>
  );
}

function ErrorScreen({ error }: { error: Error }) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Something went wrong: {error.message}</Text>
    </View>
  );
}

export default function AppLayout() {
  return (
    <AuthBoundary
      loading={<FullScreenLoader />}
      error={(error) => <ErrorScreen error={error} />}
      unauthenticated={<Redirect href="/sign-in" />}
    >
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </AuthBoundary>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
