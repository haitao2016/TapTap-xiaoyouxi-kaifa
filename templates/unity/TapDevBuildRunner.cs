#if UNITY_EDITOR
using System;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace TapDevStudio
{
    /// <summary>
    /// TapDev Studio 自动构建入口。
    /// 由 TapDev Studio 通过 Unity BatchMode 调用：
    /// Unity.exe -batchmode -executeMethod TapDevStudio.BuildRunner.ExecuteBuild -tapdevOutput "path"
    /// </summary>
    public static class BuildRunner
    {
        public static void ExecuteBuild()
        {
            var output = GetArg("-tapdevOutput") ?? Path.Combine(Directory.GetCurrentDirectory(), "Build");
            var wasmSplit = GetArg("-tapdevWasmSplit") == "1";
            var development = GetArg("-tapdevDevelopment") == "1";

            Directory.CreateDirectory(output);

            Debug.Log($"[TapDev] Starting TapTap mini game build");
            Debug.Log($"[TapDev] Output: {output}");
            Debug.Log($"[TapDev] WasmSplit: {wasmSplit}, Development: {development}");

            // 调用 TapTap 小游戏 SDK 构建菜单
            // 需已安装 com.taptap.minigame 包
            var menuPath = "TapTap 小游戏/构建";
            if (!EditorApplication.ExecuteMenuItem(menuPath))
            {
                Debug.LogError($"[TapDev] Failed to execute menu: {menuPath}");
                Debug.LogError("[TapDev] 请确认已安装 TapTap 小游戏 Unity SDK");
                EditorApplication.Exit(1);
                return;
            }

            Debug.Log("[TapDev] Build menu triggered successfully");
            EditorApplication.Exit(0);
        }

        public static void ExecuteMenuBuild()
        {
            EditorApplication.ExecuteMenuItem("TapTap 小游戏/构建");
            EditorApplication.Exit(0);
        }

        static string GetArg(string name)
        {
            var args = Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length - 1; i++)
                if (args[i] == name) return args[i + 1];
            return null;
        }
    }
}
#endif
