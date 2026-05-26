import Foundation

final class LocalDataStore {
    static let shared = LocalDataStore()

    private(set) var users: [User] = []
    private(set) var projects: [Project] = []
    private(set) var stages: [Stage] = []
    private(set) var tasks: [ProjectTask] = []
    private(set) var kpiSnapshots: [KpiSnapshot] = []
    private(set) var projectMembers: [String: [ProjectMember]] = [:]

    private init() {
        seedData()
    }

    private func seedData() {
        let uid1 = "u-admin-0001"
        let uid2 = "u-manager-002"
        let uid3 = "u-dev1-00003"
        let uid4 = "u-analyst-004"

        let pid1 = "p-shop-000001"
        let pid2 = "p-crm-0000002"
        let pid3 = "p-fitness-003"

        let sid1 = "s-analysis-01"
        let sid2 = "s-design-0002"
        let sid3 = "s-develop-003"
        let sid4 = "s-fit-anal-04"
        let sid5 = "s-fit-design5"
        let sid6 = "s-fit-dev-006"
        let sid7 = "s-fit-test-07"
        let sid8 = "s-fit-deploy8"

        let kpi1 = "k-feb-0000001"
        let kpi2 = "k-mar-0000002"
        let kpi3 = "k-apr-0000003"

        users = [
            User(id: uid1, email: "admin@tankatus.by",    full_name: "Администратор системы", role: "admin",   department: "IT-отдел",      avatar_url: nil, is_active: true, created_at: "2025-01-01"),
            User(id: uid2, email: "manager@tankatus.by",  full_name: "Иванов Иван Иванович",  role: "manager", department: "IT-отдел",      avatar_url: nil, is_active: true, created_at: "2025-01-01"),
            User(id: uid3, email: "dev1@tankatus.by",     full_name: "Петров Пётр Петрович",  role: "worker",  department: "IT-отдел",      avatar_url: nil, is_active: true, created_at: "2025-01-01"),
            User(id: uid4, email: "analyst@tankatus.by",  full_name: "Сидорова Анна Юрьевна", role: "worker",  department: "Отдел продаж",  avatar_url: nil, is_active: true, created_at: "2025-01-01"),
        ]

        let membersP1: [ProjectMember] = [
            ProjectMember(id: uid2, full_name: "Иванов Иван Иванович",  email: "manager@tankatus.by",  role: "manager", department: "IT-отдел",     project_role: "manager"),
            ProjectMember(id: uid3, full_name: "Петров Пётр Петрович",  email: "dev1@tankatus.by",     role: "worker",  department: "IT-отдел",     project_role: "member"),
            ProjectMember(id: uid4, full_name: "Сидорова Анна Юрьевна", email: "analyst@tankatus.by",  role: "worker",  department: "Отдел продаж", project_role: "member"),
        ]

        let membersP3 = membersP1

        projectMembers = [
            pid1: membersP1,
            pid2: [ProjectMember(id: uid2, full_name: "Иванов Иван Иванович", email: "manager@tankatus.by", role: "manager", department: "IT-отдел", project_role: "manager")],
            pid3: membersP3
        ]

        projects = [
            Project(
                id: pid1,
                name: "Разработка интернет-магазина v2",
                description: "Редизайн и переработка платформы электронной коммерции",
                status: "active",
                priority: "high",
                start_date: "2026-01-01",
                end_date: "2026-06-30",
                budget: 150000,
                manager_id: uid2,
                manager_name: "Иванов Иван Иванович",
                total_tasks: 3,
                done_tasks: 1,
                members: membersP1,
                created_at: "2025-12-01",
                updated_at: "2026-04-01"
            ),
            Project(
                id: pid2,
                name: "Внедрение CRM-системы",
                description: "Интеграция CRM для управления клиентской базой",
                status: "planning",
                priority: "medium",
                start_date: "2026-04-01",
                end_date: "2026-09-30",
                budget: 80000,
                manager_id: uid2,
                manager_name: "Иванов Иван Иванович",
                total_tasks: 0,
                done_tasks: 0,
                members: [ProjectMember(id: uid2, full_name: "Иванов Иван Иванович", email: "manager@tankatus.by", role: "manager", department: "IT-отдел", project_role: "manager")],
                created_at: "2026-03-01",
                updated_at: "2026-04-01"
            ),
            Project(
                id: pid3,
                name: "Разработка фитнес-приложения FitTrack",
                description: "Мобильное приложение для отслеживания тренировок, питания и прогресса",
                status: "active",
                priority: "high",
                start_date: "2026-02-01",
                end_date: "2026-07-31",
                budget: 500000,
                manager_id: uid2,
                manager_name: "Иванов Иван Иванович",
                total_tasks: 20,
                done_tasks: 10,
                members: membersP3,
                created_at: "2026-01-15",
                updated_at: "2026-05-17"
            ),
        ]

        stages = [
            Stage(id: sid1, project_id: pid1, name: "Анализ требований",         description: nil, order_index: 1, status: "completed",   start_date: "2026-01-01", end_date: "2026-01-31"),
            Stage(id: sid2, project_id: pid1, name: "Дизайн и прототипирование", description: nil, order_index: 2, status: "completed",   start_date: "2026-02-01", end_date: "2026-02-28"),
            Stage(id: sid3, project_id: pid1, name: "Разработка",                description: nil, order_index: 3, status: "in_progress", start_date: "2026-03-01", end_date: "2026-05-31"),
            Stage(id: sid4, project_id: pid3, name: "Аналитика",                 description: nil, order_index: 1, status: "completed",   start_date: "2026-02-01", end_date: "2026-02-28"),
            Stage(id: sid5, project_id: pid3, name: "Дизайн",                    description: nil, order_index: 2, status: "completed",   start_date: "2026-03-01", end_date: "2026-03-31"),
            Stage(id: sid6, project_id: pid3, name: "Разработка",                description: nil, order_index: 3, status: "in_progress", start_date: "2026-04-01", end_date: "2026-06-15"),
            Stage(id: sid7, project_id: pid3, name: "Тестирование",              description: nil, order_index: 4, status: "planned",     start_date: "2026-06-16", end_date: "2026-07-10"),
            Stage(id: sid8, project_id: pid3, name: "Релиз",                     description: nil, order_index: 5, status: "planned",     start_date: "2026-07-11", end_date: "2026-07-31"),
        ]

        tasks = [
            // === Проект 1: Интернет-магазин ===
            ProjectTask(id: "t-cicd-000001", project_id: pid1, stage_id: sid3, stage_name: "Разработка", parent_task_id: nil, title: "Настройка CI/CD pipeline", description: "Настроить автоматическую сборку и деплой", status: "in_progress", priority: "high", assignee_id: uid3, assignee_name: "Петров Пётр Петрович", creator_name: "Иванов Иван Иванович", estimated_hours: 16, actual_hours: nil, budget: 25000, actual_cost: 12000, start_date: "2026-03-01", due_date: "2026-04-15", project_name: "Разработка интернет-магазина v2", comments: [], created_at: "2026-03-01", updated_at: "2026-04-01"),
            ProjectTask(id: "t-cart-000002", project_id: pid1, stage_id: sid3, stage_name: "Разработка", parent_task_id: nil, title: "Реализация корзины покупок", description: nil, status: "todo", priority: "critical", assignee_id: uid3, assignee_name: "Петров Пётр Петрович", creator_name: "Иванов Иван Иванович", estimated_hours: 24, actual_hours: nil, budget: 45000, actual_cost: nil, start_date: "2026-03-15", due_date: "2026-05-01", project_name: "Разработка интернет-магазина v2", comments: [], created_at: "2026-03-15", updated_at: "2026-04-01"),
            ProjectTask(id: "t-req-0000003", project_id: pid1, stage_id: sid1, stage_name: "Анализ требований", parent_task_id: nil, title: "Сбор и анализ требований", description: nil, status: "done", priority: "high", assignee_id: uid4, assignee_name: "Сидорова Анна Юрьевна", creator_name: "Иванов Иван Иванович", estimated_hours: 40, actual_hours: 38, budget: 80000, actual_cost: 78000, start_date: "2026-01-01", due_date: "2026-01-31", project_name: "Разработка интернет-магазина v2", comments: [], created_at: "2026-01-01", updated_at: "2026-01-31"),

            // === Проект 3: FitTrack — 20 задач ===
            // Этап: Аналитика (done)
            ProjectTask(id: "t-fit-01", project_id: pid3, stage_id: sid4, stage_name: "Аналитика", parent_task_id: nil, title: "Сбор требований к приложению", description: "Интервью с ЦА, анализ потребностей", status: "done", priority: "high", assignee_id: uid4, assignee_name: "Сидорова Анна Юрьевна", creator_name: "Иванов Иван Иванович", estimated_hours: 40, actual_hours: 38, budget: 30000, actual_cost: 28000, start_date: "2026-02-01", due_date: "2026-02-15", project_name: "Разработка фитнес-приложения FitTrack", comments: [], created_at: "2026-02-01", updated_at: "2026-02-15"),
            ProjectTask(id: "t-fit-02", project_id: pid3, stage_id: sid4, stage_name: "Аналитика", parent_task_id: nil, title: "Анализ конкурентов", description: "Анализ Strava, MyFitnessPal, Nike Training", status: "done", priority: "medium", assignee_id: uid4, assignee_name: "Сидорова Анна Юрьевна", creator_name: "Иванов Иван Иванович", estimated_hours: 20, actual_hours: 22, budget: 15000, actual_cost: 16000, start_date: "2026-02-10", due_date: "2026-02-20", project_name: "Разработка фитнес-приложения FitTrack", comments: [], created_at: "2026-02-10", updated_at: "2026-02-20"),
            ProjectTask(id: "t-fit-03", project_id: pid3, stage_id: sid4, stage_name: "Аналитика", parent_task_id: nil, title: "Составление технического задания", description: nil, status: "done", priority: "high", assignee_id: uid4, assignee_name: "Сидорова Анна Юрьевна", creator_name: "Иванов Иван Иванович", estimated_hours: 32, actual_hours: 30, budget: 25000, actual_cost: 24000, start_date: "2026-02-18", due_date: "2026-02-28", project_name: "Разработка фитнес-приложения FitTrack", comments: [], created_at: "2026-02-18", updated_at: "2026-02-28"),

            // Этап: Дизайн (done)
            ProjectTask(id: "t-fit-04", project_id: pid3, stage_id: sid5, stage_name: "Дизайн", parent_task_id: nil, title: "Дизайн UI/UX", description: "Wireframes, user flows, UI kit", status: "done", priority: "high", assignee_id: uid3, assignee_name: "Петров Пётр Петрович", creator_name: "Иванов Иван Иванович", estimated_hours: 60, actual_hours: 64, budget: 40000, actual_cost: 42000, start_date: "2026-03-01", due_date: "2026-03-15", project_name: "Разработка фитнес-приложения FitTrack", comments: [], created_at: "2026-03-01", updated_at: "2026-03-15"),
            ProjectTask(id: "t-fit-05", project_id: pid3, stage_id: sid5, stage_name: "Дизайн", parent_task_id: nil, title: "Интерактивное прототипирование", description: "Figma-прототип для тестирования", status: "done", priority: "medium", assignee_id: uid3, assignee_name: "Петров Пётр Петрович", creator_name: "Иванов Иван Иванович", estimated_hours: 24, actual_hours: 22, budget: 20000, actual_cost: 19000, start_date: "2026-03-15", due_date: "2026-03-25", project_name: "Разработка фитнес-приложения FitTrack", comments: [], created_at: "2026-03-15", updated_at: "2026-03-25"),
            ProjectTask(id: "t-fit-06", project_id: pid3, stage_id: sid5, stage_name: "Дизайн", parent_task_id: nil, title: "Создание дизайн-системы", description: "Цвета, типографика, компоненты", status: "done", priority: "medium", assignee_id: uid3, assignee_name: "Петров Пётр Петрович", creator_name: "Иванов Иван Иванович", estimated_hours: 16, actual_hours: 18, budget: 15000, actual_cost: 15500, start_date: "2026-03-25", due_date: "2026-03-31", project_name: "Разработка фитнес-приложения FitTrack", comments: [], created_at: "2026-03-25", updated_at: "2026-03-31"),

            // Этап: Разработка (частично done, частично in_progress, частично todo)
            ProjectTask(id: "t-fit-07", project_id: pid3, stage_id: sid6, stage_name: "Разработка", parent_task_id: nil, title: "Настройка проекта и CI/CD", description: "Xcode, Swift Package Manager, Fastlane", status: "done", priority: "high", assignee_id: uid3, assignee_name: "Петров Пётр Петрович", creator_name: "Иванов Иван Иванович", estimated_hours: 16, actual_hours: 14, budget: 20000, actual_cost: 18000, start_date: "2026-04-01", due_date: "2026-04-05", project_name: "Разработка фитнес-приложения FitTrack", comments: [], created_at: "2026-04-01", updated_at: "2026-04-05"),
            ProjectTask(id: "t-fit-08", project_id: pid3, stage_id: sid6, stage_name: "Разработка", parent_task_id: nil, title: "Модуль авторизации", description: "Регистрация, вход, восстановление пароля", status: "done", priority: "high", assignee_id: uid3, assignee_name: "Петров Пётр Петрович", creator_name: "Иванов Иван Иванович", estimated_hours: 32, actual_hours: 36, budget: 25000, actual_cost: 27000, start_date: "2026-04-05", due_date: "2026-04-10", project_name: "Разработка фитнес-приложения FitTrack", comments: [], created_at: "2026-04-05", updated_at: "2026-04-10"),
            ProjectTask(id: "t-fit-09", project_id: pid3, stage_id: sid6, stage_name: "Разработка", parent_task_id: nil, title: "Профиль пользователя", description: "Личные данные, параметры тела, цели", status: "done", priority: "medium", assignee_id: uid3, assignee_name: "Петров Пётр Петрович", creator_name: "Иванов Иван Иванович", estimated_hours: 24, actual_hours: 26, budget: 20000, actual_cost: 21000, start_date: "2026-04-10", due_date: "2026-04-15", project_name: "Разработка фитнес-приложения FitTrack", comments: [], created_at: "2026-04-10", updated_at: "2026-04-15"),
            ProjectTask(id: "t-fit-10", project_id: pid3, stage_id: sid6, stage_name: "Разработка", parent_task_id: nil, title: "Каталог тренировок", description: "Список упражнений, фильтрация, поиск", status: "done", priority: "high", assignee_id: uid3, assignee_name: "Петров Пётр Петрович", creator_name: "Иванов Иван Иванович", estimated_hours: 48, actual_hours: 52, budget: 35000, actual_cost: 38000, start_date: "2026-04-15", due_date: "2026-04-25", project_name: "Разработка фитнес-приложения FitTrack", comments: [], created_at: "2026-04-15", updated_at: "2026-04-25"),
            ProjectTask(id: "t-fit-11", project_id: pid3, stage_id: sid6, stage_name: "Разработка", parent_task_id: nil, title: "Трекер активности", description: "Запись тренировок, таймеры, счётчики", status: "in_progress", priority: "critical", assignee_id: uid3, assignee_name: "Петров Пётр Петрович", creator_name: "Иванов Иван Иванович", estimated_hours: 56, actual_hours: 30, budget: 40000, actual_cost: 22000, start_date: "2026-04-25", due_date: "2026-05-10", project_name: "Разработка фитнес-приложения FitTrack", comments: [], created_at: "2026-04-25", updated_at: "2026-05-10"),
            ProjectTask(id: "t-fit-12", project_id: pid3, stage_id: sid6, stage_name: "Разработка", parent_task_id: nil, title: "Push-уведомления", description: "Напоминания о тренировках, достижения", status: "in_progress", priority: "medium", assignee_id: uid3, assignee_name: "Петров Пётр Петрович", creator_name: "Иванов Иван Иванович", estimated_hours: 24, actual_hours: 12, budget: 25000, actual_cost: 10000, start_date: "2026-05-01", due_date: "2026-05-12", project_name: "Разработка фитнес-приложения FitTrack", comments: [], created_at: "2026-05-01", updated_at: "2026-05-12"),
            ProjectTask(id: "t-fit-13", project_id: pid3, stage_id: sid6, stage_name: "Разработка", parent_task_id: nil, title: "Интеграция с Apple HealthKit", description: "Синхронизация шагов, пульса, калорий", status: "in_progress", priority: "high", assignee_id: uid3, assignee_name: "Петров Пётр Петрович", creator_name: "Иванов Иван Иванович", estimated_hours: 40, actual_hours: 10, budget: 30000, actual_cost: 8000, start_date: "2026-05-05", due_date: "2026-05-15", project_name: "Разработка фитнес-приложения FitTrack", comments: [], created_at: "2026-05-05", updated_at: "2026-05-15"),
            ProjectTask(id: "t-fit-14", project_id: pid3, stage_id: sid6, stage_name: "Разработка", parent_task_id: nil, title: "Социальные функции", description: "Друзья, соревнования, лидерборды", status: "todo", priority: "medium", assignee_id: uid3, assignee_name: "Петров Пётр Петрович", creator_name: "Иванов Иван Иванович", estimated_hours: 48, actual_hours: nil, budget: 35000, actual_cost: nil, start_date: "2026-05-15", due_date: "2026-05-25", project_name: "Разработка фитнес-приложения FitTrack", comments: [], created_at: "2026-05-15", updated_at: "2026-05-15"),
            ProjectTask(id: "t-fit-15", project_id: pid3, stage_id: sid6, stage_name: "Разработка", parent_task_id: nil, title: "Платёжная система подписок", description: "StoreKit 2, подписки, пробный период", status: "todo", priority: "high", assignee_id: uid3, assignee_name: "Петров Пётр Петрович", creator_name: "Иванов Иван Иванович", estimated_hours: 40, actual_hours: nil, budget: 30000, actual_cost: nil, start_date: "2026-05-25", due_date: "2026-06-05", project_name: "Разработка фитнес-приложения FitTrack", comments: [], created_at: "2026-05-15", updated_at: "2026-05-15"),
            ProjectTask(id: "t-fit-16", project_id: pid3, stage_id: sid6, stage_name: "Разработка", parent_task_id: nil, title: "Оффлайн-режим и кэширование", description: "Core Data, синхронизация", status: "todo", priority: "medium", assignee_id: uid3, assignee_name: "Петров Пётр Петрович", creator_name: "Иванов Иван Иванович", estimated_hours: 32, actual_hours: nil, budget: 20000, actual_cost: nil, start_date: "2026-06-01", due_date: "2026-06-15", project_name: "Разработка фитнес-приложения FitTrack", comments: [], created_at: "2026-05-15", updated_at: "2026-05-15"),

            // Этап: Тестирование (todo)
            ProjectTask(id: "t-fit-17", project_id: pid3, stage_id: sid7, stage_name: "Тестирование", parent_task_id: nil, title: "Unit- и UI-тестирование", description: "XCTest, покрытие > 70%", status: "todo", priority: "high", assignee_id: uid3, assignee_name: "Петров Пётр Петрович", creator_name: "Иванов Иван Иванович", estimated_hours: 40, actual_hours: nil, budget: 25000, actual_cost: nil, start_date: "2026-06-16", due_date: "2026-06-25", project_name: "Разработка фитнес-приложения FitTrack", comments: [], created_at: "2026-05-15", updated_at: "2026-05-15"),
            ProjectTask(id: "t-fit-18", project_id: pid3, stage_id: sid7, stage_name: "Тестирование", parent_task_id: nil, title: "Интеграционное тестирование", description: "API, HealthKit, платежи", status: "todo", priority: "high", assignee_id: uid4, assignee_name: "Сидорова Анна Юрьевна", creator_name: "Иванов Иван Иванович", estimated_hours: 32, actual_hours: nil, budget: 20000, actual_cost: nil, start_date: "2026-06-25", due_date: "2026-07-05", project_name: "Разработка фитнес-приложения FitTrack", comments: [], created_at: "2026-05-15", updated_at: "2026-05-15"),

            // Этап: Релиз (todo)
            ProjectTask(id: "t-fit-19", project_id: pid3, stage_id: sid8, stage_name: "Релиз", parent_task_id: nil, title: "Подготовка к релизу", description: "App Store Connect, скриншоты, описание", status: "todo", priority: "medium", assignee_id: uid4, assignee_name: "Сидорова Анна Юрьевна", creator_name: "Иванов Иван Иванович", estimated_hours: 16, actual_hours: nil, budget: 15000, actual_cost: nil, start_date: "2026-07-11", due_date: "2026-07-20", project_name: "Разработка фитнес-приложения FitTrack", comments: [], created_at: "2026-05-15", updated_at: "2026-05-15"),
            ProjectTask(id: "t-fit-20", project_id: pid3, stage_id: sid8, stage_name: "Релиз", parent_task_id: nil, title: "Публикация в App Store", description: "Ревью, релиз, мониторинг крашей", status: "todo", priority: "critical", assignee_id: uid2, assignee_name: "Иванов Иван Иванович", creator_name: "Иванов Иван Иванович", estimated_hours: 8, actual_hours: nil, budget: 15000, actual_cost: nil, start_date: "2026-07-20", due_date: "2026-07-31", project_name: "Разработка фитнес-приложения FitTrack", comments: [], created_at: "2026-05-15", updated_at: "2026-05-15"),
        ]

        kpiSnapshots = [
            KpiSnapshot(id: kpi1, project_id: pid1, snapshot_date: "2026-02-01",
                        planned_value: 25000, earned_value: 23000, actual_cost: 24000, budget_at_completion: 150000,
                        spi: 0.92, cpi: 0.9583, cv: -1000, sv: -2000, eac: 156521.74, etc: 132521.74),
            KpiSnapshot(id: kpi2, project_id: pid1, snapshot_date: "2026-03-01",
                        planned_value: 50000, earned_value: 48000, actual_cost: 47500, budget_at_completion: 150000,
                        spi: 0.96, cpi: 1.0105, cv: 500, sv: -2000, eac: 148465.12, etc: 100965.12),
            KpiSnapshot(id: kpi3, project_id: pid1, snapshot_date: "2026-04-01",
                        planned_value: 75000, earned_value: 72000, actual_cost: 71000, budget_at_completion: 150000,
                        spi: 0.96, cpi: 1.0141, cv: 1000, sv: -3000, eac: 147918.89, etc: 76918.89),
        ]
    }

