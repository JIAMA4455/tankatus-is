import SwiftUI

struct ProjectsView: View {
    @StateObject private var vm = ProjectsViewModel()
    @EnvironmentObject var authStore: AuthStore
    @State private var search = ""
    @State private var filterStatus = ""
    @State private var showCreateForm = false
    @State private var editingProject: Project?

    private var canManage: Bool {
        let role = authStore.currentUser?.role ?? ""
        return role == "admin" || role == "manager"
    }

    var filtered: [Project] {
        vm.projects.filter {
            (search.isEmpty || $0.name.localizedCaseInsensitiveContains(search)) &&
            (filterStatus.isEmpty || $0.status == filterStatus)
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading {
                    ProgressView("Загрузка...")
                } else if filtered.isEmpty {
                    ContentUnavailableView("Проекты не найдены", systemImage: "folder")
                } else {
                    List {
                        ForEach(filtered) { project in
                            NavigationLink(destination: ProjectDetailView(projectId: project.id).environmentObject(authStore)) {
                                ProjectListRow(project: project)
                            }
                            .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                            .contextMenu {
                                if canManage {
                                    Button { editingProject = project } label: {
                                        Label("Редактировать", systemImage: "pencil")
                                    }
                                    Button(role: .destructive) {
                                        vm.deleteProject(id: project.id)
                                    } label: {
                                        Label("Удалить", systemImage: "trash")
                                    }
                                }
                            }
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                if canManage {
                                    Button(role: .destructive) {
                                        vm.deleteProject(id: project.id)
                                    } label: {
                                        Label("Удалить", systemImage: "trash")
                                    }
                                    Button {
                                        editingProject = project
                                    } label: {
                                        Label("Изменить", systemImage: "pencil")
                                    }
                                    .tint(.orange)
                                }
                            }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Проекты")
            .searchable(text: $search, prompt: "Поиск проекта...")
            .toolbar {
                if canManage {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Button { showCreateForm = true } label: {
                            Image(systemName: "plus")
                        }
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button("Все") { filterStatus = "" }
                        Divider()
                        Button("Планирование") { filterStatus = "planning" }
                        Button("Активные")     { filterStatus = "active" }
                        Button("На паузе")     { filterStatus = "on_hold" }
                        Button("Завершённые")  { filterStatus = "completed" }
                    } label: {
                        Image(systemName: filterStatus.isEmpty
                              ? "line.3.horizontal.decrease.circle"
                              : "line.3.horizontal.decrease.circle.fill")
                    }
                }
            }
            .task { await vm.load() }
            .refreshable { await vm.load() }
            .sheet(isPresented: $showCreateForm) {
                ProjectFormView(editingProject: nil) { name, desc, status, priority, start, end, budget in
                    vm.createProject(name: name, description: desc, status: status, priority: priority,
                                     startDate: start, endDate: end, budget: budget)
                }
            }
            .sheet(item: $editingProject) { project in
                ProjectFormView(editingProject: project) { name, desc, status, priority, start, end, budget in
                    vm.updateProject(id: project.id, name: name, description: desc,
                                     status: status, priority: priority,
                                     startDate: start, endDate: end, budget: budget)
                }
            }
        }
    }
}

struct ProjectListRow: View {
    let project: Project

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(project.name)
                        .font(.subheadline).fontWeight(.semibold)
                    if let desc = project.description {
                        Text(desc).font(.caption).foregroundColor(.secondary).lineLimit(2)
                    }
                }
                Spacer()
                PriorityBadge(priority: project.priority)
            }

            let total = project.total_tasks ?? 0
            let done  = project.done_tasks ?? 0
            ProgressView(value: project.progress)
                .tint(project.progress >= 1 ? .green : .blue)
            HStack {
                Text("\(done)/\(total) задач").font(.caption).foregroundColor(.secondary)
                Spacer()
                StatusBadge(status: project.status)
            }

            if let mgr = project.manager_name {
                HStack(spacing: 4) {
                    Image(systemName: "person.circle").font(.caption).foregroundColor(.secondary)
                    Text(mgr).font(.caption).foregroundColor(.secondary)
                    Spacer()
                    if let end = project.end_date {
                        Text(end.toDisplayDate())
                            .font(.caption)
                            .foregroundColor(project.isOverdue ? .red : .secondary)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(14)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}
