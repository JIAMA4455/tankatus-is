import Foundation

enum Constants {
    // Для симулятора iOS localhost = 127.0.0.1
    // Для реального устройства — замените на IP вашего Mac, например: http://192.168.1.100:3001
    static let baseURL = "http://10.197.107.193:3001/api"
}

extension DateFormatter {
    static let apiDate: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    static let display: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .none
        f.locale = Locale(identifier: "ru_RU")
        return f
    }()
}

extension String {
    func toDisplayDate() -> String {
        guard let date = DateFormatter.apiDate.date(from: self) else { return self }
        return DateFormatter.display.string(from: date)
    }
}

extension Double {
    func formatted(_ decimals: Int = 2) -> String {
        String(format: "%.\(decimals)f", self)
    }
}