    func getDashboardStats(userId: String) -> DashboardStats {
        let allProjects = getProjects(userId: userId)
        let allTasks = tasks

        var projectStatusMap: [String: Int] = [:]
        for p in allProjects { projectStatusMap[p.status, default: 0] += 1 }
        let projectStats = projectStatusMap.map { StatusCount(status: $0.key, cnt: "\($0.value)") }

        var taskStatusMap: [String: Int] = [:]
        for t in allTasks { taskStatusMap[t.status, default: 0] += 1 }
        let taskStats = taskStatusMap.map { StatusCount(status: $0.key, cnt: "\($0.value)") }

        let overdue = allTasks.filter { $0.isOverdue }.count

        let activeProjects = allProjects.filter { $0.status == "active" || $0.status == "planning" }

        return DashboardStats(
            project_stats: projectStats,
            task_stats: taskStats,
            overdue_tasks: overdue,
            recent_active_projects: Array(activeProjects.prefix(5))
        )
    }

    func getProjects(userId: String) -> [Project] {
        guard let user = users.first(where: { $0.id == userId }) else { return [] }
        if user.role == "admin" || user.role == "manager" { return projects }
        return projects.filter { project in
            projectMembers[project.id]?.contains(where: { $0.id == userId }) ?? false
        }
    }

