ТЕХНИЧЕСКОЕ ОПИСАНИЕ ПРОЕКТА
Информационная система управления IT-проектами «Tankatus IS»

Данный документ составлен на основе анализа исходного кода приложения. Все названия модулей, структуры данных, имена файлов и потоки данных соответствуют реальной реализации.


1. СТРУКТУРА БАЗЫ ДАННЫХ (IN-MEMORY DATA MODEL)

Приложение использует хранение данных в оперативной памяти. Хранилище реализовано в классе LocalDataStore (файл Sources/Services/LocalDataStore.swift) как синглтон-паттерн. При инициализации вызывается метод seedData(), заполняющий коллекции начальными данными.

Коллекции данных хранилища:

    private(set) var users: [User]
    private(set) var projects: [Project]
    private(set) var stages: [Stage]
    private(set) var tasks: [ProjectTask]
    private(set) var kpiSnapshots: [KpiSnapshot]
    private(set) var projectMembers: [String: [ProjectMember]]


1.1. Сущность User

Файл определения: Sources/Models/Models.swift, строки 3-27.

Поля:
- id: String — уникальный идентификатор (формат: "u-<role>-<number>")
- email: String — адрес электронной почты, используется как логин
- full_name: String — полное имя пользователя (ФИО)
- role: String — роль в системе, допустимые значения: "admin", "manager", "worker"
- department: String? — название подразделения, может быть nil
- avatar_url: String? — URL фотографии профиля, может быть nil
- is_active: Bool — флаг активности учётной записи
- created_at: String — дата регистрации в формате "yyyy-MM-dd"

Вычисляемые свойства:
- displayRole: String — отображаемое название роли на русском языке
- initials: String — инициалы из первых букв имени и фамилии


1.2. Сущность Project

Файл определения: Sources/Models/Models.swift, строки 38-69.

Поля:
- id: String — уникальный идентификатор (формат: "p-<name>-<number>")
- name: String — название проекта
- description: String? — описание проекта
- status: String — статус, допустимые значения: "planning", "active", "on_hold", "completed"
- priority: String — приоритет, допустимые значения: "low", "medium", "high", "critical"
- start_date: String? — дата начала в формате "yyyy-MM-dd"
- end_date: String? — дата окончания в формате "yyyy-MM-dd"
- budget: Double? — общий бюджет проекта в BYN
- manager_id: String? — внешний ключ на User.id (менеджер проекта)
- manager_name: String? — денормализованное имя менеджера для быстрого отображения
- total_tasks: Int? — кэшированное количество задач (пересчитывается при CRUD-операциях)
- done_tasks: Int? — кэшированное количество завершённых задач
- members: [ProjectMember]? — массив участников проекта
- created_at: String — дата создания записи
- updated_at: String — дата последнего обновления

Вычисляемые свойства:
- progress: Double — прогресс выполнения = done_tasks / total_tasks (0.0 ... 1.0)
- isOverdue: Bool — true, если end_date < текущая дата и status != "completed"


1.3. Сущность ProjectMember

Файл определения: Sources/Models/Models.swift, строки 29-36.

Поля:
- id: String — внешний ключ на User.id
- full_name: String — имя участника
- email: String — email участника
- role: String — роль в системе (admin/manager/worker)
- department: String? — подразделение
- project_role: String — роль в конкретном проекте ("manager" или "member")


1.4. Сущность Stage

Файл определения: Sources/Models/Models.swift, строки 71-80.

Поля:
- id: String — уникальный идентификатор (формат: "s-<name>-<number>")
- project_id: String — внешний ключ на Project.id
- name: String — название этапа
- description: String? — описание этапа
- order_index: Int — порядковый номер для сортировки
- status: String — статус этапа: "planned", "in_progress", "completed"
- start_date: String? — дата начала
- end_date: String? — дата окончания


1.5. Сущность ProjectTask

Файл определения: Sources/Models/Models.swift, строки 82-121.

