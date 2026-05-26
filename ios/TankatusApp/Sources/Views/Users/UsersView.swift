import SwiftUI

struct UsersView: View {
    @StateObject private var vm = UsersViewModel()
    @State private var search = ""

    var filtered: [User] {
        search.isEmpty ? vm.users : vm.users.filter {
            $0.full_name.localizedCaseInsensitiveContains(search) ||
            $0.email.localizedCaseInsensitiveContains(search)
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading {
                    ProgressView("Загрузка...")
                } else {
                    List(filtered) { user in
                        UserCard(user: user, load: vm.loadFor(user.id))
                            .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Команда")
            .searchable(text: $search, prompt: "Поиск по имени...")
            .task { await vm.load() }
            .refreshable { await vm.load() }
        }
    }
}

struct UserCard: View {
    let user: User
    let load: UserLoad?

    private let roleColors: [String: Color] = [
        "admin": .red, "manager": .blue, "developer": .green,
        "analyst": .orange, "viewer": .gray
    ]

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                InitialsAvatar(initials: user.initials, size: 44,
                               color: roleColors[user.role] ?? .blue)

                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text(user.full_name).font(.subheadline).fontWeight(.semibold)
                        if !user.is_active {
                            Text("Неактивен").font(.caption2).foregroundColor(.red)
                                .padding(.horizontal, 6).padding(.vertical, 2)
                                .background(Color.red.opacity(0.1)).clipShape(Capsule())
                        }
                    }
                    Text(user.email).font(.caption).foregroundColor(.secondary)
                    HStack(spacing: 6) {
                        Text(user.displayRole)
                            .font(.caption2).fontWeight(.semibold)
                            .padding(.horizontal, 7).padding(.vertical, 2)
                            .background((roleColors[user.role] ?? .blue).opacity(0.1))
                            .foregroundColor(roleColors[user.role] ?? .blue)
                            .clipShape(Capsule())
                        if let dept = user.department {
                            Text(dept).font(.caption2).foregroundColor(.secondary)
                        }
                    }
                }
                Spacer()
            }

            if let ld = load {
                Divider()
                HStack(spacing: 0) {
                    loadStat(value: "\(Int(ld.total_planned ?? 0))", label: "Плановые ч")
                    Divider().frame(height: 30)
                    loadStat(value: "\(Int(ld.total_actual ?? 0))", label: "Фактические ч")
                    Divider().frame(height: 30)
                    loadStat(value: "\(ld.active_tasks ?? 0)", label: "Задач")
                }

                let planned = ld.total_planned ?? 0
                let actual  = ld.total_actual ?? 0
                if planned > 0 {
                    let ratio = actual / planned
                    VStack(alignment: .leading, spacing: 3) {
                        HStack {
                            Text("Загрузка").font(.caption2).foregroundColor(.secondary)
                            Spacer()
                            Text("\(Int(ratio * 100))%").font(.caption2).fontWeight(.medium)
                                .foregroundColor(ratio > 1.1 ? .red : .primary)
                        }
                        ProgressView(value: min(ratio, 1.0))
                            .tint(ratio > 1.1 ? .red : .blue)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(14)
        .shadow(color: .black.opacity(0.05), radius: 4)
    }

    @ViewBuilder
    private func loadStat(value: String, label: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.subheadline).fontWeight(.bold)
            Text(label).font(.caption2).foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}
