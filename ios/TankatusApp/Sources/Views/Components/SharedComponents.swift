import SwiftUI

struct StatusBadge: View {
    let status: String

    private var config: (label: String, color: Color) {
        switch status {
        case "planning":    return ("Планирование", .gray)
        case "active":      return ("Активный",     .green)
        case "on_hold":     return ("На паузе",      .orange)
        case "completed":   return ("Завершён",      .blue)
        case "cancelled":   return ("Отменён",       .red)
        case "todo":        return ("К выполнению",  .gray)
        case "in_progress": return ("В работе",      .blue)
        case "review":      return ("На ревью",      .purple)
        case "done":        return ("Готово",         .green)
        case "pending":     return ("Ожидание",      .gray)
        default:            return (status,           .gray)
        }
    }

    var body: some View {
        Text(config.label)
            .font(.caption2).fontWeight(.semibold)
            .padding(.horizontal, 8).padding(.vertical, 3)
            .background(config.color.opacity(0.15))
            .foregroundColor(config.color)
            .clipShape(Capsule())
    }
}

struct PriorityBadge: View {
    let priority: String

    private var config: (label: String, color: Color) {
        switch priority {
        case "low":      return ("Низкий",      .gray)
        case "medium":   return ("Средний",     .blue)
        case "high":     return ("Высокий",     .orange)
        case "critical": return ("Критический", .red)
        default:         return (priority,       .gray)
        }
    }

    var body: some View {
        Text(config.label)
            .font(.caption2).fontWeight(.semibold)
            .padding(.horizontal, 8).padding(.vertical, 3)
            .background(config.color.opacity(0.15))
            .foregroundColor(config.color)
            .clipShape(Capsule())
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let subtitle: String?
    var color: Color = .blue

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption).foregroundColor(.secondary)
            Text(value)
                .font(.title2).fontWeight(.bold).foregroundColor(color)
            if let sub = subtitle {
                Text(sub).font(.caption2).foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

struct InitialsAvatar: View {
    let initials: String
    var size: CGFloat = 40
    var color: Color = .blue

    var body: some View {
        Text(initials)
            .font(.system(size: size * 0.4, weight: .semibold))
            .foregroundColor(.white)
            .frame(width: size, height: size)
            .background(color.gradient)
            .clipShape(Circle())
    }
}

struct ProgressRow: View {
    let label: String
    let value: Double
    var color: Color = .blue

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label).font(.caption).foregroundColor(.secondary)
                Spacer()
                Text("\(Int(value * 100))%").font(.caption).fontWeight(.medium)
            }
            ProgressView(value: value)
                .tint(value >= 1 ? .green : color)
        }
    }
}
