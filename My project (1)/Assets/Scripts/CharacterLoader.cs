using UnityEngine;

public class CharacterLoader : MonoBehaviour
{
    [SerializeField]
    private string resourcePath = "Character/Character";

    [SerializeField]
    private Vector3 spawnPosition = Vector3.zero;

    [SerializeField]
    private Vector3 spawnRotation = Vector3.zero;

    [SerializeField]
    private Vector3 spawnScale = Vector3.one;

    private GameObject spawnedCharacter;

    private void Start()
    {
        LoadCharacter();
    }

    private void LoadCharacter()
    {
        GameObject characterPrefab = Resources.Load<GameObject>(resourcePath);
        if (characterPrefab != null)
        {
            SpawnCharacter(characterPrefab);
        }
        else
        {
            Debug.LogWarning($"CharacterLoader: Could not find character prefab at Resources/{resourcePath}. Spawning fallback capsule.");
            SpawnFallback();
        }
    }

    private void SpawnCharacter(GameObject prefab)
    {
        spawnedCharacter = Instantiate(prefab, spawnPosition, Quaternion.Euler(spawnRotation), transform);
        spawnedCharacter.transform.localScale = spawnScale;
    }

    private void SpawnFallback()
    {
        spawnedCharacter = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        spawnedCharacter.transform.SetParent(transform, false);
        spawnedCharacter.transform.localPosition = spawnPosition;
        spawnedCharacter.transform.localRotation = Quaternion.Euler(spawnRotation);
        spawnedCharacter.transform.localScale = spawnScale;
    }
}
