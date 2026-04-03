import { useLoginWithEmail, useLoginWithOAuth, usePrivy } from '@privy-io/expo';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type LoginMethod = 'email' | null;

export default function SignInScreen() {
  const { isReady, user } = usePrivy();
  const { sendCode, loginWithCode } = useLoginWithEmail();
  const { login: loginWithOAuth, state: oauthState } = useLoginWithOAuth();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  const handleSendCode = async () => {
    if (!email) return;
    setLoading(true);
    try {
      await sendCode({ email });
      setCodeSent(true);
    } catch (err) {
      console.error('Failed to send code:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginWithCode = async () => {
    if (!code) return;
    setLoading(true);
    try {
      await loginWithCode({ code, email });
      router.replace('/(app)/(tabs)');
    } catch (err) {
      console.error('Failed to login:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'twitter' | 'discord' | 'apple') => {
    setLoading(true);
    try {
      await loginWithOAuth({ provider });
    } catch (err) {
      console.error('OAuth login failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setLoginMethod(null);
    setCodeSent(false);
    setCode('');
    setEmail('');
  };

  if (loginMethod === 'email') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity onPress={resetForm}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Sign in with Email</Text>
          <Text style={styles.subtitle}>We&apos;ll send you a one-time code</Text>

          {!codeSent ? (
            <>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                inputMode="email"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleSendCode}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Sending...' : 'Send Code'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.codeInfo}>A code has been sent to {email}</Text>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={setCode}
                placeholder="Enter the code"
                keyboardType="number-pad"
              />
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleLoginWithCode}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Verifying...' : 'Verify & Login'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCodeSent(false)}>
                <Text style={styles.linkText}>Resend code</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Solfin</Text>
        <Text style={styles.subtitle}>Choose a method to sign in</Text>

        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleOAuthLogin('google')}
          disabled={loading || oauthState.status === 'loading'}
        >
          <Text style={styles.socialButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleOAuthLogin('apple')}
          disabled={loading || oauthState.status === 'loading'}
        >
          <Text style={styles.socialButtonText}>Continue with Apple</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleOAuthLogin('discord')}
          disabled={loading || oauthState.status === 'loading'}
        >
          <Text style={styles.socialButtonText}>Continue with Discord</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleOAuthLogin('twitter')}
          disabled={loading || oauthState.status === 'loading'}
        >
          <Text style={styles.socialButtonText}>Continue with X (Twitter)</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setLoginMethod('email')}
        >
          <Text style={styles.primaryButtonText}>Sign in with Email</Text>
        </TouchableOpacity>

        {(loading || oauthState.status === 'loading') && (
          <ActivityIndicator style={styles.spinner} size="small" />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backText: {
    color: '#007AFF',
    fontSize: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  socialButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  codeInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    paddingHorizontal: 12,
    color: '#999',
    fontSize: 14,
  },
  spinner: {
    marginTop: 16,
  },
});