    func getProject(id: String) -> Project? {
        projects.first { $0.id == id }
    }

    func getTasks(projectId: String) -> [ProjectTask] {
        tasks.filter { $0.project_id == projectId }
    }

    func getMyTasks(userId: String) -> [ProjectTask] {
        tasks.filter { $0.assignee_id == userId }
    }

    func getStages(projectId: String) -> [Stage] {
        stages.filter { $0.project_id == projectId }.sorted { $0.order_index < $1.order_index }
    }

    func getKpiSnapshots(projectId: String) -> [KpiSnapshot] {
        kpiSnapshots.filter { $0.project_id == projectId }.sorted { $0.snapshot_date < $1.snapshot_date }
    }

    func getUsers() -> [User] { users }

    func computeKPI(projectId: String) -> ComputedKPI {
        let projectTasks = tasks.filter { $0.project_id == projectId }
        let today = Date()
        let df = DateFormatter.apiDate

        let bac = projectTasks.compactMap { $0.budget }.reduce(0, +)

        let pv = projectTasks.filter { task in
            guard let due = task.due_date, let dueDate = df.date(from: due) else { return false }
            return dueDate <= today
        }.compactMap { $0.budget }.reduce(0, +)

        let ev = projectTasks.filter { $0.status == "done" }
            .compactMap { $0.budget }.reduce(0, +)

        let ac = projectTasks.map { $0.effectiveActualCost }.reduce(0, +)

        return ComputedKPI(bac: bac, pv: pv, ev: ev, ac: ac)
    }

