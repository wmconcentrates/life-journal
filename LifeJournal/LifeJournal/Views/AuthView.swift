// AuthView.swift
// Login screen with Google OAuth

import SwiftUI

struct AuthView: View {
    @EnvironmentObject var authService: AuthService
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationView {
            VStack(spacing: 40) {
                Spacer()

                // Logo and title
                VStack(spacing: 16) {
                    Image(systemName: "book.closed.fill")
                        .font(.system(size: 80))
                        .foregroundColor(.blue)

                    Text("Life Journal")
                        .font(.largeTitle)
                        .fontWeight(.bold)

                    Text("Your personal life timeline")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Login buttons
                VStack(spacing: 16) {
                    // Google Sign In
                    Button(action: signInWithGoogle) {
                        HStack {
                            Image(systemName: "g.circle.fill")
                                .font(.title2)
                            Text("Continue with Google")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.white)
                        .foregroundColor(.black)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                        )
                    }
                    .disabled(isLoading)

                    // Demo mode button
                    Button(action: signInDemo) {
                        HStack {
                            Image(systemName: "play.circle.fill")
                                .font(.title2)
                            Text("Try Demo Mode")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(isLoading)

                    if isLoading {
                        ProgressView()
                            .padding()
                    }

                    if let error = errorMessage {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                            .multilineTextAlignment(.center)
                    }
                }
                .padding(.horizontal, 32)

                Spacer()

                // Privacy note
                Text("Your data is encrypted and private")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.bottom, 32)
            }
            .background(Color(.systemGroupedBackground))
        }
    }

    private func signInWithGoogle() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await authService.signInWithGoogle()
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }

    private func signInDemo() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await authService.signInDemo()
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}

#Preview {
    AuthView()
        .environmentObject(AuthService())
}
