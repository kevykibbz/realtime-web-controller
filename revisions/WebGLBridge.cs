using UnityEngine;
using TMPro;
using System.Runtime.InteropServices;
using System.Collections.Generic;

/// <summary>
/// WebGL Bridge for connecting Unity to the realtime-web-controller server.
/// Handles controller input from mobile devices via Socket.IO.
/// 
/// Setup:
/// 1. Attach this script to a GameObject in your scene
/// 2. Assign a TextMeshProUGUI component to display the press count
/// 3. Ensure socketBridge.jslib is in Assets/Plugins/WebGL/
/// 4. Build for WebGL and host using the unity-host-template.html
/// </summary>
public class WebGLBridge : MonoBehaviour
{
    [Header("UI References")]
    [Tooltip("Text component to display button press count")]
    public TextMeshProUGUI text_test;
    
    [Tooltip("Optional: Display connected player names")]
    public TextMeshProUGUI playerListText;

    [Header("Game State")]
    [Tooltip("Total number of button presses received")]
    public int totalPressCount = 0;

    // Track individual player press counts
    private Dictionary<string, PlayerData> players = new Dictionary<string, PlayerData>();

    /// <summary>
    /// Data structure matching the server's controller-input event
    /// </summary>
    [System.Serializable]
    public class ControllerEvent
    {
        public string type;         // e.g., "BUTTON"
        public string action;       // "press" or "release"
        public string playerId;     // Socket ID of the player
        public string playerName;   // Optional: Display name of player
    }

    /// <summary>
    /// Track individual player data
    /// </summary>
    private class PlayerData
    {
        public string id;
        public string name;
        public int pressCount;
        
        public PlayerData(string id, string name)
        {
            this.id = id;
            this.name = name;
            this.pressCount = 0;
        }
    }

    #region External JavaScript Functions
    
    #if UNITY_WEBGL && !UNITY_EDITOR
    /// <summary>
    /// Initialize Socket.IO connection to the server.
    /// Called from C#, implemented in socketBridge.jslib
    /// </summary>
    [DllImport("__Internal")]
    private static extern void InitSocket(string gameObjectName);
    
    /// <summary>
    /// Emit a custom event to the server.
    /// Called from C#, implemented in socketBridge.jslib
    /// </summary>
    [DllImport("__Internal")]
    private static extern void EmitEvent(string eventName, string jsonData);
    #endif
    
    #endregion

    void Awake()
    {
        Debug.Log("=== WebGLBridge Initialized ===");
        
        #if UNITY_WEBGL && !UNITY_EDITOR
        // Initialize socket connection using this GameObject's name
        // The JavaScript bridge will use SendMessage to call methods on this GameObject
        InitSocket(gameObject.name);
        Debug.Log($"Socket initialization requested for GameObject: {gameObject.name}");
        #else
        Debug.LogWarning("Socket.IO only works in WebGL builds. Running in editor mode.");
        #endif
        
        UpdateUI();
    }

    #region Socket Event Handlers (Called from JavaScript)

    /// <summary>
    /// Called from JavaScript when a controller input is received.
    /// This is invoked via Unity's SendMessage from socketBridge.jslib
    /// </summary>
    /// <param name="json">JSON string containing {type, action, playerId, playerName}</param>
    public void OnControllerEvent(string json)
    {
        Debug.Log($"📱 Controller event received: {json}");
        
        try 
        {
            // Parse the JSON into our ControllerEvent structure
            var evt = JsonUtility.FromJson<ControllerEvent>(json);
            
            // Validate the event
            if (string.IsNullOrEmpty(evt.playerId))
            {
                Debug.LogWarning("Received event with no playerId");
                return;
            }
            
            // Handle the event based on type and action
            switch (evt.type)
            {
                case "BUTTON":
                    HandleButtonEvent(evt);
                    break;
                    
                default:
                    Debug.LogWarning($"Unknown event type: {evt.type}");
                    break;
            }
        }
        catch (System.Exception e) 
        {
            Debug.LogError($"❌ Failed to parse controller event: {e.Message}\nJSON: {json}");
        }
    }

