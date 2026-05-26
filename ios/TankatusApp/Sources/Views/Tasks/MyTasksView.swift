import SwiftUI

struct MyTasksView: View {
    @StateObject private var vm = TasksViewModel()
    @State private var filterStatus = ""

    var filtered: [ProjectTask] {
        filterStatus.isEmpty ? vm.tasks : vm.tasks.filter { $0.status == filterStatus }
    }

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading {
                    ProgressView("Загрузка...")
                } else if filtered.isEmpty {
                    ContentUnavailableView("Нет активных задач", systemImage: "checkmark.circle")
                } else {
                    List(filtered) { task in
                        MyTaskRow(task: task) { newStatus in
                            Task { await vm.updateStatus(taskId: task.id, status: newStatus) }
                        }
                        .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Мои задачи")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button("Все")            { filterStatus = "" }
                        Divider()
                        Button("К выполнению")   { filterStatus = "todo" }
                        Button("В работе")       { filterStatus = "in_progress" }
                        Button("На ревью")       { filterStatus = "review" }
                    } label: {
                        Image(systemName: filterStatus.isEmpty
                              ? "line.3.horizontal.decrease.circle"
                              : "line.3.horizontal.decrease.circle.fill")
                    }
                }
            }
            .safeAreaInset(edge: .top) {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        filterChip("Все",           tag: "")
                        filterChip("К выполнению",  tag: "todo")
                        filterChip("В работе",      tag: "in_progress")
                        filterChip("На ревью",      tag: "review")
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 8)
                }
                .background(Color(.systemGroupedBackground))
            }
            .task { await vm.load() }
            .refreshable { await vm.load() }
        }
    }

    @ViewBuilder
    private func filterChip(_ label: String, tag: String) -> some View {
        Button(label) { filterStatus = tag }
            .font(.caption).fontWeight(.medium)
            .padding(.horizontal, 12).padding(.vertical, 6)
            .background(filterStatus == tag ? Color.blue : Color(.systemBackground))
            .foregroundColor(filterStatus == tag ? .white : .primary)
            .clipShape(Capsule())
            .shadow(color: .black.opacity(0.05), radius: 2)
    }
}

struct MyTaskRow: View {
    let task: ProjectTask
    let onStatusChange: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let project = task.project_name {
                HStack(spacing: 4) {
                    Image(systemName: "folder").font(.caption2).foregroundColor(.blue)
                    Text(project).font(.caption).foregroundColor(.blue).fontWeight(.medium)
                    if let stage = task.stage_name {
                        Text("/ \(stage)").font(.caption).foregroundColor(.secondary)
                    }
                }
            }
            Text(task.title).font(.subheadline).fontWeight(.semibold)
            if let desc = task.description, !desc.isEmpty {
                Text(desc).font(.caption).foregroundColor(.secondary).lineLimit(2)
            }
            HStack {
                StatusBadge(status: task.status)
                PriorityBadge(priority: task.priority)
                if let est = task.estimated_hours {
                    Text("\(Int(task.actual_hours ?? 0))/\(Int(est))ч")
                        .font(.caption2).foregroundColor(.secondary)
                }
                Spacer()
                if let due = task.due_date {
                    Text(due.toDisplayDate())
                        .font(.caption2)
                        .foregroundColor(task.isOverdue ? .red : .secondary)
                        .fontWeight(task.isOverdue ? .semibold : .regular)
                }
            }
            if task.status != "done" {
                HStack(spacing: 8) {
                    if task.status == "todo" {
                        actionButton("В работу", color: .blue)   { onStatusChange("in_progress") }
                    }
                    if task.status == "in_progress" {
                        actionButton("На ревью", color: .purple) { onStatusChange("review") }
                    }
                    if task.status == "review" {
                        actionButton("Готово",   color: .green)  { onStatusChange("done") }
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
    private func actionButton(_ label: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.caption).fontWeight(.semibold)
                .padding(.horizontal, 12).padding(.vertical, 5)
                .background(color.opacity(0.1))
                .foregroundColor(color)
                .clipShape(Capsule())
        }
    }
}
