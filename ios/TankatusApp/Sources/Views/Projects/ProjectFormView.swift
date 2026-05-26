import SwiftUI

struct ProjectFormView: View {
    let editingProject: Project?
    let onSave: (String, String?, String, String, String?, String?, Double?) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var name: String
    @State private var description: String
    @State private var status: String
    @State private var priority: String
    @State private var startDate: Date?
    @State private var endDate: Date?
    @State private var budgetText: String
    @State private var showStartPicker = false
    @State private var showEndPicker = false

    private let statuses = ["planning", "active", "on_hold", "completed"]
    private let statusLabels = ["planning": "Планирование", "active": "Активный",
                                "on_hold": "На паузе", "completed": "Завершён"]
    private let priorities = ["low", "medium", "high", "critical"]
    private let priorityLabels = ["low": "Низкий", "medium": "Средний",
                                  "high": "Высокий", "critical": "Критический"]

    init(editingProject: Project?, onSave: @escaping (String, String?, String, String, String?, String?, Double?) -> Void) {
        self.editingProject = editingProject
        self.onSave = onSave
        let p = editingProject
        _name         = State(initialValue: p?.name ?? "")
        _description  = State(initialValue: p?.description ?? "")
        _status       = State(initialValue: p?.status ?? "planning")
        _priority     = State(initialValue: p?.priority ?? "medium")
        _budgetText   = State(initialValue: p?.budget.map { String(format: "%.0f", $0) } ?? "")
        _startDate    = State(initialValue: p?.start_date.flatMap { DateFormatter.apiDate.date(from: $0) })
        _endDate      = State(initialValue: p?.end_date.flatMap { DateFormatter.apiDate.date(from: $0) })
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Основное") {
                    TextField("Название проекта", text: $name)
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
                    TextField("Бюджет (руб.)", text: $budgetText)
                        .keyboardType(.decimalPad)
                }

                Section("Сроки") {
                    DatePickerRow(label: "Дата начала", date: $startDate)
                    DatePickerRow(label: "Дата окончания", date: $endDate)
                }
            }
            .navigationTitle(editingProject == nil ? "Новый проект" : "Редактировать")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Сохранить") {
                        guard !name.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                        let budget = Double(budgetText.replacingOccurrences(of: ",", with: "."))
                        let start = startDate.map { DateFormatter.apiDate.string(from: $0) }
                        let end   = endDate.map   { DateFormatter.apiDate.string(from: $0) }
                        onSave(name.trimmingCharacters(in: .whitespaces),
                               description.isEmpty ? nil : description,
                               status, priority, start, end, budget)
                        dismiss()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}

private struct DatePickerRow: View {
    let label: String
    @Binding var date: Date?

    var body: some View {
        HStack {
            Text(label)
            Spacer()
            if let d = date {
                Button(DateFormatter.display.string(from: d)) {
                    date = nil
                }
                .foregroundColor(.blue)
            } else {
                DatePicker("", selection: Binding(
                    get: { date ?? Date() },
                    set: { date = $0 }
                ), displayedComponents: .date)
                .labelsHidden()
            }
        }
    }
}
