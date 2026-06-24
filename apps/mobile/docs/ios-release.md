# iOS 发布配置说明

## 1. 环境要求

- macOS + Xcode 15+
- Apple Developer 账号
- CocoaPods（Capacitor sync 时自动处理）

## 2. 初始化

```bash
cd apps/mobile
pnpm sync:ios
pnpm open:ios
```

## 3. Xcode 配置

在 Xcode 中打开 `ios/App/App.xcworkspace`：

1. **Signing & Capabilities**
   - Team: 选择你的 Apple Developer Team
   - Bundle Identifier: `com.tapdev.studio`
   - Automatically manage signing: 开启

2. **Deployment Info**
   - iPhone + iPad 均勾选（Universal）
   - Minimum Deployments: iOS 14.0

3. **Info.plist 建议项**

```xml
<key>UISupportedInterfaceOrientations~ipad</key>
<array>
  <string>UIInterfaceOrientationPortrait</string>
  <string>UIInterfaceOrientationLandscapeLeft</string>
  <string>UIInterfaceOrientationLandscapeRight</string>
</array>
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsLocalNetworking</key>
  <true/>
</dict>
```

## 4. Archive 发布

```bash
# 打开 Xcode 后
# Product > Archive > Distribute App
```

或使用命令行：

```bash
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath build/App.xcarchive \
  archive
```

## 5. TestFlight

Archive 完成后通过 Xcode Organizer 上传到 App Store Connect，提交 TestFlight 测试。
