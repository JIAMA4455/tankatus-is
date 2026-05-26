import SwiftUI

struct TaskFormView: View {
    let editingTask: ProjectTask?
    let projectId: String
    let parentTask: ProjectTask?
    let onSave: (String, String?, String, String, String?, String?, Double?, String?, Double?, Double?) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var title: String
    @State private var description: String
    @State private var status: String
    @State private var priority: String
    @State private var selectedAssigneeId: String?
    @State private var selectedStageId: String?
    @State private var estimatedText: String
    @State private var budgetText: String
    @State private var actualCostText: String
    @State private var dueDate: Date?

    private let statuses  = ["todo", "in_progress", "review", "done"]
    private let statusLabels  = ["todo": "К выполнению", "in_progress": "В работе",
                                  "review": "На ревью", "done": "Готово"]
    private let priorities = ["low", "medium", "high", "critical"]
    private let priorityLabels = ["low": "Низкий", "medium": "Средний",
                                   "high": "Высокий", "critical": "Критический"]

    private var projectMembers: [User] {
        let memberIds = LocalDataStore.shared.projectMembers[projectId]?.map { $0.id } ?? []
        return LocalDataStore.shared.users.filter { memberIds.contains($0.id) }
    }

    private var projectStages: [Stage] {
        LocalDataStore.shared.getStages(projectId: projectId)
    }

    init(editingTask: ProjectTask?, projectId: String, parentTask: ProjectTask?,
         onSave: @escaping (String, String?, String, String, String?, String?, Double?, String?, Double?, Double?) -> Void) {
        self.editingTask = editingTask
        self.projectId = projectId
        self.parentTask = parentTask
        self.onSave = onSave
        let t = editingTask
        _title          = State(initialValue: t?.title ?? "")
        _description    = State(initialValue: t?.description ?? "")
        _status         = State(initialValue: t?.status ?? "todo")
        _priority       = State(initialValue: t?.priority ?? "medium")
        _selectedAssigneeId = State(initialValue: t?.assignee_id)
        _selectedStageId    = State(initialValue: t?.stage_id ?? parentTask?.stage_id)
        _estimatedText  = State(initialValue: t?.estimated_hours.map { String(format: "%.0f", $0) } ?? "")
        _budgetText     = State(initialValue: t?.budget.map { String(format: "%.0f", $0) } ?? "")
        _actualCostText = State(initialValue: t?.actual_cost.map { String(format: "%.0f", $0) } ?? "")
        _dueDate        = State(initialValue: t?.due_date.flatMap { DateFormatter.apiDate.date(from: $0) })
    }

    private var navigationTitle: String {
        if editingTask != nil { return "Редактировать задачу" }
        return parentTask != nil ? "Новая подзадача" : "Новая задача"
    }

    var body: some View {
        NavigationStack {
            Form {
                if let parent = parentTask {
                    Section {
                        HStack(spacing: 10) {
                            Image(systemName: "list.bullet.indent")
                                .foregroundColor(.blue)
                                .font(.title3)
                            VStack(alignment: .leading, spacing: 3) {
                                Text("Подзадача для:")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Text(parent.title)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                if let grandParent = parent.parent_task_id {
                                    Text("ID родителя: \(grandParent)")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                        .padding(.vertical, 2)
                    }
                }

                Section("Основное") {
                    TextField(parentTask != nil ? "Название подзадачи" : "Название задачи", text: $title)
                    TextField("Описание (необязательно)", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }

                Section("Параметры") {
                    Picker("Статус", selection: $status) {
                        ForEach(statuses, id: \.self) { s in
                            Text(statusLabels[s] ?? s).tag(s)
                        }
                    }
                    Picker("Приоритет", selection: $priority) {
                        ForEach(priorities, id: \.self) { p in
                            Text(priorityLabels[p] ?? p).tag(p)
                        }
                    }
                    TextField("Оценка (часы)", text: $estimatedText)
                        .keyboardType(.decimalPad)
                }

                Section("Бюджет") {
                    TextField("Бюджет задачи (руб.)", text: $budgetText)
                        .keyboardType(.decimalPad)
                    TextField("Фактические затраты (руб.)", text: $actualCostText)
                        .keyboardType(.decimalPad)
                }

                Section("Исполнитель и этап") {
                    Picker("Исполнитель", selection: $selectedAssigneeId) {
                        Text("Не назначен").tag(String?.none)
                        ForEach(projectMembers) { user in
                            Text(user.full_name).tag(Optional(user.id))
                        }
                    }
                    if !projectStages.isEmpty {
                        Picker("Этап", selection: $selectedStageId) {
                            Text("Без этапа").tag(String?.none)
                            ForEach(projectStages) { stage in
                                Text(stage.name).tag(Optional(stage.id))
                            }
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
            .navigationTitle(navigationTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Сохранить") {
                        guard !title.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                        let hours = Double(estimatedText.replacingOccurrences(of: ",", with: "."))
                        let due   = dueDate.map { DateFormatter.apiDate.string(from: $0) }
                        let budget = Double(budgetText.replacingOccurrences(of: ",", with: "."))
                        let actualCost = Double(actualCostText.replacingOccurrences(of: ",", with: "."))
                        onSave(title.trimmingCharacters(in: .whitespaces),
                               description.isEmpty ? nil : description,
                               status, priority, selectedStageId, selectedAssigneeId, hours, due,
                               budget, actualCost)
                        dismiss()
                    }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}