Поля:
- id: String — уникальный идентификатор (формат: "t-<name>-<number>")
- project_id: String — внешний ключ на Project.id
- stage_id: String? — внешний ключ на Stage.id (привязка к этапу)
- stage_name: String? — денормализованное название этапа
- parent_task_id: String? — внешний ключ на ProjectTask.id (самоссылка для иерархии подзадач)
- title: String — название задачи
- description: String? — описание задачи
- status: String — статус: "todo", "in_progress", "review", "done"
- priority: String — приоритет: "low", "medium", "high", "critical"
- assignee_id: String? — внешний ключ на User.id (исполнитель)
- assignee_name: String? — денормализованное имя исполнителя
- creator_name: String? — имя создателя задачи
- estimated_hours: Double? — плановые трудозатраты в часах
- actual_hours: Double? — фактические трудозатраты в часах
- budget: Double? — плановый бюджет задачи в BYN
- actual_cost: Double? — фактические затраты в BYN (если nil — вычисляется автоматически)
- start_date: String? — дата начала работы
- due_date: String? — дедлайн (используется для расчёта PV в EVM)
- project_name: String? — денормализованное название проекта
- comments: [TaskComment]? — массив комментариев
- created_at: String — дата создания
- updated_at: String — дата обновления

Вычисляемые свойства:
- isOverdue: Bool — true, если due_date < текущая дата и status != "done"
- effectiveActualCost: Double — если actual_cost заполнен, возвращает его; иначе авторасчёт: done = budget * 1.0, in_progress = budget * 0.5, review = budget * 0.8, todo = 0

Самоссылка parent_task_id реализует иерархию задач произвольной глубины (WBS). Задачи верхнего уровня имеют parent_task_id = nil.


1.6. Сущность ComputedKPI

Файл определения: Sources/Models/Models.swift, строки 180-193.

Поля (входные):
- bac: Double — Budget at Completion (сумма budget всех задач проекта)
- pv: Double — Planned Value (сумма budget задач с due_date <= сегодня)
- ev: Double — Earned Value (сумма budget задач со статусом "done")
- ac: Double — Actual Cost (сумма effectiveActualCost всех задач)

Вычисляемые свойства (формулы EVM):
- cv: Double = ev - ac (Cost Variance)
- sv: Double = ev - pv (Schedule Variance)
- cpi: Double = ev / ac (Cost Performance Index), guard ac > 0
- spi: Double = ev / pv (Schedule Performance Index), guard pv > 0
- eac: Double = bac / cpi (Estimate at Completion), guard cpi > 0
- etc: Double = eac - ac (Estimate to Complete)
- vac: Double = bac - eac (Variance at Completion)


1.7. Сущность KpiSnapshot

Файл определения: Sources/Models/Models.swift, строки 132-146.

Поля:
- id: String — уникальный идентификатор
- project_id: String — внешний ключ на Project.id
- snapshot_date: String — дата снимка
- planned_value: Double — PV на дату снимка
- earned_value: Double — EV на дату снимка
- actual_cost: Double — AC на дату снимка
- budget_at_completion: Double? — BAC
- spi, cpi, cv, sv, eac, etc: Double? — рассчитанные показатели


1.8. Сущность UserLoad

Файл определения: Sources/Models/Models.swift, строки 166-178.

Поля:
- id: String — внешний ключ на User.id
- full_name: String — имя пользователя
- department: String? — подразделение
- total_planned: Double? — сумма estimated_hours назначенных задач
- total_actual: Double? — сумма actual_hours выполненных задач
- active_tasks: Int? — количество задач со статусом != "done"


1.9. Связи между сущностями

Project (1) --- (N) Stage: проект содержит этапы
Project (1) --- (N) ProjectTask: проект содержит задачи
Project (1) --- (N) ProjectMember: проект имеет участников
Project (1) --- (N) KpiSnapshot: проект имеет историю снимков
User (1) --- (N) ProjectMember: пользователь участвует в проектах
User (1) --- (N) ProjectTask [assignee_id]: пользователю назначены задачи
ProjectTask (1) --- (N) ProjectTask [parent_task_id]: задача имеет подзадачи (рекурсивная связь)
ProjectTask (N) --- (1) Stage: задача привязана к этапу


2. МОДУЛИ ПРИЛОЖЕНИЯ (РЕАЛЬНЫЕ ИМЕНА ФАЙЛОВ)

2.1. Точка входа

Файл: Sources/TankatusApp.swift
Класс: TankatusApp (помечен @main)
Функция: проверяет authStore.isAuthenticated и показывает MainTabView или LoginView.


2.2. Сервисный слой (Sources/Services/)

Файл: AuthStore.swift
Класс: AuthStore (ObservableObject, singleton)
Ответственность: вход/выход, хранение текущего пользователя, персистентность сессии через UserDefaults.
Методы: login(email:password:), logout(), fetchMe().

