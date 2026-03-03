# ImageShare RN 🖼️ 🔗

**ImageShare** is a fully functional, cross-platform mobile application built with **React Native**. It empowers users to upload images to the cloud, generate unique shareable links, and manage their personal media gallery with a focus on privacy and modern UX.

## ✨ Key Features
- **Cross-Platform**: Runs seamlessly on both **iOS** and **Android**.
- **User Authentication**: Secure Login, Signup, and Password Reset powered by **Firebase Auth**.
- **Cloud Storage**: Instant image uploads and hosting using **Firebase Storage**.
- **Shareable Links**: One-click generation of public URLs to share images with anyone.
- **Private Gallery**: A personalized dashboard for users to track and delete their uploaded content.
- **Modern UI**: Clean, responsive interface built with **React Native Paper** (or Tailwind/StyleSheet).

## 🛠 Tech Stack
- **Framework**: React Native
- **Language**: JavaScript / TypeScript
- **Backend/BaaS**: Firebase (Authentication, Firestore, Cloud Storage)
- **Navigation**: React Navigation (Stack & Bottom Tabs)
- **State Management**: React Hooks (useState, useEffect, useContext)
- **Image Handling**: Expo Image Picker / React Native Image Picker

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or newer)
- React Native CLI or Expo CLI
- A Firebase Project

### Installation & Setup
1. **Clone the repository**:
2.  **Install Dependencies**:  
3. **Firebase Configuration**:
   - Create a project on the [Firebase Console](https://console.firebase.google.com/).
   - For Android: Add `google-services.json` to `android/app/`.
   - For iOS: Add `GoogleService-Info.plist` via Xcode.
   - Enable **Auth** (Email/Pass) and **Storage** in your Firebase console.

4. **Run the App**:


## 📂 Project Architecture
- **`/src/screens`**: Contains the UI logic for Login, Gallery, and Upload.
- **`/src/components`**: Reusable UI elements (Buttons, Input fields, Image Cards).
- **`/src/services`**: Firebase configuration and API logic for uploading/fetching data.
- **`/src/navigation`**: Navigation configuration (Auth vs. App stacks).

## 🛠 How to Modify or Extend
- **Add New Pages**: Create a new file in `src/screens` and register it in the `AppNavigator.js`.
- **Change Styling**: Global themes can be adjusted in the `src/theme` or your main entry file.
- **Database Rules**: To enhance privacy, update your Firebase Storage rules to allow only the owner to delete images.

## 📜 License

   
   
