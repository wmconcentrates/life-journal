// SyncService.swift
// Handles data synchronization with backend

import Foundation

class SyncService {
    static let shared = SyncService()

    private let baseURL = "http://localhost:3001"

    private init() {}

    func syncData(token: String) async throws -> SyncResult {
        guard let url = URL(string: "\(baseURL)/api/sync") else {
            throw SyncError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw SyncError.invalidResponse
        }

        if httpResponse.statusCode == 401 {
            throw SyncError.unauthorized
        }

        if httpResponse.statusCode != 200 {
            throw SyncError.serverError(httpResponse.statusCode)
        }

        return try JSONDecoder().decode(SyncResult.self, from: data)
    }

    func getTimeline(token: String, start: String? = nil, end: String? = nil) async throws -> [TimelineEvent] {
        var urlString = "\(baseURL)/api/timeline"
        if let start = start, let end = end {
            urlString += "?start=\(start)&end=\(end)"
        }

        guard let url = URL(string: urlString) else {
            throw SyncError.invalidURL
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw SyncError.serverError((response as? HTTPURLResponse)?.statusCode ?? 0)
        }

        let timelineResponse = try JSONDecoder().decode(TimelineResponse.self, from: data)
        return timelineResponse.events.compactMap { $0.toTimelineEvent() }
    }

    func getWeeklyInsights(token: String) async throws -> InsightsResponse {
        guard let url = URL(string: "\(baseURL)/api/insights/weekly") else {
            throw SyncError.invalidURL
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw SyncError.serverError((response as? HTTPURLResponse)?.statusCode ?? 0)
        }

        return try JSONDecoder().decode(InsightsResponse.self, from: data)
    }

    // Get demo data when not authenticated
    func getDemoTimeline() -> [TimelineEvent] {
        let calendar = Calendar.current
        let today = Date()

        return [
            TimelineEvent(
                id: "demo-1",
                type: .location,
                timestamp: calendar.date(byAdding: .hour, value: -2, to: today)!,
                data: EventData(place: "Coffee Shop", address: "Downtown Denver", durationMinutes: 45),
                source: "demo"
            ),
            TimelineEvent(
                id: "demo-2",
                type: .purchase,
                timestamp: calendar.date(byAdding: .hour, value: -4, to: today)!,
                data: EventData(merchant: "Amazon", amount: 45.99, items: ["Book", "Headphones"]),
                source: "demo"
            ),
            TimelineEvent(
                id: "demo-3",
                type: .location,
                timestamp: calendar.date(byAdding: .hour, value: -6, to: today)!,
                data: EventData(place: "Home", address: "Denver, CO", durationMinutes: 480),
                source: "demo"
            ),
            TimelineEvent(
                id: "demo-4",
                type: .purchase,
                timestamp: calendar.date(byAdding: .day, value: -1, to: today)!,
                data: EventData(merchant: "Whole Foods", amount: 87.23, items: ["Groceries"]),
                source: "demo"
            ),
            TimelineEvent(
                id: "demo-5",
                type: .location,
                timestamp: calendar.date(byAdding: .day, value: -1, to: today)!,
                data: EventData(place: "Gym", address: "Fitness Center", durationMinutes: 60),
                source: "demo"
            )
        ]
    }

    func getDemoInsights() -> InsightsResponse {
        return InsightsResponse(
            success: true,
            weekNumber: Calendar.current.component(.weekOfYear, from: Date()),
            summary: "This week you visited 8 unique locations, spending most of your time at home and work. Your activity level was moderate with visits to the gym and a coffee shop. Shopping was focused on household items and groceries.",
            coachInsight: "Great job maintaining your gym routine this week! I noticed you're spending quality time at home, which shows good balance. One small suggestion: try exploring a new neighborhood or coffee shop next week to add some variety to your routine.",
            reflectionPrompts: [
                "What moment from this week are you most grateful for?",
                "If you could do one thing differently next week, what would it be?",
                "Who did you connect with this week that made you feel good?"
            ],
            eventCount: 35
        )
    }
}

struct SyncResult: Codable {
    let success: Bool
    let eventsAdded: Int
    let errors: [String]
}

enum SyncError: LocalizedError {
    case invalidURL
    case invalidResponse
    case unauthorized
    case serverError(Int)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .invalidResponse: return "Invalid response from server"
        case .unauthorized: return "Session expired. Please sign in again."
        case .serverError(let code): return "Server error: \(code)"
        }
    }
}
