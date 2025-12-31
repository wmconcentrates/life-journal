// TimelineEvent.swift
// Data models for timeline events

import SwiftUI

struct TimelineEvent: Identifiable, Codable {
    let id: String
    let type: EventType
    let timestamp: Date
    let data: EventData
    let source: String

    enum EventType: String, Codable {
        case location
        case purchase
        case activity
        case photo

        var displayName: String {
            switch self {
            case .location: return "Location"
            case .purchase: return "Purchase"
            case .activity: return "Activity"
            case .photo: return "Photo"
            }
        }
    }

    var iconName: String {
        switch type {
        case .location: return "mappin.circle.fill"
        case .purchase: return "bag.fill"
        case .activity: return "figure.walk"
        case .photo: return "photo.fill"
        }
    }

    var iconColor: Color {
        switch type {
        case .location: return .blue
        case .purchase: return .green
        case .activity: return .orange
        case .photo: return .purple
        }
    }

    var title: String {
        switch type {
        case .location:
            return data.place ?? "Location"
        case .purchase:
            return data.merchant ?? "Purchase"
        case .activity:
            return data.activityType ?? "Activity"
        case .photo:
            return data.filename ?? "Photo"
        }
    }

    var subtitle: String {
        switch type {
        case .location:
            if let duration = data.durationMinutes {
                return "\(duration) min"
            }
            return data.address ?? ""
        case .purchase:
            if let amount = data.amount {
                return String(format: "$%.2f", amount)
            }
            return data.items?.joined(separator: ", ") ?? ""
        case .activity:
            return "\(data.durationMinutes ?? 0) min"
        case .photo:
            return data.location ?? ""
        }
    }

    var formattedTime: String? {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: timestamp)
    }
}

struct EventData: Codable {
    // Location fields
    var lat: Double?
    var lng: Double?
    var place: String?
    var address: String?
    var durationMinutes: Int?
    var accuracy: Int?

    // Purchase fields
    var merchant: String?
    var amount: Double?
    var items: [String]?
    var category: String?
    var deliveryAddress: String?
    var deliveryDate: String?

    // Activity fields
    var activityType: String?
    var calories: Int?
    var steps: Int?

    // Photo fields
    var filename: String?
    var location: String?
    var peopleCount: Int?
    var mood: String?

    enum CodingKeys: String, CodingKey {
        case lat, lng, place, address, accuracy
        case durationMinutes = "duration_minutes"
        case merchant, amount, items, category
        case deliveryAddress = "delivery_address"
        case deliveryDate = "delivery_date"
        case activityType = "activity_type"
        case calories, steps
        case filename, location
        case peopleCount = "people_count"
        case mood
    }
}

struct WeeklyStats {
    var locationsVisited: Int = 0
    var purchases: Int = 0
    var totalSpent: Double = 0
    var photos: Int = 0
    var steps: Int = 0

    var formattedSpending: String {
        return String(format: "$%.0f", totalSpent)
    }
}

// API Response models
struct TimelineResponse: Codable {
    let success: Bool
    let events: [TimelineEventDTO]
    let count: Int
    let dateRange: DateRange

    struct DateRange: Codable {
        let start: String
        let end: String
    }
}

struct TimelineEventDTO: Codable {
    let id: String
    let type: String
    let timestamp: String
    let data: EventData
    let source: String

    func toTimelineEvent() -> TimelineEvent? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        // Try with fractional seconds first, then without
        var date: Date?
        date = formatter.date(from: timestamp)
        if date == nil {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: timestamp)
        }

        guard let eventDate = date,
              let eventType = TimelineEvent.EventType(rawValue: type) else {
            return nil
        }

        return TimelineEvent(
            id: id,
            type: eventType,
            timestamp: eventDate,
            data: data,
            source: source
        )
    }
}

struct InsightsResponse: Codable {
    let success: Bool
    let weekNumber: Int
    let summary: String?
    let coachInsight: String?
    let reflectionPrompts: [String]
    let eventCount: Int
}

struct AuthResponse: Codable {
    let success: Bool
    let token: String
    let refreshToken: String
    let user: UserData

    struct UserData: Codable {
        let id: String
        let email: String
        let name: String?
        let picture: String?
    }
}
