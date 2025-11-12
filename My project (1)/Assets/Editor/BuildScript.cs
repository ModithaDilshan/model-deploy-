#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;
using System.IO;

public static class BuildScript
{
    private const string OutputFileName = "MyGame.exe";
    private static readonly string[] ScenesToBuild =
    {
        "Assets/Scenes/SampleScene.unity"
    };

    [MenuItem("Build/Build Game")]
    public static void BuildGameFromMenu()
    {
        BuildGame();
    }

    [MenuItem("Build/Build WebGL")]
    public static void BuildWebGLFromMenu()
    {
        BuildWebGL();
    }

    public static void BuildGame(BuildTarget target = BuildTarget.StandaloneWindows64)
    {
        string projectPath = Application.dataPath;
        string buildDirectory = Path.Combine(projectPath, "..", "Builds");
        string outputPath;

        if (target == BuildTarget.WebGL)
        {
            outputPath = Path.Combine(buildDirectory, "WebGL");
            
            // Verify WebGL is available
            if (!BuildPipeline.IsBuildTargetSupported(BuildTargetGroup.WebGL, BuildTarget.WebGL))
            {
                throw new System.Exception("WebGL build target is not supported. Please install WebGL Build Support module in Unity Hub.");
            }
            
            Debug.Log("WebGL build target is supported. Proceeding with build...");
        }
        else
        {
            outputPath = Path.Combine(buildDirectory, OutputFileName);
        }

        if (!Directory.Exists(buildDirectory))
        {
            Directory.CreateDirectory(buildDirectory);
        }

        // Clean previous build if it exists
        if (target == BuildTarget.WebGL && Directory.Exists(outputPath))
        {
            try
            {
                Directory.Delete(outputPath, true);
                Debug.Log($"Cleaned previous WebGL build at {outputPath}");
            }
            catch (System.Exception e)
            {
                Debug.LogWarning($"Could not clean previous build: {e.Message}");
            }
        }

        Debug.Log($"Starting {target} build to {outputPath}");
        Debug.Log($"Scenes to build: {string.Join(", ", ScenesToBuild)}");

        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = ScenesToBuild,
            locationPathName = outputPath,
            target = target,
            options = BuildOptions.None
        };

        BuildReport report = BuildPipeline.BuildPlayer(options);
        
        if (report.summary.result != BuildResult.Succeeded)
        {
            string errorMsg = $"Build failed: {report.summary.result}";
            if (report.summary.totalErrors > 0)
            {
                errorMsg += $"\nTotal Errors: {report.summary.totalErrors}";
            }
            if (report.summary.totalWarnings > 0)
            {
                errorMsg += $"\nTotal Warnings: {report.summary.totalWarnings}";
            }
            throw new System.Exception(errorMsg);
        }

        Debug.Log($"Build completed successfully: {outputPath}");
        Debug.Log($"Build size: {report.summary.totalSize} bytes");
        Debug.Log($"Build time: {report.summary.totalTime.TotalSeconds} seconds");
    }

    public static void BuildWebGL()
    {
        Debug.Log("BuildScript.BuildWebGL called");
        try
        {
            BuildGame(BuildTarget.WebGL);
        }
        catch (System.Exception e)
        {
            Debug.LogError($"BuildWebGL failed: {e.Message}");
            Debug.LogError($"Stack trace: {e.StackTrace}");
            throw; // Re-throw to ensure Unity exits with error code
        }
    }
}
#endif
