using UnityEngine;

/// <summary>
/// Simple script to ensure the WebGL build has something visible
/// This creates a simple colored cube that rotates
/// </summary>
public class SimpleWebGLTest : MonoBehaviour
{
    [SerializeField]
    private float rotationSpeed = 30f;
    
    private GameObject testCube;

    private void Start()
    {
        // Create a simple test cube if nothing else is visible
        CreateTestCube();
    }

    private void CreateTestCube()
    {
        // Create a simple colored cube
        testCube = GameObject.CreatePrimitive(PrimitiveType.Cube);
        testCube.name = "TestCube";
        testCube.transform.position = new Vector3(0, 1, 0);
        testCube.transform.localScale = Vector3.one;
        
        // Add a simple material with color
        Material mat = new Material(Shader.Find("Standard"));
        mat.color = new Color(0.2f, 0.6f, 1f); // Light blue
        testCube.GetComponent<Renderer>().material = mat;
        
        // Add this script to the cube so it rotates
        SimpleWebGLTest rotator = testCube.AddComponent<SimpleWebGLTest>();
        rotator.rotationSpeed = this.rotationSpeed;
        rotator.testCube = null; // Prevent recursion
    }

    private void Update()
    {
        // Rotate the cube if it exists
        if (testCube != null)
        {
            testCube.transform.Rotate(Vector3.up, rotationSpeed * Time.deltaTime);
        }
    }
}