    func getUserLoads() -> [UserLoad] {
        users.map { user in
            let userTasks = tasks.filter { $0.assignee_id == user.id }
            let planned = userTasks.compactMap { $0.estimated_hours }.reduce(0, +)
            let actual  = userTasks.compactMap { $0.actual_hours }.reduce(0, +)
            let active  = userTasks.filter { $0.status != "done" }.count
            return UserLoad(id: user.id, full_name: user.full_name, department: user.department,
                            total_planned: planned > 0 ? planned : nil,
                            total_actual: actual > 0 ? actual : nil,
                            active_tasks: active)
        }
    }

    @discardableResult
    func createProject(name: String, description: String?, status: String, priority: String,
                       startDate: String?, endDate: String?, budget: Double?, managerId: String) -> Project {
        let managerName = users.first { $0.id == managerId }?.full_name
        let now = DateFormatter.apiDate.string(from: Date())
        let project = Project(
            id: "p-\(UUID().uuidString.prefix(8).lowercased())",
            name: name, description: description,
            status: status, priority: priority,
            start_date: startDate, end_date: endDate, budget: budget,
            manager_id: managerId, manager_name: managerName,
            total_tasks: 0, done_tasks: 0,
            members: [ProjectMember(id: managerId, full_name: managerName ?? "", email: users.first { $0.id == managerId }?.email ?? "", role: "manager", department: users.first { $0.id == managerId }?.department, project_role: "manager")],
            created_at: now, updated_at: now
        )
        projects.append(project)
        projectMembers[project.id] = project.members ?? []
        return project
    }

