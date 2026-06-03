import { Component, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * App-wide error boundary. Without this, any render-time exception unmounts the
 * React tree and the user sees a blank white screen. This catches it and shows
 * a recoverable fallback instead.
 */
type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('[AtlaasGo] Uncaught render error:', error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>🍽️</Text>
            <Text
              style={{
                fontWeight: '800',
                fontSize: 22,
                color: '#1A1410',
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Something went wrong
            </Text>
            <Text style={{ fontSize: 14, color: '#7A6F66', textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
              The app hit an unexpected error. Tap below to try again.
            </Text>
            <Pressable
              onPress={this.reset}
              style={{ backgroundColor: '#FF5722', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 28 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Try again</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}
