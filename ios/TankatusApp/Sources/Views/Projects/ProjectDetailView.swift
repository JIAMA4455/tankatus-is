import SwiftUI

struct ProjectDetailView: View {
    let projectId: String
    @StateObject private var vm = ProjectDetailViewModel()
    @EnvironmentObject var authStore: AuthStore
    @State private var selectedTab = 0
    @State private var showTaskForm = false
    @State private var editingTask: ProjectTask?
    @State private var subtaskParent: ProjectTask?

    private let statusCols = [
        ("todo",        "К выполнению"),
        ("in_progress", "В работе"),
        ("review",      "На ревью"),
        ("done",        "Готово"),
    ]

    private var canManage: Bool {
        let role = authStore.currentUser?.role ?? ""
        return role == "admin" || role == "manager"
    }

    var body: some View {
        Group {
            if vm.isLoading {
                ProgressView("Загрузка...")
            } else if let project = vm.project {
                ScrollView {
                    VStack(spacing: 16) {
                        headerSection(project)
                        Picker("Вид", selection: $selectedTab) {
                            Text("Kanban").tag(0)
                            Text("Список").tag(1)
                            Text("Гант").tag(2)
                            Text("Участники").tag(3)
                        }
                        .pickerStyle(.segmented)
                        .padding(.horizontal)

                        switch selectedTab {
                        case 0: kanbanView
                        case 1: hierarchicalListView
                        case 2: GanttView(tasks: vm.tasks).padding(.horizontal, 8)
                        case 3: membersView(project)
                        default: EmptyView()
                        }
                    }
                    .padding(.bottom, 20)
                }
            } else {
                ContentUnavailableView("Проект не найден", systemImage: "folder.badge.questionmark")
            }
        }
        .navigationTitle(vm.project?.name ?? "Проект")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if canManage {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { showTaskForm = true } label: {
                        Image(systemName: "plus")
                    }
                }
            }
        }
        .task { await vm.load(id: projectId) }
        .refreshable { await vm.load(id: projectId) }
        .sheet(isPresented: $showTaskForm) {
            TaskFormView(editingTask: nil, projectId: projectId, parentTask: nil) { title, desc, status, priority, stageId, assigneeId, hours, due, budget, actualCost in
                vm.createTask(title: title, description: desc, status: status, priority: priority,
                              stageId: stageId, assigneeId: assigneeId, estimatedHours: hours, dueDate: due,
                              budget: budget, actualCost: actualCost)
            }
        }
        .sheet(item: $editingTask) { task in
            TaskFormView(editingTask: task, projectId: projectId, parentTask: nil) { title, desc, status, priority, _, assigneeId, hours, due, budget, actualCost in
                vm.updateTask(taskId: task.id, title: title, description: desc,
                              status: status, priority: priority,
                              assigneeId: assigneeId, estimatedHours: hours, dueDate: due,
                              budget: budget, actualCost: actualCost)
            }
        }
        .sheet(item: $subtaskParent) { parent in
            TaskFormView(editingTask: nil, projectId: projectId, parentTask: parent) { title, desc, status, priority, stageId, assigneeId, hours, due, budget, actualCost in
                vm.createSubtask(parentTaskId: parent.id, title: title, description: desc,
                                 priority: priority, assigneeId: assigneeId,
                                 estimatedHours: hours, dueDate: due, budget: budget, actualCost: actualCost)
            }
        }
    }

    @ViewBuilder
    private func headerSection(_ project: Project) -> some View {
        VStack(spacing: 12) {
            HStack {
                StatusBadge(status: project.status)
                PriorityBadge(priority: project.priority)
                Spacer()
                if let end = project.end_date {
                    Label(end.toDisplayDate(), systemImage: "calendar")
                        .font(.caption)
                        .foregroundColor(project.isOverdue ? .red : .secondary)
                }
            }
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()),
                                GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                miniStat(value: "\(vm.taskTree().count)", label: "Задач")
                miniStat(value: "\(vm.tasks.filter { $0.status == "done" }.count)", label: "Готово", color: .green)
                miniStat(value: "\(vm.tasks.filter { $0.isOverdue }.count)", label: "Просроч.", color: .red)
                miniStat(value: "\(Int(project.progress * 100))%", label: "Прогресс")
            }
            ProgressView(value: project.progress)
                .tint(project.progress >= 1 ? .green : .blue)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(14)
        .shadow(color: .black.opacity(0.05), radius: 4)
        .padding(.horizontal)
    }

    @ViewBuilder
    private func miniStat(value: String, label: String, color: Color = .blue) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.title3).fontWeight(.bold).foregroundColor(color)
            Text(label).font(.caption2).foregroundColor(.secondary)
        }
    }

    @ViewBuilder
    private var kanbanView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .top, spacing: 12) {
                ForEach(statusCols, id: \.0) { (status, label) in
                    let columnNodes = vm.tasksByStatusTree()[status] ?? []
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text(label).font(.caption).fontWeight(.semibold).foregroundColor(.secondary)
                            Spacer()
                            Text("\(columnNodes.count)")
                                .font(.caption2).fontWeight(.semibold)
                                .padding(.horizontal, 6).padding(.vertical, 2)
                                .background(Color.secondary.opacity(0.15))
                                .clipShape(Capsule())
                        }
                        ForEach(columnNodes) { node in
                            KanbanTaskCard(
                                node: node,
                                canManage: canManage,
                                onStatusChange: { s in Task { await vm.updateTaskStatus(taskId: node.task.id, status: s) } },
                                onEdit: { editingTask = node.task },
                                onDelete: { vm.deleteTask(taskId: node.task.id) },
                                onAddSubtask: { subtaskParent = node.task }
                            )
                            .environmentObject(authStore)
                        }
                        if columnNodes.isEmpty {
                            Text("Нет задач").font(.caption).foregroundColor(.secondary)
                                .frame(maxWidth: .infinity).padding(.vertical, 8)
                        }
                    }
                    .frame(width: 210)
                    .padding(12)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                }
            }
            .padding(.horizontal)
        }
    }

    @ViewBuilder
    private var hierarchicalListView: some View {
        LazyVStack(spacing: 4) {
            ForEach(vm.taskTree()) { node in
                RecursiveTaskRow(
                    node: node,
                    depth: 0,
                    canManage: canManage,
                    onEdit: { editingTask = $0 },
                    onDelete: { vm.deleteTask(taskId: $0) },
                    onAddSubtask: { subtaskParent = $0 },
                    onStatusChange: { id, s in Task { await vm.updateTaskStatus(taskId: id, status: s) } }
                )
                .environmentObject(authStore)
            }
        }
        .padding(.horizontal)
    }

    @ViewBuilder
    private func membersView(_ project: Project) -> some View {
        LazyVStack(spacing: 8) {
            ForEach(project.members ?? []) { member in
                HStack(spacing: 12) {
                    InitialsAvatar(
                        initials: member.full_name.split(separator: " ").prefix(2)
                            .compactMap { $0.first }.map(String.init).joined().uppercased()
                    )
                    VStack(alignment: .leading, spacing: 2) {
                        Text(member.full_name).font(.subheadline).fontWeight(.medium)
                        Text(member.email).font(.caption).foregroundColor(.secondary)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 4) {
                        if let dept = member.department {
                            Text(dept).font(.caption2).foregroundColor(.secondary)
                        }
                        Text(member.project_role)
                            .font(.caption2).fontWeight(.semibold)
                            .padding(.horizontal, 6).padding(.vertical, 2)
                            .background(Color.blue.opacity(0.1))
                            .foregroundColor(.blue)
                            .clipShape(Capsule())
                    }
                }
                .padding()
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.04), radius: 3)
                .padding(.horizontal)
            }
        }
    }
}

