// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "LifeJournal",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(
            name: "LifeJournal",
            targets: ["LifeJournal"]),
    ],
    dependencies: [],
    targets: [
        .target(
            name: "LifeJournal",
            dependencies: [],
            path: "LifeJournal"),
    ]
)
