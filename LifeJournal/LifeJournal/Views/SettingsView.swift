// SettingsView.swift
// App settings and integrations

import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var authService: AuthService
    @State private var showingLogoutAlert = false

    var body: some View {
        NavigationView {
            List {
                // Account section
                Section("Account") {
                    HStack {
                        Image(systemName: "person.circle.fill")
                            .font(.title)
                            .foregroundColor(.blue)

                        VStack(alignment: .leading) {
                            Text(authService.userEmail ?? "User")
                                .font(.headline)
                            Text("Signed in")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }

                // Integrations section
                Section("Connected Services") {
                    IntegrationRow(
                        name: "Google Maps",
                        icon: "map.fill",
                        color: .green,
                        isConnected: true
                    )

                    IntegrationRow(
                        name: "Amazon",
                        icon: "cart.fill",
                        color: .orange,
                        isConnected: false
                    )

                    IntegrationRow(
                        name: "Photos",
                        icon: "photo.fill",
                        color: .purple,
                        isConnected: true
                    )
                }

                // Sync section
                Section("Data") {
                    Button(action: syncNow) {
                        Label("Sync Now", systemImage: "arrow.triangle.2.circlepath")
                    }

                    NavigationLink(destination: DataPrivacyView()) {
                        Label("Privacy & Data", systemImage: "lock.shield")
                    }
                }

                // About section
                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }

                    NavigationLink(destination: Text("Help content")) {
                        Label("Help", systemImage: "questionmark.circle")
                    }
                }

                // Logout section
                Section {
                    Button(role: .destructive, action: { showingLogoutAlert = true }) {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .navigationTitle("Settings")
            .alert("Sign Out", isPresented: $showingLogoutAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Sign Out", role: .destructive) {
                    authService.signOut()
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
        }
    }

    private func syncNow() {
        // Trigger sync
    }
}

struct IntegrationRow: View {
    let name: String
    let icon: String
    let color: Color
    let isConnected: Bool

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(color)
                .frame(width: 28)

            Text(name)

            Spacer()

            if isConnected {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
            } else {
                Button("Connect") {
                    // Connect integration
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
            }
        }
    }
}

struct DataPrivacyView: View {
    var body: some View {
        List {
            Section("Encryption") {
                HStack {
                    Image(systemName: "lock.fill")
                        .foregroundColor(.green)
                    Text("All data is encrypted")
                }

                Text("Your personal data is encrypted using AES-256-GCM encryption before being stored. Only you can access your data.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Section("Data Storage") {
                Text("Location history")
                Text("Purchase history")
                Text("Photos metadata")
                Text("Weekly summaries")
            }

            Section {
                Button(role: .destructive, action: {}) {
                    Label("Delete All Data", systemImage: "trash")
                }
            }
        }
        .navigationTitle("Privacy & Data")
    }
}

#Preview {
    SettingsView()
        .environmentObject(AuthService())
}
