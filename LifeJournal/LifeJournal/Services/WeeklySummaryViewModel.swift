// WeeklySummaryViewModel.swift
// View model for weekly summary view

import SwiftUI

@MainActor
class WeeklySummaryViewModel: ObservableObject {
    @Published var weekNumber: Int = 1
    @Published var stats = WeeklyStats()
    @Published var summary: String?
    @Published var coachInsight: String?
    @Published var reflectionPrompts: [String] = []
    @Published var isLoading = false
    @Published var error: String?

    private let syncService = SyncService.shared

    init() {
        weekNumber = Calendar.current.component(.weekOfYear, from: Date())
    }

    func loadData() {
        // Load demo data initially
        loadDemoData()

        // Try to fetch real data
        Task {
            await refreshAsync()
        }
    }

    func refresh() {
        Task {
            await refreshAsync()
        }
    }

    func refreshAsync() async {
        guard !isLoading else { return }

        isLoading = true
        error = nil

        do {
            guard let token = KeychainHelper.get(key: "auth_token") else {
                // Use demo data if not authenticated
                loadDemoData()
                isLoading = false
                return
            }

            let insights = try await syncService.getWeeklyInsights(token: token)

            weekNumber = insights.weekNumber
            summary = insights.summary
            coachInsight = insights.coachInsight
            reflectionPrompts = insights.reflectionPrompts

            // Calculate stats from events
            let events = try await syncService.getTimeline(token: token)
            calculateStats(from: events)

        } catch {
            self.error = error.localizedDescription
            // Keep demo data on error
        }

        isLoading = false
    }

    private func loadDemoData() {
        let demoInsights = syncService.getDemoInsights()

        weekNumber = demoInsights.weekNumber
        summary = demoInsights.summary
        coachInsight = demoInsights.coachInsight
        reflectionPrompts = demoInsights.reflectionPrompts

        // Demo stats
        stats = WeeklyStats(
            locationsVisited: 8,
            purchases: 5,
            totalSpent: 245.67,
            photos: 12,
            steps: 42000
        )
    }

    private func calculateStats(from events: [TimelineEvent]) {
        let locations = events.filter { $0.type == .location }
        let purchases = events.filter { $0.type == .purchase }

        let uniquePlaces = Set(locations.compactMap { $0.data.place })
        let totalSpent = purchases.compactMap { $0.data.amount }.reduce(0, +)

        stats = WeeklyStats(
            locationsVisited: uniquePlaces.count,
            purchases: purchases.count,
            totalSpent: totalSpent,
            photos: events.filter { $0.type == .photo }.count,
            steps: 0
        )
    }
}
