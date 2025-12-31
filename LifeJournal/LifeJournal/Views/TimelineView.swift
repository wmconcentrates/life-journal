// TimelineView.swift
// Main calendar and event list view

import SwiftUI

struct TimelineView: View {
    @EnvironmentObject var authService: AuthService
    @StateObject private var viewModel = TimelineViewModel()
    @State private var selectedDate = Date()

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Month selector
                MonthSelectorView(selectedDate: $selectedDate)

                // Day selector (horizontal scroll)
                DaySelectorView(selectedDate: $selectedDate)

                Divider()

                // Events list
                if viewModel.isLoading {
                    Spacer()
                    ProgressView("Loading events...")
                    Spacer()
                } else if viewModel.events.isEmpty {
                    EmptyTimelineView()
                } else {
                    EventListView(events: viewModel.eventsForDate(selectedDate))
                }
            }
            .navigationTitle("Timeline")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { viewModel.sync() }) {
                        Image(systemName: "arrow.clockwise")
                    }
                    .disabled(viewModel.isSyncing)
                }
            }
            .refreshable {
                await viewModel.syncAsync()
            }
        }
        .onAppear {
            viewModel.loadEvents()
        }
    }
}

struct MonthSelectorView: View {
    @Binding var selectedDate: Date

    private var monthFormatter: DateFormatter {
        let f = DateFormatter()
        f.dateFormat = "MMMM yyyy"
        return f
    }

    var body: some View {
        HStack {
            Button(action: previousMonth) {
                Image(systemName: "chevron.left")
            }

            Spacer()

            Text(monthFormatter.string(from: selectedDate))
                .font(.headline)

            Spacer()

            Button(action: nextMonth) {
                Image(systemName: "chevron.right")
            }
        }
        .padding()
    }

    private func previousMonth() {
        if let newDate = Calendar.current.date(byAdding: .month, value: -1, to: selectedDate) {
            selectedDate = newDate
        }
    }

    private func nextMonth() {
        if let newDate = Calendar.current.date(byAdding: .month, value: 1, to: selectedDate) {
            selectedDate = newDate
        }
    }
}

struct DaySelectorView: View {
    @Binding var selectedDate: Date

    private var daysInWeek: [Date] {
        let calendar = Calendar.current
        let startOfWeek = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: selectedDate))!
        return (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: startOfWeek) }
    }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(daysInWeek, id: \.self) { date in
                    DayCell(date: date, isSelected: Calendar.current.isDate(date, inSameDayAs: selectedDate))
                        .onTapGesture {
                            selectedDate = date
                        }
                }
            }
            .padding(.horizontal)
        }
        .padding(.vertical, 8)
    }
}

struct DayCell: View {
    let date: Date
    let isSelected: Bool

    private var dayFormatter: DateFormatter {
        let f = DateFormatter()
        f.dateFormat = "EEE"
        return f
    }

    var body: some View {
        VStack(spacing: 4) {
            Text(dayFormatter.string(from: date))
                .font(.caption)
                .foregroundColor(isSelected ? .white : .secondary)

            Text("\(Calendar.current.component(.day, from: date))")
                .font(.headline)
                .foregroundColor(isSelected ? .white : .primary)
        }
        .frame(width: 48, height: 60)
        .background(isSelected ? Color.blue : Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct EmptyTimelineView: View {
    var body: some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: "calendar.badge.plus")
                .font(.system(size: 60))
                .foregroundColor(.gray)

            Text("No events yet")
                .font(.headline)

            Text("Sync your data to see your timeline")
                .font(.subheadline)
                .foregroundColor(.secondary)

            Spacer()
        }
    }
}

struct EventListView: View {
    let events: [TimelineEvent]

    var body: some View {
        List(events) { event in
            EventRow(event: event)
        }
        .listStyle(.plain)
    }
}

struct EventRow: View {
    let event: TimelineEvent

    var body: some View {
        HStack(spacing: 12) {
            // Event type icon
            Image(systemName: event.iconName)
                .font(.title2)
                .foregroundColor(event.iconColor)
                .frame(width: 44, height: 44)
                .background(event.iconColor.opacity(0.1))
                .cornerRadius(10)

            VStack(alignment: .leading, spacing: 4) {
                Text(event.title)
                    .font(.headline)

                Text(event.subtitle)
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                if let time = event.formattedTime {
                    Text(time)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    TimelineView()
        .environmentObject(AuthService())
}
