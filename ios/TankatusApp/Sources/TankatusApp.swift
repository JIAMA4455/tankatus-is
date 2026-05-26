import SwiftUI

@main
struct TankatusApp: App {
    @StateObject private var authStore = AuthStore.shared

    var body: some Scene {
        WindowGroup {
            Group {
                if authStore.isAuthenticated {
                    MainTabView()
                        .environmentObject(authStore)
                } else {
                    LoginView()
                        .environmentObject(authStore)
                }
            }
            .onAppear {}
        }
    }
}