Файл: LocalDataStore.swift
Класс: LocalDataStore (singleton)
Ответственность: хранение всех данных в памяти, CRUD-операции, вычисление статистики и KPI.
Публичные методы:
- getDashboardStats(userId:) -> DashboardStats
- getProjects(userId:) -> [Project]
- getProject(id:) -> Project?
- getTasks(projectId:) -> [ProjectTask]
- getMyTasks(userId:) -> [ProjectTask]
- getStages(projectId:) -> [Stage]
- getKpiSnapshots(projectId:) -> [KpiSnapshot]
- getUsers() -> [User]
- getUserLoads() -> [UserLoad]
- computeKPI(projectId:) -> ComputedKPI
- createProject(...) -> Project
- updateProject(...) -> Project?
- deleteProject(id:)
- createTask(...) -> ProjectTask
- updateTask(...) -> ProjectTask?
- deleteTask(id:)
- updateTaskStatus(taskId:status:) -> ProjectTask?

Файл: WebSocketService.swift
Класс: WebSocketService (ObservableObject, singleton)
Ответственность: заглушка для offline-режима. Методы connect/disconnect — no-op.

Файл: APIService.swift
Класс: APIService
Ответственность: устаревший HTTP-клиент, не используется в текущей версии.


2.3. Слой ViewModel (Sources/ViewModels/ViewModels.swift)

Все ViewModel помечены @MainActor и реализуют протокол ObservableObject.

Структура: TaskNode (indirect enum)
Назначение: рекурсивное дерево задач для отображения WBS-иерархии.

Класс: AuthViewModel
Свойства: email, password, isLoading, errorMessage
Метод: login() async

Класс: DashboardViewModel
Свойства: stats (DashboardStats?), isLoading
Метод: load() async
Поток данных: AuthStore.shared.currentUser.id -> LocalDataStore.shared.getDashboardStats()

Класс: ProjectsViewModel
Свойства: projects, isLoading
Методы: load() async, createProject(...), updateProject(...), deleteProject(id:)
Поток данных: AuthStore.shared.currentUser.id -> LocalDataStore.shared.getProjects()

Класс: ProjectDetailViewModel
Свойства: project, tasks, stages, isLoading
Методы: load(id:) async, createTask(...), createSubtask(...), updateTask(...), deleteTask(taskId:), updateTaskStatus(...), taskTree(), tasksByStatusTree()
Поток данных: projectId -> LocalDataStore.shared.getProject() + getTasks() + getStages()

Класс: TasksViewModel
Свойства: tasks, isLoading
Методы: load() async, updateStatus(taskId:status:)
Поток данных: AuthStore.shared.currentUser.id -> LocalDataStore.shared.getMyTasks()

Класс: KPIViewModel
Свойства: projects, selectedProject, kpi (ComputedKPI?), isLoading
Методы: loadProjects() async, loadKPI(projectId:)
Поток данных: selectedProject.id -> LocalDataStore.shared.computeKPI()

Класс: UsersViewModel
Свойства: users, loads, isLoading
Методы: load() async, loadFor(_ userId:) -> UserLoad?
Поток данных: LocalDataStore.shared.getUsers() + getUserLoads()


2.4. Слой View (Sources/Views/)

Файл: Views/MainTabView.swift — структура MainTabView
TabView с 5 вкладками: DashboardView, ProjectsView, MyTasksView, KPIView, ProfileView.

Файл: Views/Auth/LoginView.swift — структура LoginView
Экран входа: поля email/пароль, кнопка «Войти», индикатор загрузки, блок ошибки.

Файл: Views/Dashboard/DashboardView.swift — структура DashboardView
Дашборд: сетка StatCard (4 шт.), список активных проектов, круговая диаграмма задач.
Вспомогательная структура: ProjectRowCard.

Файл: Views/Projects/ProjectsView.swift — структура ProjectsView
Список проектов: поиск, фильтр по статусу, создание/редактирование/удаление.
Вспомогательная структура: ProjectListRow.

Файл: Views/Projects/ProjectDetailView.swift — структура ProjectDetailView
Детальный вид: 4 вкладки (Kanban, Список, Гант, Участники), шапка со статистикой.
Вспомогательные структуры: RecursiveTaskRow, TaskRowItem, KanbanTaskCard.

Файл: Views/Projects/ProjectFormView.swift — структура ProjectFormView
Форма создания/редактирования проекта: название, описание, статус, приоритет, бюджет, даты.

Файл: Views/Projects/GanttView.swift — структура GanttView
Диаграмма Ганта: Canvas-рендеринг, масштабирование, временная шкала, бары задач.
Вспомогательная структура: FlatTask.

Файл: Views/Tasks/MyTasksView.swift — структура MyTasksView
Персональные задачи: фильтрация по статусу, кнопки быстрой смены статуса.
Вспомогательная структура: MyTaskRow.