    @discardableResult
    func updateProject(id: String, name: String, description: String?, status: String, priority: String,
                       startDate: String?, endDate: String?, budget: Double?) -> Project? {
        guard let idx = projects.firstIndex(where: { $0.id == id }) else { return nil }
        let p = projects[idx]
        let updated = Project(
            id: p.id, name: name, description: description,
            status: status, priority: priority,
            start_date: startDate, end_date: endDate, budget: budget,
            manager_id: p.manager_id, manager_name: p.manager_name,
            total_tasks: p.total_tasks, done_tasks: p.done_tasks,
            members: p.members, created_at: p.created_at, updated_at: DateFormatter.apiDate.string(from: Date())
        )
        projects[idx] = updated
        return updated
    }

    func deleteProject(id: String) {
        projects.removeAll { $0.id == id }
        tasks.removeAll { $0.project_id == id }
        stages.removeAll { $0.project_id == id }
        kpiSnapshots.removeAll { $0.project_id == id }
        projectMembers.removeValue(forKey: id)
    }

    @discardableResult
    func createTask(projectId: String, stageId: String?, title: String, description: String?,
                    status: String, priority: String, assigneeId: String?,
                    estimatedHours: Double?, dueDate: String?, creatorId: String,
                    parentTaskId: String? = nil,
                    budget: Double? = nil, actualCost: Double? = nil) -> ProjectTask {
        let now = DateFormatter.apiDate.string(from: Date())
        let stageName = stages.first { $0.id == stageId }?.name
        let assigneeName = users.first { $0.id == assigneeId }?.full_name
        let creatorName = users.first { $0.id == creatorId }?.full_name
        let projectName = projects.first { $0.id == projectId }?.name
        let task = ProjectTask(
            id: "t-\(UUID().uuidString.prefix(8).lowercased())",
            project_id: projectId, stage_id: stageId, stage_name: stageName,
            parent_task_id: parentTaskId, title: title, description: description,
            status: status, priority: priority,
            assignee_id: assigneeId, assignee_name: assigneeName, creator_name: creatorName,
            estimated_hours: estimatedHours, actual_hours: nil,
            budget: budget, actual_cost: actualCost,
            start_date: now, due_date: dueDate, project_name: projectName,
            comments: [], created_at: now, updated_at: now
        )
        tasks.append(task)
        updateProjectTaskCounts(projectId: projectId)
        return task
    }