struct RecursiveTaskRow: View {
    let node: TaskNode
    let depth: Int
    let canManage: Bool
    let onEdit: (ProjectTask) -> Void
    let onDelete: (String) -> Void
    let onAddSubtask: (ProjectTask) -> Void
    let onStatusChange: (String, String) -> Void
    @EnvironmentObject var authStore: AuthStore
    @State private var isExpanded = true

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            TaskRowItem(
                task: node.task,
                hasChildren: !node.children.isEmpty,
                childCount: node.totalCount,
                doneChildren: node.doneCount,
                depth: depth,
                isExpanded: $isExpanded,
                canManage: canManage,
                onEdit: { onEdit(node.task) },
                onDelete: { onDelete(node.task.id) },
                onAddSubtask: { onAddSubtask(node.task) },
                onStatusChange: { onStatusChange(node.task.id, $0) }
            )

            if isExpanded && !node.children.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(node.children) { child in
                        RecursiveTaskRow(
                            node: child,
                            depth: depth + 1,
                            canManage: canManage,
                            onEdit: onEdit,
                            onDelete: onDelete,
                            onAddSubtask: onAddSubtask,
                            onStatusChange: onStatusChange
                        )
                        .environmentObject(authStore)
                    }
                }
                .padding(.leading, 20)
                .overlay(alignment: .leading) {
                    Rectangle()
                        .fill(Color.blue.opacity(0.2))
                        .frame(width: 2)
                        .padding(.leading, 8)
                }
            }
        }
    }
}

