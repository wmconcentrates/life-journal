// AuthService.swift
// Authentication service for Google OAuth and JWT management

import SwiftUI
import AuthenticationServices

@MainActor
class AuthService: ObservableObject {
    @Published var isAuthenticated = false
    @Published var userEmail: String?
    @Published var userId: String?

    private let baseURL = "http://localhost:3001"
    private let tokenKey = "auth_token"
    private let refreshTokenKey = "refresh_token"
    private let userEmailKey = "user_email"
    private let userIdKey = "user_id"

    init() {
        // Check for existing token
        loadStoredAuth()
    }

    private func loadStoredAuth() {
        if let token = KeychainHelper.get(key: tokenKey),
           let email = UserDefaults.standard.string(forKey: userEmailKey) {
            self.isAuthenticated = true
            self.userEmail = email
            self.userId = UserDefaults.standard.string(forKey: userIdKey)
        }
    }

    func signInWithGoogle() async throws {
        // In a real app, this would use ASWebAuthenticationSession
        // For now, we redirect to the backend OAuth URL
        guard let url = URL(string: "\(baseURL)/auth/google") else {
            throw AuthError.invalidURL
        }

        // Get the OAuth URL from backend
        let (data, _) = try await URLSession.shared.data(from: url)
        let response = try JSONDecoder().decode(OAuthURLResponse.self, from: data)

        // Open OAuth URL in browser
        if let oauthURL = URL(string: response.url) {
            await UIApplication.shared.open(oauthURL)
        }
    }

    func signInDemo() async throws {
        guard let url = URL(string: "\(baseURL)/auth/mock") else {
            throw AuthError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["email": "demo@lifejournal.app"])

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw AuthError.serverError
        }

        let authResponse = try JSONDecoder().decode(AuthResponse.self, from: data)

        // Store credentials
        try storeAuth(authResponse)
    }

    func handleCallback(url: URL) {
        // Parse callback URL for auth code
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let code = components.queryItems?.first(where: { $0.name == "code" })?.value else {
            return
        }

        Task {
            do {
                try await exchangeCodeForToken(code: code)
            } catch {
                print("Auth callback error: \(error)")
            }
        }
    }

    private func exchangeCodeForToken(code: String) async throws {
        guard let url = URL(string: "\(baseURL)/auth/callback/google") else {
            throw AuthError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["code": code, "redirect_uri": "lifejournal://callback"]
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw AuthError.serverError
        }

        let authResponse = try JSONDecoder().decode(AuthResponse.self, from: data)
        try storeAuth(authResponse)
    }

    private func storeAuth(_ response: AuthResponse) throws {
        KeychainHelper.save(key: tokenKey, value: response.token)
        KeychainHelper.save(key: refreshTokenKey, value: response.refreshToken)
        UserDefaults.standard.set(response.user.email, forKey: userEmailKey)
        UserDefaults.standard.set(response.user.id, forKey: userIdKey)

        self.isAuthenticated = true
        self.userEmail = response.user.email
        self.userId = response.user.id
    }

    func signOut() {
        KeychainHelper.delete(key: tokenKey)
        KeychainHelper.delete(key: refreshTokenKey)
        UserDefaults.standard.removeObject(forKey: userEmailKey)
        UserDefaults.standard.removeObject(forKey: userIdKey)

        self.isAuthenticated = false
        self.userEmail = nil
        self.userId = nil
    }

    func getAuthToken() -> String? {
        return KeychainHelper.get(key: tokenKey)
    }

    enum AuthError: LocalizedError {
        case invalidURL
        case serverError
        case noToken

        var errorDescription: String? {
            switch self {
            case .invalidURL: return "Invalid server URL"
            case .serverError: return "Server error occurred"
            case .noToken: return "No authentication token"
            }
        }
    }
}

struct OAuthURLResponse: Codable {
    let url: String
}

// Simple Keychain helper
class KeychainHelper {
    static func save(key: String, value: String) {
        let data = value.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]

        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    static func get(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        SecItemCopyMatching(query as CFDictionary, &result)

        guard let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }
}