    @discardableResult
    func updateTask(id: String, title: String, description: String?, status: String, priority: String,
                    assigneeId: String?, estimatedHours: Double?, dueDate: String?,
                    budget: Double? = nil, actualCost: Double? = nil) -> ProjectTask? {
        guard let idx = tasks.firstIndex(where: { $0.id == id }) else { return nil }
        let old = tasks[idx]
        let stageName = stages.first { $0.id == old.stage_id }?.name
        let assigneeName = users.first { $0.id == assigneeId }?.full_name
        let updated = ProjectTask(
            id: old.id, project_id: old.project_id, stage_id: old.stage_id, stage_name: stageName,
            parent_task_id: old.parent_task_id, title: title, description: description,
            status: status, priority: priority,
            assignee_id: assigneeId, assignee_name: assigneeName, creator_name: old.creator_name,
            estimated_hours: estimatedHours, actual_hours: old.actual_hours,
            budget: budget, actual_cost: actualCost,
            start_date: old.start_date, due_date: dueDate, project_name: old.project_name,
            comments: old.comments, created_at: old.created_at, updated_at: DateFormatter.apiDate.string(from: Date())
        )
        tasks[idx] = updated
        updateProjectTaskCounts(projectId: old.project_id)
        return updated
    }

    func deleteTask(id: String) {
        if let task = tasks.first(where: { $0.id == id }) {
            tasks.removeAll { $0.id == id }
            updateProjectTaskCounts(projectId: task.project_id)
        }
    }

