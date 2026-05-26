import Foundation
import Combine

final class AuthStore: ObservableObject {
    static let shared = AuthStore()

    @Published var token: String? {
        didSet { UserDefaults.standard.set(token, forKey: "auth_token") }
    }
    @Published var currentUser: User?

    var isAuthenticated: Bool { token != nil }

    private init() {
        let savedToken = UserDefaults.standard.string(forKey: "auth_token")
        if let t = savedToken, t.hasPrefix("local_") {
            let userId = String(t.dropFirst("local_".count))
            currentUser = LocalDataStore.shared.users.first { $0.id == userId }
            token = currentUser != nil ? t : nil
        }
    }

    func login(email: String, password: String) async throws {
        guard let user = LocalDataStore.shared.users.first(where: { $0.email == email }) else {
            throw APIError.serverError("Пользователь не найден")
        }
        guard password == "Admin123!" else {
            throw APIError.serverError("Неверный пароль")
        }
        await MainActor.run {
            self.currentUser = user
            self.token = "local_\(user.id)"
        }
    }

    func logout() {
        token = nil
        currentUser = nil
        UserDefaults.standard.removeObject(forKey: "auth_token")
    }

    func fetchMe() async {}
}
