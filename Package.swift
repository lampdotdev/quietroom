// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "MyQuietRoom",
    platforms: [.macOS(.v14), .iOS(.v17)],
    targets: [.executableTarget(name: "MyQuietRoom", path: "Sources")]
)