    @discardableResult
    func updateTaskStatus(taskId: String, status: String) -> ProjectTask? {
        guard let idx = tasks.firstIndex(where: { $0.id == taskId }) else { return nil }
        let old = tasks[idx]
        let updated = ProjectTask(
            id: old.id, project_id: old.project_id, stage_id: old.stage_id, stage_name: old.stage_name,
            parent_task_id: old.parent_task_id, title: old.title, description: old.description,
            status: status, priority: old.priority,
            assignee_id: old.assignee_id, assignee_name: old.assignee_name, creator_name: old.creator_name,
            estimated_hours: old.estimated_hours, actual_hours: old.actual_hours,
            budget: old.budget, actual_cost: old.actual_cost,
            start_date: old.start_date, due_date: old.due_date, project_name: old.project_name,
            comments: old.comments,
            created_at: old.created_at, updated_at: DateFormatter.apiDate.string(from: Date())
        )
        tasks[idx] = updated
        updateProjectTaskCounts(projectId: old.project_id)
        return updated
    }

    private func updateProjectTaskCounts(projectId: String) {
        guard let idx = projects.firstIndex(where: { $0.id == projectId }) else { return }
        let p = projects[idx]
        let projectTasks = tasks.filter { $0.project_id == projectId }
        let done = projectTasks.filter { $0.status == "done" }.count
        let members = projectMembers[projectId]
        projects[idx] = Project(
            id: p.id, name: p.name, description: p.description,
            status: p.status, priority: p.priority,
            start_date: p.start_date, end_date: p.end_date, budget: p.budget,
            manager_id: p.manager_id, manager_name: p.manager_name,
            total_tasks: projectTasks.count, done_tasks: done,
            members: members, created_at: p.created_at, updated_at: p.updated_at
        )
    }
}
