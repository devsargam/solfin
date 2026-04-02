import 'react-native-get-random-values';
import { TextEncoder, TextDecoder } from 'text-encoding';
import '@ethersproject/shims';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import 'expo-router/entry';
