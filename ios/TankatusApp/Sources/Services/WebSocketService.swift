import Foundation
import Combine

enum SocketEvent: String {
    case taskCreated     = "task:created"
    case taskUpdated     = "task:updated"
    case taskDeleted     = "task:deleted"
    case projectUpdated  = "project:updated"
    case projectsChanged = "projects:changed"
}

final class WebSocketService: ObservableObject {
    static let shared = WebSocketService()

    let eventPublisher = PassthroughSubject<(event: String, data: String), Never>()
    @Published var isConnected = false

    private init() {}

    func connect(token: String) {
        isConnected = true
    }

    func disconnect() {
        isConnected = false
    }

    func joinProject(_ projectId: String) {}

    func leaveProject(_ projectId: String) {}
}
