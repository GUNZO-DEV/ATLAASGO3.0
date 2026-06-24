import { Component, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BG, CARD, CREAM, EMERALD, MUTED, R } from './dr/ui';

/**
 * App-wide error boundary. Without this, any render-time exception unmounts the
 * React tree and the driver sees a blank white screen mid-shift. This catches it
 * and shows a recoverable fallback instead. Light + sunset-orange theme, styled
 * from the dr/ui tokens so it matches the rest of the driver app.
 */
type Props = { children: ReactNode };
type State = { error: Error | null };

function ErrorFallback({ onReset }: { onReset: () => void }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 44, marginBottom: 12 }}>🛵</Text>
        <Text
          style={{
            fontWeight: '800',
            fontSize: 22,
            color: CREAM,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          Something went wrong
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: MUTED,
            textAlign: 'center',
            lineHeight: 20,
            marginBottom: 24,
          }}
        >
          The app hit an unexpected error. Your shift and earnings are safe — tap below to reload.
        </Text>
        <Pressable
          onPress={onReset}
          style={{
            backgroundColor: EMERALD,
            borderRadius: R.md,
            paddingVertical: 14,
            paddingHorizontal: 28,
          }}
        >
          <Text style={{ color: CARD, fontWeight: '700', fontSize: 15 }}>Try again</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('[AtlaasDriver] Uncaught render error:', error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return <ErrorFallback onReset={this.reset} />;
    }
    return this.props.children;
  }
}
