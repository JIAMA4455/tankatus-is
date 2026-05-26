import SwiftUI
import Charts

struct DashboardView: View {
    @StateObject private var vm = DashboardViewModel()
    @EnvironmentObject var authStore: AuthStore

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading {
                    ProgressView("Загрузка...")
                } else if let stats = vm.stats {
                    ScrollView {
                        VStack(spacing: 20) {
                            statsGrid(stats)
                            if !stats.recent_active_projects.isEmpty {
                                activeProjectsSection(stats.recent_active_projects)
                            }
                            tasksPieSection(stats)
                        }
                        .padding()
                    }
                } else {
                    ContentUnavailableView("Нет данных", systemImage: "chart.bar")
                }
            }
            .navigationTitle("Дашборд")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    if let user = authStore.currentUser {
                        InitialsAvatar(initials: user.initials, size: 32)
                    }
                }
            }
            .task { await vm.load() }
            .refreshable { await vm.load() }
        }
    }

    @ViewBuilder
    private func statsGrid(_ stats: DashboardStats) -> some View {
        let total  = stats.project_stats.reduce(0) { $0 + $1.count }
        let active = stats.project_stats.first { $0.status == "active" }?.count ?? 0
        let totalT = stats.task_stats.reduce(0) { $0 + $1.count }

        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            StatCard(title: "Всего проектов",    value: "\(total)",              subtitle: "в системе")
            StatCard(title: "Активных",          value: "\(active)",             subtitle: "в работе",     color: .green)
            StatCard(title: "Всего задач",        value: "\(totalT)",             subtitle: "в системе",    color: .purple)
            StatCard(title: "Просрочено задач",  value: "\(stats.overdue_tasks)", subtitle: "требуют внимания", color: .red)
        }
    }

    @ViewBuilder
    private func activeProjectsSection(_ projects: [Project]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Активные проекты")
                .font(.headline)
            ForEach(projects) { project in
                NavigationLink(destination: ProjectDetailView(projectId: project.id)) {
                    ProjectRowCard(project: project)
                }
                .buttonStyle(.plain)
            }
        }
    }

    @ViewBuilder
    private func tasksPieSection(_ stats: DashboardStats) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Задачи по статусам").font(.headline)
            let taskData = stats.task_stats.filter { $0.count > 0 }
            if !taskData.isEmpty {
                Chart(taskData, id: \.status) { item in
                    SectorMark(
                        angle: .value("Количество", item.count),
                        innerRadius: .ratio(0.5),
                        angularInset: 2
                    )
                    .foregroundStyle(by: .value("Статус", item.status))
                }
                .frame(height: 200)
                .chartLegend(.visible)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4)
    }
}

struct ProjectRowCard: View {
    let project: Project

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(project.name)
                    .font(.subheadline).fontWeight(.semibold)
                    .lineLimit(1)
                Spacer()
                PriorityBadge(priority: project.priority)
            }
            ProgressRow(label: "Прогресс", value: project.progress)
            HStack {
                StatusBadge(status: project.status)
                Spacer()
                if let end = project.end_date {
                    Text(end.toDisplayDate())
                        .font(.caption)
                        .foregroundColor(project.isOverdue ? .red : .secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4)
    }
}
