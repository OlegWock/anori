import CoreGraphics
import Foundation

guard CommandLine.arguments.count > 1, let pid = Int32(CommandLine.arguments[1]) else {
  FileHandle.standardError.write("usage: window-id <pid>\n".data(using: .utf8)!)
  exit(2)
}

let windows = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
let candidates = windows.filter {
  ($0[kCGWindowOwnerPID as String] as? Int32) == pid && ($0[kCGWindowLayer as String] as? Int) == 0
}
let largest = candidates.max { a, b in
  let ra = a[kCGWindowBounds as String] as? [String: CGFloat] ?? [:]
  let rb = b[kCGWindowBounds as String] as? [String: CGFloat] ?? [:]
  return (ra["Width"] ?? 0) * (ra["Height"] ?? 0) < (rb["Width"] ?? 0) * (rb["Height"] ?? 0)
}
guard let window = largest, let id = window[kCGWindowNumber as String] as? Int else {
  FileHandle.standardError.write("no on-screen window for pid \(pid)\n".data(using: .utf8)!)
  exit(1)
}
print(id)
