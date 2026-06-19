/**
 * AtlaasGo home-screen widget (iOS WidgetKit).
 * Built via @bacons/apple-targets during `expo prebuild` / EAS build.
 *
 * @type {import('@bacons/apple-targets').Config}
 */
module.exports = {
  type: 'widget',
  name: 'AtlaasGoWidget',
  icon: '../../assets/icon.png',
  colors: {
    $accent: '#FF5722',
  },
  deploymentTarget: '17.0',
};
