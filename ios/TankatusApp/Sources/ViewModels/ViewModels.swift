import Foundation

indirect enum TaskNode: Identifiable {
    case node(task: ProjectTask, children: [TaskNode])

    var id: String { task.id }

    var task: ProjectTask {
        if case .node(let t, _) = self { return t }
        fatalError()
    }

    var children: [TaskNode] {
        if case .node(_, let c) = self { return c }
        return []
    }

    var allDescendants: [ProjectTask] {
        children.flatMap { [$0.task] + $0.allDescendants }
    }

    var doneCount: Int {
        let all = allDescendants
        return all.filter { $0.status == "done" }.count
    }

    var totalCount: Int { allDescendants.count }

    var subtaskProgress: Double {
        guard totalCount > 0 else { return 0 }
        return Double(doneCount) / Double(totalCount)
    }
}

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var isLoading = false
    @Published var errorMessage: String?

    func login() async {
        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "Введите email и пароль"
            return
        }
        isLoading = true
        errorMessage = nil
        do {
            try await AuthStore.shared.login(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published var stats: DashboardStats?
    @Published var isLoading = false
    @Published var error: String?

    func load() async {
        isLoading = true
        guard let userId = AuthStore.shared.currentUser?.id else {
            isLoading = false
            return
        }
        stats = LocalDataStore.shared.getDashboardStats(userId: userId)
        isLoading = false
    }
}

@MainActor
final class ProjectsViewModel: ObservableObject {
    @Published var projects: [Project] = []
    @Published var isLoading = false
    @Published var error: String?

    func load() async {
        isLoading = true
        guard let userId = AuthStore.shared.currentUser?.id else {
            isLoading = false
            return
        }
        projects = LocalDataStore.shared.getProjects(userId: userId)
        isLoading = false
    }

    func createProject(name: String, description: String?, status: String, priority: String,
                       startDate: String?, endDate: String?, budget: Double?) {
        guard let userId = AuthStore.shared.currentUser?.id else { return }
        LocalDataStore.shared.createProject(name: name, description: description, status: status,
                                            priority: priority, startDate: startDate, endDate: endDate,
                                            budget: budget, managerId: userId)
        projects = LocalDataStore.shared.getProjects(userId: userId)
    }

    func updateProject(id: String, name: String, description: String?, status: String, priority: String,
                       startDate: String?, endDate: String?, budget: Double?) {
        guard let userId = AuthStore.shared.currentUser?.id else { return }
        LocalDataStore.shared.updateProject(id: id, name: name, description: description,
                                            status: status, priority: priority,
                                            startDate: startDate, endDate: endDate, budget: budget)
        projects = LocalDataStore.shared.getProjects(userId: userId)
    }

    func deleteProject(id: String) {
        guard let userId = AuthStore.shared.currentUser?.id else { return }
        LocalDataStore.shared.deleteProject(id: id)
        projects = LocalDataStore.shared.getProjects(userId: userId)
    }
}

@MainActor
final class ProjectDetailViewModel: ObservableObject {
    @Published var project: Project?
    @Published var tasks: [ProjectTask] = []
    @Published var stages: [Stage] = []
    @Published var isLoading = false
    @Published var error: String?

    private var currentProjectId: String?

    func load(id: String) async {
        currentProjectId = id
        isLoading = tasks.isEmpty
        project = LocalDataStore.shared.getProject(id: id)
        tasks   = LocalDataStore.shared.getTasks(projectId: id)
        stages  = LocalDataStore.shared.getStages(projectId: id)
        isLoading = false
    }

    func unload() {}

    func updateTaskStatus(taskId: String, status: String) async {
        LocalDataStore.shared.updateTaskStatus(taskId: taskId, status: status)
        if let id = currentProjectId {
            tasks = LocalDataStore.shared.getTasks(projectId: id)
        }
    }

    func createTask(title: String, description: String?, status: String, priority: String,
                    stageId: String?, assigneeId: String?, estimatedHours: Double?, dueDate: String?,
                    budget: Double? = nil, actualCost: Double? = nil) {
        guard let projectId = currentProjectId,
              let creatorId = AuthStore.shared.currentUser?.id else { return }
        LocalDataStore.shared.createTask(projectId: projectId, stageId: stageId, title: title,
                                         description: description, status: status, priority: priority,
                                         assigneeId: assigneeId, estimatedHours: estimatedHours,
                                         dueDate: dueDate, creatorId: creatorId,
                                         budget: budget, actualCost: actualCost)
        tasks = LocalDataStore.shared.getTasks(projectId: projectId)
        project = LocalDataStore.shared.getProject(id: projectId)
    }

    func createSubtask(parentTaskId: String, title: String, description: String?, priority: String,
                       assigneeId: String?, estimatedHours: Double?, dueDate: String?,
                       budget: Double? = nil, actualCost: Double? = nil) {
        guard let projectId = currentProjectId,
              let creatorId = AuthStore.shared.currentUser?.id else { return }
        let parent = tasks.first { $0.id == parentTaskId }
        LocalDataStore.shared.createTask(projectId: projectId, stageId: parent?.stage_id, title: title,
                                         description: description, status: "todo", priority: priority,
                                         assigneeId: assigneeId, estimatedHours: estimatedHours,
                                         dueDate: dueDate, creatorId: creatorId, parentTaskId: parentTaskId,
                                         budget: budget, actualCost: actualCost)
        tasks = LocalDataStore.shared.getTasks(projectId: projectId)
        project = LocalDataStore.shared.getProject(id: projectId)
    }

    func taskTree() -> [TaskNode] {
        buildNodes(allTasks: tasks, parentId: nil)
    }

    private func buildNodes(allTasks: [ProjectTask], parentId: String?) -> [TaskNode] {
        allTasks
            .filter { $0.parent_task_id == parentId }
            .map { task in
                .node(task: task, children: buildNodes(allTasks: allTasks, parentId: task.id))
            }
    }

    func tasksByStatusTree() -> [String: [TaskNode]] {
        var result: [String: [TaskNode]] = [:]
        for node in taskTree() {
            result[node.task.status, default: []].append(node)
        }
        return result
    }

    func updateTask(taskId: String, title: String, description: String?, status: String, priority: String,
                    assigneeId: String?, estimatedHours: Double?, dueDate: String?,
                    budget: Double? = nil, actualCost: Double? = nil) {
        guard let projectId = currentProjectId else { return }
        LocalDataStore.shared.updateTask(id: taskId, title: title, description: description,
                                         status: status, priority: priority, assigneeId: assigneeId,
                                         estimatedHours: estimatedHours, dueDate: dueDate,
                                         budget: budget, actualCost: actualCost)
        tasks = LocalDataStore.shared.getTasks(projectId: projectId)
    }

    func deleteTask(taskId: String) {
        guard let projectId = currentProjectId else { return }
        LocalDataStore.shared.deleteTask(id: taskId)
        tasks = LocalDataStore.shared.getTasks(projectId: projectId)
        project = LocalDataStore.shared.getProject(id: projectId)
    }

    var tasksByStatus: [String: [ProjectTask]] {
        Dictionary(grouping: tasks) { $0.status }
    }
}

@MainActor
final class TasksViewModel: ObservableObject {
    @Published var tasks: [ProjectTask] = []
    @Published var isLoading = false
    @Published var error: String?

    func load() async {
        isLoading = true
        guard let userId = AuthStore.shared.currentUser?.id else {
            isLoading = false
            return
        }
        tasks = LocalDataStore.shared.getMyTasks(userId: userId)
        isLoading = false
    }

    func updateStatus(taskId: String, status: String) async {
        LocalDataStore.shared.updateTaskStatus(taskId: taskId, status: status)
        guard let userId = AuthStore.shared.currentUser?.id else { return }
        tasks = LocalDataStore.shared.getMyTasks(userId: userId)
    }
}

@MainActor
final class KPIViewModel: ObservableObject {
    @Published var projects: [Project] = []
    @Published var selectedProject: Project?
    @Published var kpi: ComputedKPI?
    @Published var isLoading = false

    func loadProjects() async {
        guard let userId = AuthStore.shared.currentUser?.id else { return }
        let all = LocalDataStore.shared.getProjects(userId: userId)
        projects = all.filter { ["active", "planning"].contains($0.status) }
        if selectedProject == nil { selectedProject = projects.first }
        if let p = selectedProject { loadKPI(projectId: p.id) }
    }

    func loadKPI(projectId: String) {
        isLoading = true
        kpi = LocalDataStore.shared.computeKPI(projectId: projectId)
        isLoading = false
    }
}

@MainActor
final class UsersViewModel: ObservableObject {
    @Published var users: [User] = []
    @Published var loads: [UserLoad] = []
    @Published var isLoading = false

    func load() async {
        isLoading = true
        users = LocalDataStore.shared.getUsers()
        loads = LocalDataStore.shared.getUserLoads()
        isLoading = false
    }

    func loadFor(_ userId: String) -> UserLoad? {
        loads.first { $0.id == userId }
    }
}
