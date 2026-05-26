import SwiftUI

private let statusColors: [String: Color] = [
    "todo":        Color(.systemGray4),
    "in_progress": .blue,
    "review":      .purple,
    "done":        .green,
    "cancelled":   .red,
]

private let priorityColors: [String: Color] = [
    "low":      .gray,
    "medium":   .blue,
    "high":     .orange,
    "critical": .red,
]

private let statusLabels: [String: String] = [
    "todo": "К выполн.", "in_progress": "В работе",
    "review": "Ревью",   "done": "Готово", "cancelled": "Отменено",
]

private struct FlatTask: Identifiable {
    let id: String
    let task: ProjectTask
    let depth: Int
}

private func buildFlatTree(tasks: [ProjectTask]) -> [FlatTask] {
    var childMap: [String: [ProjectTask]] = [:]
    var roots: [ProjectTask] = []
    let ids = Set(tasks.map { $0.id })
    for t in tasks {
        if let pid = t.parent_task_id, ids.contains(pid) {
            childMap[pid, default: []].append(t)
        } else {
            roots.append(t)
        }
    }
    func flatten(_ nodes: [ProjectTask], depth: Int) -> [FlatTask] {
        nodes.flatMap { t -> [FlatTask] in
            [FlatTask(id: t.id, task: t, depth: depth)] +
            flatten(childMap[t.id] ?? [], depth: depth + 1)
        }
    }
    return flatten(roots, depth: 0)
}

struct GanttView: View {
    let tasks: [ProjectTask]

    @State private var zoom: CGFloat = 28

    private let rowH: CGFloat = 40
    private let leftW: CGFloat = 200
    private let headerH: CGFloat = 52

    private var today: Date {
        Calendar.current.startOfDay(for: Date())
    }

    private var dateRange: (min: Date, max: Date) {
        var dates: [Date] = [today]
        let df = DateFormatter.apiDate
        for t in tasks {
            if let s = t.start_date, let d = df.date(from: s) { dates.append(d) }
            if let e = t.due_date,   let d = df.date(from: e) { dates.append(d) }
        }
        var mn = dates.min() ?? today
        var mx = dates.max() ?? today
        mn = Calendar.current.date(byAdding: .day, value: -3, to: mn) ?? mn
        mx = Calendar.current.date(byAdding: .day, value: 7,  to: mx) ?? mx
        return (mn, mx)
    }

    private var days: [Date] {
        var result: [Date] = []
        var cur = dateRange.min
        let cal = Calendar.current
        while cur <= dateRange.max {
            result.append(cur)
            cur = cal.date(byAdding: .day, value: 1, to: cur)!
        }
        return result
    }

    private func dayOffset(_ date: Date) -> CGFloat {
        let diff = Calendar.current.dateComponents([.day], from: dateRange.min, to: date).day ?? 0
        return CGFloat(diff) * zoom
    }

    private var flatTasks: [FlatTask] { buildFlatTree(tasks: tasks) }
    private var totalW: CGFloat { CGFloat(days.count) * zoom }

    var body: some View {
        VStack(spacing: 0) {
            zoomBar
            ScrollView([.horizontal, .vertical]) {
                ZStack(alignment: .topLeading) {
                    timelineBackground
                    taskRows
                }
                .frame(width: leftW + totalW, height: headerH + CGFloat(flatTasks.count) * rowH)
            }
            legend
        }
    }