    /// <summary>
    /// Called from JavaScript when the socket connects
    /// </summary>
    public void OnSocketConnected(string socketId)
    {
        Debug.Log($"✅ Socket connected with ID: {socketId}");
    }

    /// <summary>
    /// Called from JavaScript when a player joins the lobby
    /// </summary>
    public void OnPlayerJoined(string json)
    {
        Debug.Log($"👤 Player joined: {json}");
        // You can parse and handle player join events here if needed
    }

    #endregion

    #region Event Handlers

    /// <summary>
    /// Handle button press/release events from controllers
    /// </summary>
    private void HandleButtonEvent(ControllerEvent evt)
    {
        // Ensure we have a record for this player
        if (!players.ContainsKey(evt.playerId))
        {
            string playerName = string.IsNullOrEmpty(evt.playerName) 
                ? $"Player {players.Count + 1}" 
                : evt.playerName;
            players[evt.playerId] = new PlayerData(evt.playerId, playerName);
            Debug.Log($"New player registered: {playerName} ({evt.playerId})");
        }

        var player = players[evt.playerId];

        // Handle press/release
        switch (evt.action)
        {
            case "press":
                OnButtonPress(player);
                break;
                
            case "release":
                OnButtonRelease(player);
                break;
                
            default:
                Debug.LogWarning($"Unknown action: {evt.action}");
                break;
        }
    }

    /// <summary>
    /// Handle button press - increment counters and update UI
    /// </summary>
    private void OnButtonPress(PlayerData player)
    {
        player.pressCount++;
        totalPressCount++;
        
        Debug.Log($"🔥 Button pressed by {player.name}! " +
                  $"Player count: {player.pressCount}, " +
                  $"Total count: {totalPressCount}");
        
        UpdateUI();
        
        // Add your game logic here!
        // Examples:
        // - Spawn a projectile
        // - Increase player score
        // - Trigger an animation
        // - Play a sound effect
    }

    /// <summary>
    /// Handle button release
    /// </summary>
    private void OnButtonRelease(PlayerData player)
    {
        Debug.Log($"Button released by {player.name}");
        
        // Add release logic here if needed
        // Examples:
        // - Stop continuous fire
        // - Release a charged shot
    }

    #endregion

    #region UI Updates

    /// <summary>
    /// Update all UI elements
    /// </summary>
    private void UpdateUI()
    {
        // Update press count display
        if (text_test != null)
        {
            text_test.text = totalPressCount.ToString();
        }

        // Update player list
        if (playerListText != null)
        {
            UpdatePlayerList();
        }
    }

    /// <summary>
    /// Update the player list display with scores
    /// </summary>
    private void UpdatePlayerList()
    {
        if (playerListText == null) return;

        if (players.Count == 0)
        {
            playerListText.text = "No players connected";
            return;
        }

        string list = "Players:\n";
        foreach (var kvp in players)
        {
            var player = kvp.Value;
            list += $"• {player.name}: {player.pressCount} presses\n";
        }
        playerListText.text = list;
    }

    #endregion

    #region Send Events to Server (Optional)

    /// <summary>
    /// Example: Send a custom event to the server
    /// Uncomment and modify as needed
    /// </summary>
    public void SendCustomEvent(string eventName, string data)
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
        EmitEvent(eventName, data);
        Debug.Log($"Sent event to server: {eventName} - {data}");
        #endif
    }

    /// <summary>
    /// Example: Send game state updates to the server
    /// </summary>
    public void SendGameState()
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
        string gameState = JsonUtility.ToJson(new {
            totalPresses = totalPressCount,
            playerCount = players.Count
        });
        EmitEvent("game-state", gameState);
        #endif
    }

    #endregion

    #region Testing in Editor

    /// <summary>
    /// For testing in the Unity Editor (not WebGL)
    /// Press Space to simulate a button press
    /// </summary>
    void Update()
    {
        #if UNITY_EDITOR
        if (Input.GetKeyDown(KeyCode.Space))
        {
            // Simulate a controller event for testing
            string testJson = @"{
                ""type"": ""BUTTON"",
                ""action"": ""press"",
                ""playerId"": ""test-player-1"",
                ""playerName"": ""Test Player""
            }";
            OnControllerEvent(testJson);
        }
        #endif
    }

    #endregion
}
