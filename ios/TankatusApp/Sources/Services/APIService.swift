import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case noData
    case decodingError(Error)
    case serverError(String)
    case unauthorized

    var errorDescription: String? {
        switch self {
        case .invalidURL:           return "Неверный URL"
        case .noData:               return "Нет данных"
        case .decodingError(let e): return "Ошибка декодирования: \(e.localizedDescription)"
        case .serverError(let m):   return m
        case .unauthorized:         return "Требуется авторизация"
        }
    }
}

final class APIService {
    static let shared = APIService()
    private init() {}

    private var baseURL: String {
        Constants.baseURL
    }

    private func makeRequest(_ path: String, method: String = "GET", body: Data? = nil) -> URLRequest? {
        guard let url = URL(string: baseURL + path) else { return nil }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = AuthStore.shared.token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = body
        return request
    }

    private func perform<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.noData }
        if http.statusCode == 401 { throw APIError.unauthorized }
        if !(200..<300).contains(http.statusCode) {
            let msg = (try? JSONDecoder().decode([String: String].self, from: data))?["error"] ?? "Ошибка сервера"
            throw APIError.serverError(msg)
        }
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    func get<T: Decodable>(_ path: String) async throws -> T {
        guard let req = makeRequest(path) else { throw APIError.invalidURL }
        return try await perform(req)
    }

    func post<T: Decodable>(_ path: String, body: Encodable) async throws -> T {
        let data = try JSONEncoder().encode(body)
        guard let req = makeRequest(path, method: "POST", body: data) else { throw APIError.invalidURL }
        return try await perform(req)
    }

    func put<T: Decodable>(_ path: String, body: Encodable) async throws -> T {
        let data = try JSONEncoder().encode(body)
        guard let req = makeRequest(path, method: "PUT", body: data) else { throw APIError.invalidURL }
        return try await perform(req)
    }

    func delete(_ path: String) async throws {
        guard let req = makeRequest(path, method: "DELETE") else { throw APIError.invalidURL }
        let (_, _) = try await URLSession.shared.data(for: req)
    }
}
