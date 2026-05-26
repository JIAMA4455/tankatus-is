import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authStore: AuthStore
    @StateObject private var vm = AuthViewModel()

    var body: some View {
        ZStack {
            LinearGradient(colors: [Color.blue, Color.blue.opacity(0.7)],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
                .ignoresSafeArea()

            VStack(spacing: 32) {
                VStack(spacing: 8) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 20)
                            .fill(.white)
                            .frame(width: 72, height: 72)
                            .shadow(radius: 8)
                        Image(systemName: "checkmark.seal.fill")
                            .font(.system(size: 36))
                            .foregroundColor(.blue)
                    }
                    Text("Танкатус")
                        .font(.largeTitle).fontWeight(.bold).foregroundColor(.white)
                    Text("Управление IT-проектами")
                        .font(.subheadline).foregroundColor(.white.opacity(0.85))
                }

                VStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Email").font(.caption).foregroundColor(.secondary)
                        TextField("user@tankatus.by", text: $vm.email)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .padding()
                            .background(Color(.systemBackground))
                            .cornerRadius(12)
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Пароль").font(.caption).foregroundColor(.secondary)
                        SecureField("••••••••", text: $vm.password)
                            .padding()
                            .background(Color(.systemBackground))
                            .cornerRadius(12)
                    }

                    if let err = vm.errorMessage {
                        Text(err)
                            .font(.caption).foregroundColor(.red)
                            .padding(10)
                            .frame(maxWidth: .infinity)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(8)
                    }

                    Button {
                        Task { await vm.login() }
                    } label: {
                        HStack {
                            if vm.isLoading {
                                ProgressView().tint(.white)
                            }
                            Text(vm.isLoading ? "Вход..." : "Войти")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(vm.isLoading)
                }
                .padding(24)
                .background(Color(.secondarySystemBackground))
                .cornerRadius(20)
            }
            .padding(24)
        }
    }
}
