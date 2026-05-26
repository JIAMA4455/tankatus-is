import SwiftUI

struct SubtaskFormView: View {
    let parentTask: ProjectTask
    let projectId: String
    let onSave: (String, String?, String, String?, Double?, String?) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var description = ""
    @State private var priority = "medium"
    @State private var selectedAssigneeId: String?
    @State private var estimatedText = ""
    @State private var dueDate: Date?

    private let priorities = ["low", "medium", "high", "critical"]
    private let priorityLabels = ["low": "Низкий", "medium": "Средний",
                                   "high": "Высокий", "critical": "Критический"]

    private var projectMembers: [User] {
        let memberIds = LocalDataStore.shared.projectMembers[projectId]?.map { $0.id } ?? []
        return LocalDataStore.shared.users.filter { memberIds.contains($0.id) }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack(spacing: 8) {
                        Image(systemName: "list.bullet.indent")
                            .foregroundColor(.blue)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Подзадача для:")
                                .font(.caption).foregroundColor(.secondary)
                            Text(parentTask.title)
                                .font(.subheadline).fontWeight(.medium)
                        }
                    }
                }

                Section("Подзадача") {
                    TextField("Название подзадачи", text: $title)
                    TextField("Описание (необязательно)", text: $description, axis: .vertical)
                        .lineLimit(2...4)
                }

                Section("Параметры") {
                    Picker("Приоритет", selection: $priority) {
                        ForEach(priorities, id: \.self) { p in
                            Text(priorityLabels[p] ?? p).tag(p)
                        }
                    }
                    TextField("Оценка (часы)", text: $estimatedText)
                        .keyboardType(.decimalPad)
                    Picker("Исполнитель", selection: $selectedAssigneeId) {
                        Text("Не назначен").tag(String?.none)
                        ForEach(projectMembers) { user in
                            Text(user.full_name).tag(Optional(user.id))
                        }
                    }
                }

                Section("Срок") {
                    HStack {
                        Text("Дата окончания")
                        Spacer()
                        if let d = dueDate {
                            Button(DateFormatter.display.string(from: d)) { dueDate = nil }
                                .foregroundColor(.blue)
                        } else {
                            DatePicker("", selection: Binding(
                                get: { dueDate ?? Date() },
                                set: { dueDate = $0 }
                            ), displayedComponents: .date)
                            .labelsHidden()
                        }
                    }
                }
            }
            .navigationTitle("Новая подзадача")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Добавить") {
                        guard !title.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                        let hours = Double(estimatedText.replacingOccurrences(of: ",", with: "."))
                        let due   = dueDate.map { DateFormatter.apiDate.string(from: $0) }
                        onSave(title.trimmingCharacters(in: .whitespaces),
                               description.isEmpty ? nil : description,
                               priority, selectedAssigneeId, hours, due)
                        dismiss()
                    }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}
