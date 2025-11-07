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

    public static void BuildGame()
    {
        string projectPath = Application.dataPath;
        string buildDirectory = Path.Combine(projectPath, "..", "Builds");
        string outputPath = Path.Combine(buildDirectory, OutputFileName);

        if (!Directory.Exists(buildDirectory))
        {
            Directory.CreateDirectory(buildDirectory);
        }

        Debug.Log($"Starting build to {outputPath}");

        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = ScenesToBuild,
            locationPathName = outputPath,
            target = BuildTarget.StandaloneWindows64,
            options = BuildOptions.None
        };

        BuildReport report = BuildPipeline.BuildPlayer(options);
        if (report.summary.result != BuildResult.Succeeded)
        {
            throw new System.Exception($"Build failed: {report.summary.result}");
        }

        Debug.Log($"Build completed successfully: {outputPath}");
    }
}
#endif
