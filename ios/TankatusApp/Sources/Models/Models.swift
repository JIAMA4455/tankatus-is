import Foundation

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let full_name: String
    let role: String
    let department: String?
    let avatar_url: String?
    let is_active: Bool
    let created_at: String

    var displayRole: String {
        switch role {
        case "admin":   return "Администратор"
        case "manager": return "Менеджер"
        case "worker":  return "Работник"
        case "viewer":  return "Наблюдатель"
        default:        return role
        }
    }

    var initials: String {
        let parts = full_name.split(separator: " ")
        return parts.prefix(2).compactMap { $0.first }.map(String.init).joined().uppercased()
    }
}

struct ProjectMember: Codable, Identifiable, Hashable, Equatable {
    let id: String
    let full_name: String
    let email: String
    let role: String
    let department: String?
    let project_role: String
}

struct Project: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let status: String
    let priority: String
    let start_date: String?
    let end_date: String?
    let budget: Double?
    let manager_id: String?
    let manager_name: String?
    let total_tasks: Int?
    let done_tasks: Int?
    let members: [ProjectMember]?
    let created_at: String
    let updated_at: String

    var progress: Double {
        guard let total = total_tasks, total > 0, let done = done_tasks else { return 0 }
        return Double(done) / Double(total)
    }

    var isOverdue: Bool {
        guard let end = end_date, status != "completed" else { return false }
        return DateFormatter.apiDate.date(from: end).map { $0 < Date() } ?? false
    }
}

extension Project: Hashable {
    static func == (lhs: Project, rhs: Project) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

struct Stage: Codable, Identifiable {
    let id: String
    let project_id: String
    let name: String
    let description: String?
    let order_index: Int
    let status: String
    let start_date: String?
    let end_date: String?
}

struct ProjectTask: Codable, Identifiable {
    let id: String
    let project_id: String
    let stage_id: String?
    let stage_name: String?
    let parent_task_id: String?
    let title: String
    let description: String?
    let status: String
    let priority: String
    let assignee_id: String?
    let assignee_name: String?
    let creator_name: String?
    let estimated_hours: Double?
    let actual_hours: Double?
    let budget: Double?
    let actual_cost: Double?
    let start_date: String?
    let due_date: String?
    let project_name: String?
    let comments: [TaskComment]?
    let created_at: String
    let updated_at: String

    var isOverdue: Bool {
        guard let due = due_date, status != "done" else { return false }
        return DateFormatter.apiDate.date(from: due).map { $0 < Date() } ?? false
    }

    var effectiveActualCost: Double {
        if let ac = actual_cost { return ac }
        guard let b = budget else { return 0 }
        switch status {
        case "done": return b
        case "in_progress": return b * 0.5
        case "review": return b * 0.8
        default: return 0
        }
    }
}

struct TaskComment: Codable, Identifiable {
    let id: String
    let task_id: String
    let author_id: String
    let author_name: String
    let content: String
    let created_at: String
}

struct KpiSnapshot: Codable, Identifiable {
    let id: String
    let project_id: String
    let snapshot_date: String
    let planned_value: Double
    let earned_value: Double
    let actual_cost: Double
    let budget_at_completion: Double?
    let spi: Double?
    let cpi: Double?
    let cv: Double?
    let sv: Double?
    let eac: Double?
    let etc: Double?
}

struct DashboardStats: Codable {
    let project_stats: [StatusCount]
    let task_stats: [StatusCount]
    let overdue_tasks: Int
    let recent_active_projects: [Project]
}

struct StatusCount: Codable {
    let status: String
    let cnt: String
    var count: Int { Int(cnt) ?? 0 }
}

struct AuthResponse: Codable {
    let token: String
    let user: User
}

struct UserLoad: Codable, Identifiable {
    let id: String
    let full_name: String
    let department: String?
    let total_planned: Double?
    let total_actual: Double?
    let active_tasks: Int?

    var initials: String {
        let parts = full_name.split(separator: " ")
        return parts.prefix(2).compactMap { $0.first }.map(String.init).joined().uppercased()
    }
}

struct ComputedKPI {
    let bac: Double
    let pv: Double
    let ev: Double
    let ac: Double

    var cv: Double { ev - ac }
    var sv: Double { ev - pv }
    var cpi: Double { ac > 0 ? ev / ac : 0 }
    var spi: Double { pv > 0 ? ev / pv : 0 }
    var eac: Double { cpi > 0 ? bac / cpi : 0 }
    var etc: Double { eac - ac }
    var vac: Double { bac - eac }
}
