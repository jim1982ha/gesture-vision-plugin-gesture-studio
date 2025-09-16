# gesture-vision-plugin-gesture-studio

A tool to create custom hand and pose gestures.

---

<p align="center">
  <img src="https://raw.githubusercontent.com/jim1982ha/gesture-vision/main/packages/frontend/public/icons/icon-72.webp" width="80" alt="Gesture Studio Plugin Icon">
</p>
<h1 align="center">GestureVision - Gesture Studio Plugin</h1>
<p align="center">
  <strong>An integrated tool to visually create, test, and save your own custom hand and pose gestures.</strong>
</p>

---

The Gesture Studio plugin is a powerful UI contribution that makes creating custom gestures accessible to everyone. Instead of manually writing gesture definition files, you can use your camera to define a gesture, and the Studio will automatically analyze the movements and generate the necessary JavaScript code for you.

## ✨ Key Features

-   **Two Creation Modes:**
    -   **Static Pose:** The original method for recognizing a specific, consistent hand shape or body pose by recording multiple samples.
    -   **Dynamic Measurement:** A new mode for creating gestures based on the real-time distance between any two landmarks (e.g., the spread between thumb and index finger).
-   **Visual Gesture Creation:** A step-by-step interface guides you through defining, recording/calibrating, and testing a new gesture.
-   **Automatic Code Generation:** Automatically generates a standard, optimized `.js` gesture definition file based on its analysis or calibration.
-   **Live Testing & Tuning:** Immediately test your newly created gesture in a live video feed and adjust the recognition tolerance with a slider to see the results in real-time.
-   **Seamless Integration:** Saved gestures are immediately available for use in the main "Gesture Settings" panel.

## 🔧 Configuration

The Gesture Studio is a UI-only plugin and does not have a configuration file. It is accessed directly through the main application's settings.

### How to Use the Gesture Studio

1.  Navigate to **Settings -> Custom Gestures**.
2.  Click the **"Create..."** button to launch the Gesture Studio modal.
3.  **Step 1: Choose Type**
    -   Select either **"Static Pose"** or **"Dynamic Measurement"**.

#### For a **Static Pose** Gesture:
1.  **Step 2: Define**
    -   Give your gesture a unique **Name** (e.g., "Two Finger Pinch").
    -   Provide an optional **Description**.
    -   Choose the camera source and number of samples to record.
    -   Click **"Next Step"**.
2.  **Step 3: Record**
    -   Position yourself and perform the gesture.
    -   Click **"Record Sample"**. A short countdown will begin, after which a snapshot is taken.
    -   Repeat until you have recorded the required number of samples.
    -   Once all samples are recorded, click **"Analyze & Generate"**.
3.  **Step 4: Test & Refine**
    -   Perform your gesture in the live video feed. A status display will show the real-time recognition confidence.
    -   Adjust the **Tolerance** slider.
    -   When satisfied, click **"Save Gesture"**.

#### For a **Dynamic Measurement** Gesture:
1.  **Step 2: Define & Calibrate**
    -   Give your gesture a **Name** and **Description**.
    -   Click **"Select 2 Landmarks"**. A modal will appear. Click two points on the hand model and confirm.
    -   Click **"Record Min"**. Position your hand for the minimum distance (e.g., fingers touching) and hold for the countdown.
    -   Click **"Record Max"**. Position your hand for the maximum distance (e.g., fingers spread) and hold for the countdown.
    -   Once calibrated, click **"Next Step"**.
2.  **Step 3: Test & Refine**
    -   Move your hand between the min and max positions. The confidence score will change dynamically.
    -   Adjust the **Tolerance** slider to set the desired trigger point.
    -   When satisfied, click **"Save Gesture"**.

Your new gesture is now ready to be assigned to an action!

---

Part of the **GestureVision** application.