Файл: Views/Tasks/TaskFormView.swift — структура TaskFormView
Универсальная форма задачи/подзадачи: все поля + бюджет + фактические затраты.

Файл: Views/KPI/KPIView.swift — структура KPIView
Экран KPI/EVM: выбор проекта, базовые метрики, индикаторы SPI/CPI/SV/CV, прогноз EAC/ETC/VAC.
Вспомогательные структуры: MetricCard, KPICard.

Файл: Views/Users/UsersView.swift — структура UsersView
Команда: список пользователей с поиском, карточки нагрузки.
Вспомогательная структура: UserCard.

Файл: Views/Profile/ProfileView.swift — структура ProfileView
Профиль: аватар, информация, режим работы, выход.

Файл: Views/Components/SharedComponents.swift
Общие компоненты: StatusBadge, PriorityBadge, StatCard, InitialsAvatar, ProgressRow.


2.5. Утилиты (Sources/Utilities/Constants.swift)

- DateFormatter.apiDate — формат "yyyy-MM-dd" для хранения дат
- DateFormatter.display — формат для отображения дат пользователю (русская локаль)
- String.toDisplayDate() — конвертация строки даты в отображаемый формат
- Double.formatted(_:) — форматирование числа с заданным количеством знаков


3. АРХИТЕКТУРА И ПОТОКИ ДАННЫХ

3.1. Общая архитектура (MVVM)

Приложение построено по паттерну Model-View-ViewModel:

    View (SwiftUI)
        |
        | @StateObject / @ObservedObject (подписка на @Published)
        v
    ViewModel (@MainActor, ObservableObject)
        |
        | вызов методов синглтона
        v
    LocalDataStore (singleton, in-memory)
        |
        | мутация массивов данных
        v
    [User], [Project], [Stage], [ProjectTask], [KpiSnapshot]

Реактивность обеспечивается фреймворком Combine: изменение @Published-свойства в ViewModel автоматически перерисовывает подписанный View.


3.2. Поток аутентификации

    LoginView
        |
        | (нажатие «Войти»)
        v
    AuthViewModel.login()
        |
        | await AuthStore.shared.login(email, password)
        v
    AuthStore:
        1. Ищет User в LocalDataStore.shared.users по email
        2. Проверяет пароль == "Admin123!"
        3. Устанавливает currentUser и token
        4. Сохраняет token в UserDefaults
        |
        | (@Published token изменился)
        v
    TankatusApp: authStore.isAuthenticated == true
        |
        | показывает MainTabView вместо LoginView
        v
    MainTabView (5 вкладок)


3.3. Поток загрузки данных проекта

    ProjectsView
        |
        | .task { await vm.load() }
        v
    ProjectsViewModel.load()
        |
        | AuthStore.shared.currentUser?.id -> userId
        | LocalDataStore.shared.getProjects(userId:)
        v
    LocalDataStore:
        - admin/manager: возвращает все проекты
        - worker: фильтрует по projectMembers[project.id].contains(userId)
        |
        | projects = результат
        v
    ProjectsView: ForEach(vm.projects) { ProjectListRow(...) }


3.4. Поток создания задачи

    ProjectDetailView
        |
        | (нажатие кнопки "+")
        v
    TaskFormView (sheet)
        |
        | (нажатие «Сохранить»)
        v
    ProjectDetailViewModel.createTask(title, desc, status, priority, stageId, assigneeId, hours, due, budget, actualCost)
        |
        | LocalDataStore.shared.createTask(...)
        v
    LocalDataStore:
        1. Генерирует id = "t-<UUID.prefix(8)>"
        2. Создаёт ProjectTask со всеми полями
        3. Добавляет в массив tasks
        4. Вызывает updateProjectTaskCounts(projectId:) — пересчитывает total_tasks/done_tasks
        |
        | vm.tasks = LocalDataStore.shared.getTasks(projectId:)
        v
    ProjectDetailView: перерисовывается с новой задачей


3.5. Поток вычисления KPI

    KPIView
        |
        | .task { await vm.loadProjects() }
        | onChange(selectedProject) { vm.loadKPI(projectId:) }
        v
    KPIViewModel.loadKPI(projectId:)
        |
        | LocalDataStore.shared.computeKPI(projectId:)
        v
    LocalDataStore.computeKPI():
        1. Фильтрует tasks по project_id
        2. BAC = tasks.compactMap { $0.budget }.reduce(0, +)
        3. PV = tasks.filter { due_date <= today }.compactMap { budget }.reduce(0, +)
        4. EV = tasks.filter { status == "done" }.compactMap { budget }.reduce(0, +)
        5. AC = tasks.map { effectiveActualCost }.reduce(0, +)
        6. Возвращает ComputedKPI(bac, pv, ev, ac)
        |
        | vm.kpi = результат
        v
    KPIView:
        - baseMetrics: BAC, PV, EV, AC
        - kpiIndicators: SPI, CPI, SV, CV (вычисляются из ComputedKPI)
        - forecastSection: EAC, ETC, VAC


