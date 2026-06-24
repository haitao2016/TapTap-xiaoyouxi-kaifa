# Android 发布配置说明

## 1. 初始化原生项目

```bash
cd apps/mobile
pnpm sync:android
pnpm open:android
```

## 2. 签名配置

在 `android/` 目录创建 `keystore.properties`（勿提交到 Git）：

```properties
storeFile=../../release/tapdev-release.jks
storePassword=your_store_password
keyAlias=tapdev
keyPassword=your_key_password
```

生成 keystore：

```bash
keytool -genkey -v -keystore tapdev-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias tapdev
```

在 `android/app/build.gradle` 的 `android` 块中添加：

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

## 3. 构建 Release APK / AAB

```bash
# APK
pnpm release:android

# AAB (Google Play)
pnpm release:android:bundle
```

输出路径：
- APK: `android/app/build/outputs/apk/release/`
- AAB: `android/app/build/outputs/bundle/release/`

## 4. 平板适配

`AndroidManifest.xml` 中已默认支持不同屏幕尺寸。建议在 `res/values-sw600dp/` 下添加平板专用布局资源。