    private var zoomBar: some View {
        HStack(spacing: 12) {
            Text("Диаграмма Ганта")
                .font(.headline)
            Spacer()
            Button { zoom = max(14, zoom - 7) } label: {
                Image(systemName: "minus.magnifyingglass")
            }
            Button { zoom = min(56, zoom + 7) } label: {
                Image(systemName: "plus.magnifyingglass")
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }

    private var timelineBackground: some View {
        Canvas { ctx, size in
            let cal = Calendar.current

            for (i, d) in days.enumerated() {
                let x = leftW + CGFloat(i) * zoom
                let isWeekend = cal.component(.weekday, from: d) == 1 || cal.component(.weekday, from: d) == 7
                let isToday = cal.isDateInToday(d)

                if isToday {
                    ctx.fill(Path(CGRect(x: x, y: 0, width: zoom, height: size.height)),
                             with: .color(.blue.opacity(0.08)))
                } else if isWeekend {
                    ctx.fill(Path(CGRect(x: x, y: 0, width: zoom, height: size.height)),
                             with: .color(Color(.systemGray6)))
                }

                var vLine = Path()
                vLine.move(to: CGPoint(x: x, y: headerH))
                vLine.addLine(to: CGPoint(x: x, y: size.height))
                ctx.stroke(vLine, with: .color(Color(.systemGray5)), lineWidth: 0.5)

                let dayNum = cal.component(.day, from: d)
                if zoom >= 20 || dayNum == 1 || isToday {
                    var text = AttributedString("\(dayNum)")
                    text.foregroundColor = isToday ? .blue : (isWeekend ? Color(.systemGray3) : Color(.systemGray2))
                    text.font = .system(size: 10, weight: isToday ? .bold : .regular)
                    ctx.draw(Text(text), at: CGPoint(x: x + zoom / 2, y: headerH - 8), anchor: .center)
                }
            }

            var leftBorder = Path()
            leftBorder.move(to: CGPoint(x: leftW, y: 0))
            leftBorder.addLine(to: CGPoint(x: leftW, y: size.height))
            ctx.stroke(leftBorder, with: .color(Color(.systemGray4)), lineWidth: 1)

            var headerLine = Path()
            headerLine.move(to: CGPoint(x: 0, y: headerH))
            headerLine.addLine(to: CGPoint(x: size.height, y: headerH))
            ctx.stroke(headerLine, with: .color(Color(.systemGray4)), lineWidth: 0.5)

            let todayX = leftW + dayOffset(today)
            var todayLine = Path()
            todayLine.move(to: CGPoint(x: todayX + zoom / 2, y: 0))
            todayLine.addLine(to: CGPoint(x: todayX + zoom / 2, y: size.height))
            ctx.stroke(todayLine, with: .color(.blue.opacity(0.7)), style: StrokeStyle(lineWidth: 2, dash: [4, 3]))

            for i in 0..<flatTasks.count {
                let y = headerH + CGFloat(i) * rowH
                var hLine = Path()
                hLine.move(to: CGPoint(x: 0, y: y + rowH))
                hLine.addLine(to: CGPoint(x: size.width, y: y + rowH))
                ctx.stroke(hLine, with: .color(Color(.systemGray6)), lineWidth: 0.5)

                if i % 2 == 1 {
                    ctx.fill(Path(CGRect(x: 0, y: y, width: size.width, height: rowH)),
                             with: .color(Color(.systemGray6).opacity(0.3)))
                }
            }

            let monthGroups = buildMonthGroups()
            for (label, startI, count) in monthGroups {
                let x = leftW + CGFloat(startI) * zoom
                let w = CGFloat(count) * zoom
                var text = AttributedString(label)
                text.foregroundColor = Color(.secondaryLabel)
                text.font = .system(size: 11, weight: .medium)
                let clampedX = max(leftW, min(x, leftW + totalW - w)) + w / 2
                ctx.draw(Text(text), at: CGPoint(x: clampedX, y: 14), anchor: .center)
            }
        }
    }

    @ViewBuilder
    private var taskRows: some View {
        ForEach(Array(flatTasks.enumerated()), id: \.element.id) { (i, flat) in
            let task = flat.task
            let y = headerH + CGFloat(i) * rowH

            HStack(spacing: 4) {
                if flat.depth > 0 {
                    Text("└")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .frame(width: CGFloat(flat.depth) * 12)
                }
                Circle()
                    .fill(priorityColors[task.priority] ?? .gray)
                    .frame(width: 6, height: 6)
                Text(task.title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .lineLimit(1)
                    .foregroundColor(.primary)
                Spacer()
                Text(statusLabels[task.status] ?? task.status)
                    .font(.caption2)
                    .foregroundColor(statusColors[task.status] ?? .gray)
            }
            .frame(width: leftW - 8, height: rowH)
            .padding(.leading, 8)
            .position(x: (leftW - 8) / 2 + 4, y: y + rowH / 2)

            taskBar(task: task, y: y)
        }
    }

    @ViewBuilder
    private func taskBar(task: ProjectTask, y: CGFloat) -> some View {
        let df = DateFormatter.apiDate
        let startD = (task.start_date != nil ? df.date(from: task.start_date!) : nil)
            ?? (df.date(from: task.created_at.prefix(10).description))
            ?? today
        let endD = task.due_date.flatMap { df.date(from: $0) }
            ?? Calendar.current.date(byAdding: .day, value: 1, to: startD)
            ?? startD

        let x = leftW + dayOffset(startD)
        let w = max(dayOffset(endD) - dayOffset(startD) + zoom, zoom)
        let barH = rowH * 0.55
        let barY = y + (rowH - barH) / 2
        let color = statusColors[task.status] ?? .gray
        let isOverdue = task.isOverdue

        let progress: CGFloat = task.status == "done" ? 1
            : task.status == "in_progress" ? 0.5
            : task.status == "review"       ? 0.8
            : 0

        ZStack(alignment: .leading) {
            RoundedRectangle(cornerRadius: 4)
                .fill(isOverdue ? Color.red.opacity(0.15) : color.opacity(0.15))
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(isOverdue ? .red : color, lineWidth: 1.5)
                )
            if progress > 0 {
                RoundedRectangle(cornerRadius: 4)
                    .fill(color.opacity(0.7))
                    .frame(width: w * progress)
            }
            if w > 50 {
                Text(task.title)
                    .font(.system(size: 9, weight: .medium))
                    .foregroundColor(progress > 0.4 ? .white : .primary)
                    .lineLimit(1)
                    .padding(.leading, 4)
            }
        }
        .frame(width: w, height: barH)
        .position(x: x + w / 2, y: barY + barH / 2)
    }

    private var legend: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(Array(statusLabels.keys.sorted()), id: \.self) { key in
                    HStack(spacing: 4) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(statusColors[key] ?? .gray)
                            .frame(width: 12, height: 10)
                        Text(statusLabels[key] ?? key)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                HStack(spacing: 4) {
                    Rectangle()
                        .fill(Color.blue)
                        .frame(width: 12, height: 2)
                    Text("Сегодня")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.vertical, 6)
    }

    private func buildMonthGroups() -> [(String, Int, Int)] {
        var result: [(String, Int, Int)] = []
        var curLabel: String? = nil
        var startIdx = 0
        let df = DateFormatter()
        df.locale = Locale(identifier: "ru_RU")
        df.dateFormat = "LLLL yyyy"
        for (i, d) in days.enumerated() {
            let label = df.string(from: d).capitalized
            if label != curLabel {
                if let cl = curLabel {
                    result.append((cl, startIdx, i - startIdx))
                }
                curLabel = label
                startIdx = i
            }
        }
        if let cl = curLabel {
            result.append((cl, startIdx, days.count - startIdx))
        }
        return result
    }
}
