import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var authStore: AuthStore

    private var user: User? { authStore.currentUser }

    private let roleLabels: [String: String] = [
        "admin":   "Администратор",
        "manager": "Менеджер",
        "worker":  "Работник",
        "viewer":  "Наблюдатель",
    ]

    private let roleColors: [String: Color] = [
        "admin":   .red,
        "manager": .blue,
        "worker":  .green,
        "viewer":  .gray,
    ]

    var body: some View {
        NavigationView {
            List {
                // ── Avatar + name ──
                Section {
                    HStack(spacing: 16) {
                        ZStack {
                            Circle()
                                .fill(Color.blue.opacity(0.15))
                                .frame(width: 64, height: 64)
                            Text(initials)
                                .font(.title2.bold())
                                .foregroundColor(.blue)
                        }
                        VStack(alignment: .leading, spacing: 4) {
                            Text(user?.full_name ?? "—")
                                .font(.headline)
                            Text(user?.email ?? "—")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            if let role = user?.role {
                                Text(roleLabels[role] ?? role)
                                    .font(.caption)
                                    .foregroundColor(roleColors[role] ?? .gray)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 2)
                                    .background((roleColors[role] ?? .gray).opacity(0.12))
                                    .clipShape(Capsule())
                            }
                        }
                    }
                    .padding(.vertical, 8)
                }

                // ── User details ──
                Section("Информация") {
                    if let dept = user?.department, !dept.isEmpty {
                        LabeledContent("Отдел", value: dept)
                    }
                    LabeledContent("Email", value: user?.email ?? "—")
                }

                Section("Система") {
                    HStack {
                        Text("Режим")
                        Spacer()
                        HStack(spacing: 6) {
                            Circle()
                                .fill(Color.green)
                                .frame(width: 8, height: 8)
                            Text("Локальный режим")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                }

                // ── Logout ──
                Section {
                    Button(role: .destructive) {
                        WebSocketService.shared.disconnect()
                        authStore.logout()
                    } label: {
                        HStack {
                            Spacer()
                            Label("Выйти из аккаунта", systemImage: "rectangle.portrait.and.arrow.right")
                                .font(.body.bold())
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Профиль")
        }
    }

    private var initials: String {
        guard let name = user?.full_name else { return "?" }
        return name.split(separator: " ")
            .prefix(2)
            .compactMap { $0.first.map { String($0) } }
            .joined()
    }
}
