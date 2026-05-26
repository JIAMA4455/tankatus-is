import SwiftUI

struct KPIView: View {
    @StateObject private var vm = KPIViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    projectPicker

                    if vm.isLoading {
                        ProgressView("Расчёт KPI...")
                            .frame(maxWidth: .infinity).padding(40)
                    } else if let kpi = vm.kpi {
                        if kpi.bac == 0 {
                            ContentUnavailableView(
                                "Нет данных",
                                systemImage: "chart.line.uptrend.xyaxis",
                                description: Text("Укажите бюджет в задачах проекта для расчёта KPI")
                            )
                            .padding(40)
                        } else {
                            baseMetrics(kpi)
                            kpiIndicators(kpi)
                            forecastSection(kpi)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("KPI — EVM")
            .task { await vm.loadProjects() }
            .refreshable { await vm.loadProjects() }
        }
    }

    @ViewBuilder
    private var projectPicker: some View {
        if !vm.projects.isEmpty {
            Picker("Проект", selection: $vm.selectedProject) {
                ForEach(vm.projects) { project in
                    Text(project.name).tag(Optional(project))
                }
            }
            .pickerStyle(.menu)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 4)
            .onChange(of: vm.selectedProject) { _, newVal in
                if let p = newVal { vm.loadKPI(projectId: p.id) }
            }
        }
    }

    @ViewBuilder
    private func baseMetrics(_ kpi: ComputedKPI) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Базовые метрики EVM").font(.headline)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                MetricCard(label: "BAC", subtitle: "Бюджет проекта",
                           value: "\(kpi.bac.formatted(0)) BYN", color: .blue)
                MetricCard(label: "PV", subtitle: "Плановый объём",
                           value: "\(kpi.pv.formatted(0)) BYN", color: .gray)
                MetricCard(label: "EV", subtitle: "Освоенный объём",
                           value: "\(kpi.ev.formatted(0)) BYN", color: .green)
                MetricCard(label: "AC", subtitle: "Фактическая стоимость",
                           value: "\(kpi.ac.formatted(0)) BYN", color: .orange)
            }
        }
    }

    @ViewBuilder
    private func kpiIndicators(_ kpi: ComputedKPI) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Показатели эффективности").font(.headline)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                KPICard(label: "SPI", subtitle: "Индекс выполнения сроков",
                        value: kpi.spi.formatted(), isGood: kpi.spi >= 1,
                        formula: "EV / PV")
                KPICard(label: "CPI", subtitle: "Индекс стоимости",
                        value: kpi.cpi.formatted(), isGood: kpi.cpi >= 1,
                        formula: "EV / AC")
                KPICard(label: "SV", subtitle: "Отклонение по срокам",
                        value: "\(kpi.sv > 0 ? "+" : "")\(kpi.sv.formatted(0)) BYN",
                        isGood: kpi.sv >= 0, formula: "EV - PV")
                KPICard(label: "CV", subtitle: "Отклонение по стоимости",
                        value: "\(kpi.cv > 0 ? "+" : "")\(kpi.cv.formatted(0)) BYN",
                        isGood: kpi.cv >= 0, formula: "EV - AC")
            }
        }
    }

    @ViewBuilder
    private func forecastSection(_ kpi: ComputedKPI) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Прогноз").font(.headline)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                MetricCard(label: "EAC", subtitle: "Прогноз итоговой стоимости",
                           value: "\(kpi.eac.formatted(0)) BYN", color: .orange)
                MetricCard(label: "ETC", subtitle: "Нужно ещё средств",
                           value: "\(kpi.etc.formatted(0)) BYN", color: .purple)
            }
            KPICard(label: "VAC", subtitle: "Разница при завершении (BAC - EAC)",
                    value: "\(kpi.vac > 0 ? "+" : "")\(kpi.vac.formatted(0)) BYN",
                    isGood: kpi.vac >= 0, formula: "BAC - EAC")
        }
    }
}

private struct MetricCard: View {
    let label: String
    let subtitle: String
    let value: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.caption).fontWeight(.bold).foregroundColor(color)
            Text(value).font(.title3).fontWeight(.bold)
            Text(subtitle).font(.caption2).foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4)
    }
}

struct KPICard: View {
    let label: String
    let subtitle: String
    let value: String
    let isGood: Bool
    var formula: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(label).font(.headline).fontWeight(.bold)
                Spacer()
                Image(systemName: isGood ? "checkmark.circle.fill" : "exclamationmark.circle.fill")
                    .foregroundColor(isGood ? .green : .red)
            }
            Text(value)
                .font(.title2).fontWeight(.bold)
                .foregroundColor(isGood ? .green : .red)
            Text(subtitle).font(.caption2).foregroundColor(.secondary)
            HStack {
                Text(isGood ? "В норме" : "Отклонение")
                    .font(.caption2).fontWeight(.semibold)
                    .foregroundColor(isGood ? .green : .red)
                if !formula.isEmpty {
                    Spacer()
                    Text(formula)
                        .font(.caption2).foregroundColor(.secondary.opacity(0.7))
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isGood ? Color.green.opacity(0.3) : Color.red.opacity(0.3), lineWidth: 1.5)
        )
    }
}
