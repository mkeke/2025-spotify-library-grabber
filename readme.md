# Spotify Library Grabber

# Gemini 2.5 Pro prompt

How can I make a node app that gathers my Spotify library and saves the playlists and albums in a folder structure?

# response (edited to work)

Of course! You can create a Node.js application to organize your Spotify library into local folders. This process involves authenticating with Spotify, fetching your data using their API, and then using Node's built-in modules to create the necessary files and directories.

This script will start a temporary web server on your machine just to handle the one-time authentication with Spotify. Once you authorize the app in your browser, it will fetch everything and save it locally.

## Prerequisites
1. Node.js: Make sure you have Node.js installed on your computer.
2. Spotify Account: A regular or premium Spotify account.
3. Spotify for Developers App: You need to register a free app to get API credentials.
  - log in to https://developer.spotify.com/
  - Go to `Dashboard -> Accept the terms -> Create app`
    - App name: `Library Grabber`
    - App description: `Grab the entire library structure with playlists and saved albums`
    - Redirect URIs: `http://127.0.0.1:8888/login` (localhost is no longer allowed)
    - Which API/SDKs are you planning to use? `Web API`
    - Save
4. get `Client ID` and `Client Secret`
5. create a `.env` file in the project dir:
```sh
# .env file
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
REDIRECT_URI=http://127.0.0.1:8888/callback
```

## Run the Application

1. Make sure you've filled out your `.env` file with your credentials from the developer dashboard.
2. Open your terminal in the project folder and run the script:
```bash
node index.js
```
3. Your terminal will show you a URL. Copy http://localhost:8888/login and paste it into your web browser.
4. You'll be taken to a Spotify page asking you to authorize the app. Log in and agree.
5. After authorizing, you'll be redirected to a blank page that says "Authentication successful!". You can close the browser tab.
6. Check your terminal! The script will now be running. It will log its progress as it fetches your albums and playlists and saves them.

Once it's finished, you will have a new folder named Spotify Library in your project directory, organized like this:
```
Spotify Library/
├── Albums/
│   ├── The Beatles - Abbey Road/
│   │   └── album_info.json
│   └── Daft Punk - Random Access Memories/
│       └── album_info.json
└── Playlists/
    ├── My Awesome Mix.json
    └── Lofi Beats.json
```

Each JSON file will contain detailed information about the album or a full list of the tracks in the playlist.

# output
```
% node index.js
[dotenv@17.2.1] injecting env (3) from .env -- tip: ⚙️  specify custom .env file path with { path: '/custom/path/.env' }
----------------------------------------------------
➡️  Step 1: Open your browser and go to this URL:
➡️  http://localhost:8888/login
----------------------------------------------------
Waiting for you to authorize the application...
🚀 Successfully authenticated with Spotify!
🎵 Fetching saved albums...
📂 Found 16 albums. Saving them now...
✅ All albums saved!
🎵 Fetching playlists...
📂 Found 2309 playlists. Saving them now...
✅ All playlists saved!

🎉 All done! Your Spotify library has been saved.
%
```
