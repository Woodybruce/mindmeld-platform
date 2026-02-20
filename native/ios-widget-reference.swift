/*
 ┌──────────────────────────────────────────────────────────────────┐
 │  NATIVE SWIFT FILES — add these in Xcode manually               │
 │  This file is a REFERENCE ONLY, not compiled by Vite.           │
 └──────────────────────────────────────────────────────────────────┘

 SETUP STEPS:
 ────────────
 1. In Xcode → your App target → Signing & Capabilities → + Capability → "App Groups"
    Create group: "group.app.lovable.mindmeldplatform"
    Add it to BOTH the main App target AND the Widget Extension target.

 2. Create a new Capacitor Plugin file at:
    ios/App/App/WidgetBridgePlugin.swift
    Paste FILE 1 below.

 3. Register the plugin in ios/App/App/AppDelegate.swift (or Bridge):
    In `application(_:didFinishLaunchingWithOptions:)`:
      bridge?.registerPlugin(WidgetBridgePlugin.self)

 4. File → New → Target → "Widget Extension"
    Name it "UsWidget"
    Language: Swift / SwiftUI
    Paste FILE 2 into UsWidget.swift

 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 FILE 1 — ios/App/App/WidgetBridgePlugin.swift
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import Foundation
import Capacitor
import WidgetKit

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateWidgetData", returnType: CAPPluginReturnPromise)
    ]

    private let appGroup = "group.app.lovable.mindmeldplatform"

    @objc func updateWidgetData(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("Missing json parameter")
            return
        }

        let defaults = UserDefaults(suiteName: appGroup)
        defaults?.set(json, forKey: "widgetData")
        defaults?.synchronize()

        // Tell iOS to refresh the widget timeline
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }

        call.resolve()
    }
}

 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 FILE 2 — UsWidget/UsWidget.swift
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import WidgetKit
import SwiftUI

// MARK: — Data model (mirrors WidgetData from JS)

struct UsWidgetData: Codable {
    let username: String
    let partnerName: String
    let tasks: [TaskItem]
    let nextEvent: EventItem?
    let streakDays: Int
    let updatedAt: String

    struct TaskItem: Codable {
        let text: String
        let done: Bool
    }

    struct EventItem: Codable {
        let subject: String
        let date: String
    }
}

// MARK: — Timeline Provider

struct UsProvider: TimelineProvider {
    let appGroup = "group.app.lovable.mindmeldplatform"

    func placeholder(in context: Context) -> UsEntry {
        UsEntry(date: Date(), data: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (UsEntry) -> Void) {
        completion(UsEntry(date: Date(), data: loadData()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<UsEntry>) -> Void) {
        let entry = UsEntry(date: Date(), data: loadData())
        // Refresh every 30 minutes
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private func loadData() -> UsWidgetData? {
        guard let json = UserDefaults(suiteName: appGroup)?.string(forKey: "widgetData"),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(UsWidgetData.self, from: data)
    }
}

struct UsEntry: TimelineEntry {
    let date: Date
    let data: UsWidgetData?
}

// MARK: — Widget Views

struct UsWidgetEntryView: View {
    var entry: UsEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        if let data = entry.data {
            switch family {
            case .systemSmall:
                smallView(data)
            case .systemMedium:
                mediumView(data)
            default:
                mediumView(data)
            }
        } else {
            VStack {
                Text("Us")
                    .font(.headline)
                Text("Open the app to sync")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
        }
    }

    // ── Small widget ─────────────────────────
    func smallView(_ data: UsWidgetData) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("❤️")
                Text("Us")
                    .font(.headline)
                    .fontWeight(.bold)
            }

            if let event = data.nextEvent {
                VStack(alignment: .leading, spacing: 2) {
                    Text(event.subject)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .lineLimit(1)
                    Text(formatDate(event.date))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            let done = data.tasks.filter { $0.done }.count
            let total = data.tasks.count
            if total > 0 {
                Text("\(done)/\(total) tasks done")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color(.systemBackground))
    }

    // ── Medium widget ────────────────────────
    func mediumView(_ data: UsWidgetData) -> some View {
        HStack(spacing: 12) {
            // Left: tasks
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("❤️")
                    Text("Us")
                        .font(.headline)
                        .fontWeight(.bold)
                }

                ForEach(Array(data.tasks.prefix(4).enumerated()), id: \.offset) { _, task in
                    HStack(spacing: 4) {
                        Image(systemName: task.done ? "checkmark.circle.fill" : "circle")
                            .font(.caption2)
                            .foregroundColor(task.done ? .green : .secondary)
                        Text(task.text)
                            .font(.caption)
                            .lineLimit(1)
                            .strikethrough(task.done)
                            .foregroundColor(task.done ? .secondary : .primary)
                    }
                }

                Spacer()
            }

            Divider()

            // Right: next event
            VStack(alignment: .leading, spacing: 4) {
                Text("Next Event")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .textCase(.uppercase)

                if let event = data.nextEvent {
                    Text(event.subject)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .lineLimit(2)
                    Text(formatDate(event.date))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                } else {
                    Text("Nothing planned")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                if data.streakDays > 0 {
                    HStack(spacing: 2) {
                        Text("🔥")
                        Text("\(data.streakDays) day streak")
                            .font(.caption2)
                            .foregroundColor(.orange)
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color(.systemBackground))
    }

    func formatDate(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: iso) else { return iso }
        let display = DateFormatter()
        display.dateStyle = .medium
        display.timeStyle = .short
        return display.string(from: date)
    }
}

// MARK: — Widget declaration

@main
struct UsWidget: Widget {
    let kind = "UsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: UsProvider()) { entry in
            UsWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Us")
        .description("Today's tasks and upcoming events")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

*/
