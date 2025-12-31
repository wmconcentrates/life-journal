// TimelineViewModel.swift
// View model for timeline view

import SwiftUI

@MainActor
class TimelineViewModel: ObservableObject {
    @Published var events: [TimelineEvent] = []
    @Published var isLoading = false
    @Published var isSyncing = false
    @Published var error: String?

    private let syncService = SyncService.shared

    func loadEvents() {
        // Load demo data initially
        if events.isEmpty {
            events = syncService.getDemoTimeline()
        }
    }

    func eventsForDate(_ date: Date) -> [TimelineEvent] {
        let calendar = Calendar.current
        return events.filter { event in
            calendar.isDate(event.timestamp, inSameDayAs: date)
        }.sorted { $0.timestamp > $1.timestamp }
    }

    func sync() {
        Task {
            await syncAsync()
        }
    }

    func syncAsync() async {
        guard !isSyncing else { return }

        isSyncing = true
        error = nil

        do {
            // Get auth token
            guard let token = KeychainHelper.get(key: "auth_token") else {
                // Use demo data if not authenticated
                events = syncService.getDemoTimeline()
                isSyncing = false
                return
            }

            // Sync with backend
            _ = try await syncService.syncData(token: token)

            // Fetch updated timeline
            let fetchedEvents = try await syncService.getTimeline(token: token)
            events = fetchedEvents

        } catch {
            self.error = error.localizedDescription
            // Fall back to demo data on error
            if events.isEmpty {
                events = syncService.getDemoTimeline()
            }
        }

        isSyncing = false
    }
}
