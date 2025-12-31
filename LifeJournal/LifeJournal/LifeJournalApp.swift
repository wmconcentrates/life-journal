// LifeJournalApp.swift
// Life Journal MVP

import SwiftUI

@main
struct LifeJournalApp: App {
    @StateObject private var authService = AuthService()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authService)
                .onOpenURL { url in
                    // Handle OAuth callback
                    authService.handleCallback(url: url)
                }
        }
    }
}
