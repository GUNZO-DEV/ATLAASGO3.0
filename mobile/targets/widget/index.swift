import WidgetKit
import SwiftUI

// MARK: - Timeline

struct AtlaasEntry: TimelineEntry {
  let date: Date
}

struct AtlaasProvider: TimelineProvider {
  func placeholder(in context: Context) -> AtlaasEntry { AtlaasEntry(date: Date()) }

  func getSnapshot(in context: Context, completion: @escaping (AtlaasEntry) -> Void) {
    completion(AtlaasEntry(date: Date()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<AtlaasEntry>) -> Void) {
    // Static brand/quick-launch widget — no data to refresh.
    completion(Timeline(entries: [AtlaasEntry(date: Date())], policy: .never))
  }
}

// MARK: - Brand colors

private let coralLight = Color(red: 1.0, green: 0.55, blue: 0.32)
private let coralDeep = Color(red: 0.91, green: 0.24, blue: 0.09)

// MARK: - Views

struct AtlaasWidgetView: View {
  var family: WidgetFamily

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text("A")
        .font(.system(size: family == .systemSmall ? 30 : 34, weight: .heavy))
        .foregroundColor(.white)
      Spacer(minLength: 0)
      Text("AtlaasGo")
        .font(.system(size: family == .systemSmall ? 17 : 20, weight: .heavy))
        .foregroundColor(.white)
      Text(family == .systemSmall ? "Order now" : "Food · Pharmacy · Groceries")
        .font(.system(size: 12, weight: .medium))
        .foregroundColor(.white.opacity(0.9))
      if family != .systemSmall {
        Text("Tap to order →")
          .font(.system(size: 12, weight: .bold))
          .foregroundColor(.white)
          .padding(.top, 2)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .widgetURL(URL(string: "atlaasgo://"))
  }
}

// MARK: - Widget

struct AtlaasGoWidget: Widget {
  let kind = "AtlaasGoWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: AtlaasProvider()) { _ in
      if #available(iOS 17.0, *) {
        AtlaasWidgetView(family: .systemMedium)
          .containerBackground(for: .widget) {
            LinearGradient(colors: [coralLight, coralDeep], startPoint: .topLeading, endPoint: .bottomTrailing)
          }
      } else {
        ZStack {
          LinearGradient(colors: [coralLight, coralDeep], startPoint: .topLeading, endPoint: .bottomTrailing)
          AtlaasWidgetView(family: .systemMedium).padding(16)
        }
      }
    }
    .configurationDisplayName("AtlaasGo")
    .description("Order food, groceries & pharmacy in a tap.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

@main
struct AtlaasGoWidgetBundle: WidgetBundle {
  var body: some Widget {
    AtlaasGoWidget()
  }
}