struct TaskRowItem: View {
    let task: ProjectTask
    let hasChildren: Bool
    let childCount: Int
    let doneChildren: Int
    let depth: Int
    @Binding var isExpanded: Bool
    let canManage: Bool
    let onEdit: () -> Void
    let onDelete: () -> Void
    let onAddSubtask: () -> Void
    let onStatusChange: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                if hasChildren {
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) { isExpanded.toggle() }
                    } label: {
                        Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                            .font(.caption)
                            .foregroundColor(.blue)
                            .frame(width: 16)
                    }
                } else {
                    Image(systemName: depth > 0 ? "circle.fill" : "circle")
                        .font(.system(size: 6))
                        .foregroundColor(.secondary)
                        .frame(width: 16)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(task.title)
                        .font(depth == 0 ? .subheadline : .callout)
                        .fontWeight(depth == 0 ? .semibold : .regular)
                    if let desc = task.description {
                        Text(desc).font(.caption).foregroundColor(.secondary).lineLimit(1)
                    }
                }
                Spacer()

                Menu {
                    if canManage {
                        Button { onEdit() } label: { Label("Редактировать", systemImage: "pencil") }
                        Button { onAddSubtask() } label: { Label("Добавить подзадачу", systemImage: "list.bullet.indent") }
                        Menu("Изменить статус") {
                            Button("К выполнению") { onStatusChange("todo") }
                            Button("В работе")     { onStatusChange("in_progress") }
                            Button("На ревью")     { onStatusChange("review") }
                            Button("Готово")       { onStatusChange("done") }
                        }
                        Divider()
                        Button(role: .destructive) { onDelete() } label: { Label("Удалить", systemImage: "trash") }
                    } else {
                        Menu("Изменить статус") {
                            Button("В работе")  { onStatusChange("in_progress") }
                            Button("На ревью")  { onStatusChange("review") }
                            Button("Готово")    { onStatusChange("done") }
                        }
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .padding(6)
                }
            }

            HStack(spacing: 6) {
                StatusBadge(status: task.status)
                PriorityBadge(priority: task.priority)
                Spacer()
                if let due = task.due_date {
                    Text(due.toDisplayDate())
                        .font(.caption)
                        .foregroundColor(task.isOverdue ? .red : .secondary)
                }
            }
            .padding(.leading, 22)

            HStack(spacing: 8) {
                if let assignee = task.assignee_name {
                    Label(assignee, systemImage: "person").font(.caption).foregroundColor(.secondary)
                }
                if hasChildren {
                    Spacer()
                    HStack(spacing: 4) {
                        Image(systemName: "list.bullet.indent").font(.caption2).foregroundColor(.secondary)
                        Text("\(doneChildren)/\(childCount)").font(.caption2).foregroundColor(.secondary)
                        ProgressView(value: childCount > 0 ? Double(doneChildren) / Double(childCount) : 0)
                            .frame(maxWidth: 60)
                            .scaleEffect(x: 1, y: 0.7)
                    }
                }
            }
            .padding(.leading, 22)
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .background(depthColor)
        .cornerRadius(10)
        .shadow(color: .black.opacity(depth == 0 ? 0.05 : 0.02), radius: depth == 0 ? 3 : 1)
    }

    private var depthColor: Color {
        switch depth {
        case 0: return Color(.systemBackground)
        case 1: return Color(.systemBackground).opacity(0.95)
        default: return Color(.secondarySystemBackground)
        }
    }
}

struct KanbanTaskCard: View {
    let node: TaskNode
    let canManage: Bool
    let onStatusChange: (String) -> Void
    let onEdit: () -> Void
    let onDelete: () -> Void
    let onAddSubtask: () -> Void
    @EnvironmentObject var authStore: AuthStore

    private var canEdit: Bool {
        guard let user = authStore.currentUser else { return false }
        return user.role == "admin" || user.role == "manager" || node.task.assignee_id == user.id
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .top) {
                Text(node.task.title).font(.caption).fontWeight(.medium).lineLimit(3)
                Spacer()
                Menu {
                    if canManage {
                        Button { onEdit() } label: { Label("Редактировать", systemImage: "pencil") }
                        Button { onAddSubtask() } label: { Label("Добавить подзадачу", systemImage: "list.bullet.indent") }
                        Divider()
                        Button(role: .destructive) { onDelete() } label: { Label("Удалить", systemImage: "trash") }
                    } else if canEdit {
                        Button { onEdit() } label: { Label("Редактировать", systemImage: "pencil") }
                    }
                } label: {
                    Image(systemName: "ellipsis").font(.caption).foregroundColor(.secondary)
                }
            }

            if node.totalCount > 0 {
                HStack(spacing: 4) {
                    Image(systemName: "list.bullet.indent").font(.caption2).foregroundColor(.secondary)
                    Text("\(node.doneCount)/\(node.totalCount)").font(.caption2).foregroundColor(.secondary)
                    ProgressView(value: node.subtaskProgress)
                        .frame(maxWidth: 60)
                        .scaleEffect(x: 1, y: 0.6)
                }
            }

            if let assignee = node.task.assignee_name {
                Text(assignee).font(.caption2).foregroundColor(.secondary)
            }

            HStack {
                PriorityBadge(priority: node.task.priority)
                Spacer()
                if let due = node.task.due_date {
                    Text(due.toDisplayDate())
                        .font(.caption2)
                        .foregroundColor(node.task.isOverdue ? .red : .secondary)
                }
            }

            if node.task.status != "done" && canEdit {
                Menu {
                    Button("В работе")  { onStatusChange("in_progress") }
                    Button("На ревью")  { onStatusChange("review") }
                    Button("Готово")    { onStatusChange("done") }
                } label: {
                    Label("Статус", systemImage: "arrow.triangle.2.circlepath")
                        .font(.caption2).foregroundColor(.blue)
                }
            }
        }
        .padding(10)
        .background(Color(.systemBackground))
        .cornerRadius(10)
        .shadow(color: .black.opacity(0.04), radius: 2)
    }
}
