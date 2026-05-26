import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var authStore: AuthStore
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView()
                .tabItem { Label("Дашборд", systemImage: "chart.bar.fill") }
                .tag(0)

            ProjectsView()
                .tabItem { Label("Проекты", systemImage: "folder.fill") }
                .tag(1)

            MyTasksView()
                .tabItem { Label("Задачи", systemImage: "checkmark.circle.fill") }
                .tag(2)

            KPIView()
                .tabItem { Label("KPI", systemImage: "chart.line.uptrend.xyaxis") }
                .tag(3)

            ProfileView()
                .tabItem { Label("Профиль", systemImage: "person.circle.fill") }
                .tag(4)
        }
        .task {
            await authStore.fetchMe()
        }
    }
}
