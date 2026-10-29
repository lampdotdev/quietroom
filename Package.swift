// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "TheLittleHouse",
    platforms: [.macOS(.v14), .iOS(.v17)],
    targets: [.executableTarget(name: "TheLittleHouse", path: "Sources")]
)