3.6. Поток построения дерева задач (WBS)

    ProjectDetailView (вкладка «Список»)
        |
        | vm.taskTree()
        v
    ProjectDetailViewModel.taskTree()
        |
        | buildNodes(allTasks: tasks, parentId: nil)
        v
    buildNodes (рекурсивная функция):
        1. Фильтрует tasks где parent_task_id == parentId
        2. Для каждой найденной задачи:
           - Рекурсивно вызывает buildNodes(allTasks, parentId: task.id)
           - Возвращает TaskNode.node(task: task, children: [...])
        3. Возвращает [TaskNode]
        |
        v
    RecursiveTaskRow (рекурсивный SwiftUI-компонент):
        - Отображает TaskRowItem для текущего узла
        - Если isExpanded && !children.isEmpty:
            - Для каждого child рекурсивно создаёт RecursiveTaskRow(depth: depth+1)
            - Добавляет отступ 20pt и вертикальную линию


3.7. Поток расчёта effectiveActualCost

    ProjectTask.effectiveActualCost:
        |
        | actual_cost != nil?
        |--- ДА: return actual_cost
        |--- НЕТ: budget != nil?
             |--- НЕТ: return 0
             |--- ДА: switch status:
                  case "done":        return budget * 1.0
                  case "in_progress": return budget * 0.5
                  case "review":      return budget * 0.8
                  default:            return 0


4. ПОЛНЫЙ СПИСОК ФАЙЛОВ ПРОЕКТА (16 исходных файлов)

Sources/TankatusApp.swift                         — точка входа приложения
Sources/Models/Models.swift                       — 11 структур данных
Sources/Services/AuthStore.swift                  — управление аутентификацией
Sources/Services/LocalDataStore.swift             — хранилище и бизнес-логика
Sources/Services/WebSocketService.swift           — заглушка WebSocket
Sources/Services/APIService.swift                 — устаревший HTTP-клиент (не используется)
Sources/Utilities/Constants.swift                 — форматтеры, расширения
Sources/ViewModels/ViewModels.swift               — 7 ViewModel + TaskNode
Sources/Views/MainTabView.swift                   — навигация (TabView)
Sources/Views/Auth/LoginView.swift                — экран входа
Sources/Views/Dashboard/DashboardView.swift       — главный дашборд
Sources/Views/Projects/ProjectsView.swift         — список проектов
Sources/Views/Projects/ProjectDetailView.swift    — детальный вид проекта
Sources/Views/Projects/ProjectFormView.swift      — форма проекта
Sources/Views/Projects/GanttView.swift            — диаграмма Ганта
Sources/Views/Tasks/MyTasksView.swift             — персональные задачи
Sources/Views/Tasks/TaskFormView.swift            — форма задачи/подзадачи
Sources/Views/KPI/KPIView.swift                   — экран KPI/EVM
Sources/Views/Users/UsersView.swift               — команда и нагрузка
Sources/Views/Profile/ProfileView.swift           — профиль пользователя
Sources/Views/Components/SharedComponents.swift   — переиспользуемые UI-компоненты


5. ФОРМУЛЫ EVM (РЕАЛИЗАЦИЯ В КОДЕ)

Все формулы реализованы в структуре ComputedKPI (Sources/Models/Models.swift:180-193) как вычисляемые свойства:

    CV  = EV - AC           // отклонение по стоимости
    SV  = EV - PV           // отклонение от календарного плана
    CPI = EV / AC           // индекс отклонения по стоимости
    SPI = EV / PV           // индекс отклонения от календарного плана
    EAC = BAC / CPI         // предварительная оценка по завершению
    ETC = EAC - AC          // оценка до завершения
    VAC = BAC - EAC         // разница при завершении

Источники данных для формул:

    BAC = SUM(task.budget)                              для всех задач проекта
    PV  = SUM(task.budget)  WHERE task.due_date <= NOW  задачи, которые должны быть завершены
    EV  = SUM(task.budget)  WHERE task.status == "done" реально завершённые задачи
    AC  = SUM(task.effectiveActualCost)                 фактические или расчётные затраты
