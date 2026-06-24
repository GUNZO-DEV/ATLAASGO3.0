export const theme = {
  colors: {
    primary: '#FF5722',
    coral: '#FF8A65',
    amber: '#FFB74D',
    sand: '#F5E6D3',
    cream: '#FBF7F2',
    ink: '#1A1410',
    inkSoft: '#2A211C',
    muted: '#7A6F66',
    surface: '#FFFFFF',
    line: 'rgba(26, 20, 16, 0.08)',
  },
  shadow: {
    glow: {
      shadowColor: '#FF5722',
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.35,
      shadowRadius: 40,
      elevation: 12,
    },
    soft: {
      shadowColor: '#1A1410',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 6,
    },
  },
};

export const STAGE_LABELS: Record<string, { title: string; subtitle: string }> = {
  ordered: { title: 'Ordered', subtitle: 'Your order is placed' },
  preparing: { title: 'Preparing', subtitle: 'The kitchen is on it' },
  enRoute: { title: 'Driver en route', subtitle: 'Heading to the restaurant' },
  outForDelivery: { title: 'Out for delivery', subtitle: 'On the way to you' },
  arriving: { title: 'Arriving', subtitle: 'Almost at your door' },
};
