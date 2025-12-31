// WeeklySummaryView.swift
// Weekly summary with coach insights

import SwiftUI

struct WeeklySummaryView: View {
    @StateObject private var viewModel = WeeklySummaryViewModel()

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Week header
                    WeekHeaderView(weekNumber: viewModel.weekNumber)

                    if viewModel.isLoading {
                        ProgressView("Loading insights...")
                            .padding(.top, 40)
                    } else {
                        // Stats cards
                        StatsGridView(stats: viewModel.stats)

                        // Summary section
                        if let summary = viewModel.summary {
                            SummaryCardView(summary: summary)
                        }

                        // Coach insight
                        if let insight = viewModel.coachInsight {
                            InsightCardView(insight: insight)
                        }

                        // Reflection prompts
                        if !viewModel.reflectionPrompts.isEmpty {
                            ReflectionPromptsView(prompts: viewModel.reflectionPrompts)
                        }
                    }
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Weekly Summary")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { viewModel.refresh() }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .refreshable {
                await viewModel.refreshAsync()
            }
        }
        .onAppear {
            viewModel.loadData()
        }
    }
}

struct WeekHeaderView: View {
    let weekNumber: Int

    var body: some View {
        VStack(spacing: 4) {
            Text("Week \(weekNumber)")
                .font(.title2)
                .fontWeight(.bold)

            Text(dateRangeText)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding()
    }

    private var dateRangeText: String {
        let calendar = Calendar.current
        let now = Date()
        let startOfWeek = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: now))!
        let endOfWeek = calendar.date(byAdding: .day, value: 6, to: startOfWeek)!

        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"

        return "\(formatter.string(from: startOfWeek)) - \(formatter.string(from: endOfWeek))"
    }
}

struct StatsGridView: View {
    let stats: WeeklyStats

    var body: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 16) {
            StatCard(title: "Locations", value: "\(stats.locationsVisited)", icon: "mappin.circle.fill", color: .blue)
            StatCard(title: "Purchases", value: "\(stats.purchases)", icon: "bag.fill", color: .green)
            StatCard(title: "Total Spent", value: stats.formattedSpending, icon: "dollarsign.circle.fill", color: .orange)
            StatCard(title: "Photos", value: "\(stats.photos)", icon: "photo.fill", color: .purple)
        }
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title)
                .foregroundColor(color)

            Text(value)
                .font(.title2)
                .fontWeight(.bold)

            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }
}

struct SummaryCardView: View {
    let summary: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("This Week", systemImage: "text.alignleft")
                .font(.headline)

            Text(summary)
                .font(.body)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }
}

struct InsightCardView: View {
    let insight: String
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Coach Insight", systemImage: "lightbulb.fill")
                    .font(.headline)
                    .foregroundColor(.orange)

                Spacer()

                Button(action: { isExpanded.toggle() }) {
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .foregroundColor(.secondary)
                }
            }

            Text(insight)
                .font(.body)
                .lineLimit(isExpanded ? nil : 4)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.orange.opacity(0.1))
        .cornerRadius(12)
    }
}

struct ReflectionPromptsView: View {
    let prompts: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Reflect", systemImage: "sparkles")
                .font(.headline)

            ForEach(prompts, id: \.self) { prompt in
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "circle.fill")
                        .font(.system(size: 6))
                        .foregroundColor(.blue)
                        .padding(.top, 6)

                    Text(prompt)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }
}

#Preview {
    WeeklySummaryView()
}
