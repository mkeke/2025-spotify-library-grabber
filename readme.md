# Spotify Library Grabber

This app creates a local folder structure with json files of your Spotify library, consisting of
- Playlists (including Liked Songs)
- Podcasts
- Albums
- Artists

The app will start a temporary web server on your machine just to handle the one-time authentication with Spotify. Once you authorize the app in your browser, it will fetch everything and save it locally.

It was made using Google's Gemini 2.5 Pro and CoPilot, with some human intervention.

# Important notice

Spotify has rate limits, making the script fail if you run it too many times in a short while. The error is logged to the terminal.

# TODO

- reflect folder structure in playlist library

# Gemini 2.5 Pro prompt

How can I make a node app that gathers my Spotify library and saves the playlists and albums in a folder structure?

# Usage

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
6. install dependencies
```sh
npm install
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
│   └── Artist - Album Name/
│       └── album_info.json
├── Artists/
│   ├── An Artist You Follow.json
│   └── Another Artist.json
├── Playlists/
│   ├── Liked Songs.json
│   └── Your Custom Playlist.json
└── Podcasts/
    └── A Podcast You Save/
        └── show_info.json
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
🎵 Fetching Liked Songs...
📂 Found 6101 liked songs. Saving them now...
✅ Liked Songs saved!
🎵 Fetching saved podcasts...
📂 Found 27 podcasts. Saving them now...
✅ All podcasts saved!
🎵 Fetching followed artists...
📂 Found 38 followed artists. Saving them now...
✅ All followed artists saved!
🎵 Fetching saved albums...
📂 Found 16 albums. Saving them now...
✅ All albums saved!
🎵 Fetching playlists...
📂 Found 2309 playlists. Saving them now...
✅ All playlists saved!

🎉 All done! Your Spotify library has been saved.
%
```

# TODO: retain folder structure

Prompt: `How can I use the same folder structure for playlists as I have in Spotify?`

Answer:

The official API doesn't have the desired feature. I've been researching unofficial workarounds, and I'm currently investigating an unofficial API used by the Spotify desktop client. I plan to construct a function that can collect the folder structure, with warnings about how the approach works. I will also construct a more stable solution to be the user's primary method.

The core issue remains that the **official Spotify API** (which the script uses) does not recognize or provide data about playlist folders. However, there is a more advanced, unofficial method to get this information by using the same internal API that the Spotify web and desktop clients use.

This approach is more complex and less stable—if Spotify changes their internal API, this could break—but it is the only way to programmatically retrieve your folder structure.

-----

### The Unofficial API Approach

We can write a new function that authenticates against Spotify's internal API to fetch your "rootlist," which is the complete, nested structure of your playlists and folders. We can then use this structure to create a map of which folder each playlist belongs to.

#### Step 1: Get Your Authentication Token

This method requires a different token than the one from the normal login flow. You need to manually grab it from your browser.

1.  Open a new tab in your browser and go to [open.spotify.com](https://open.spotify.com) and log in.
2.  Open the Developer Tools (**F12** on Chrome/Edge/Firefox, or **Cmd+Option+I** on Mac).
3.  Go to the **Network** tab.
4.  In the filter box, type `rootlist`. You should see a request to an address that looks something like `.../playlist/v2/rootlist`. Click on it.
5.  In the new panel that opens, find the **Headers** tab. Scroll down to **Request Headers**.
6.  Find the `authorization` header. It will look like `authorization: Bearer BQA...`. Copy the **entire token** (the long string of characters after ` Bearer  `).

This token is what we will use. **Note:** This token expires after about an hour, so you'll need to grab a new one each time you run the script.

#### Step 2: Add a New Function to Your Code

We'll add a new function called `getPlaylistFolderMap` to fetch and parse the folder structure. This requires the `axios` library, so first, install it by running `npm install axios` in your terminal.

Then, add this function to your `index.js` file, somewhere before the `savePlaylists` function.

```javascript
const axios = require('axios');

/**
 * --- UNOFFICIAL METHOD ---
 * Fetches the user's complete playlist and folder structure using Spotify's
 * internal API. This is not officially supported and may break.
 * @param {string} bearerToken - The temporary token copied from the browser's developer tools.
 * @returns {Map<string, string>} A map where the key is the playlist URI and the value is its folder path.
 */
const getPlaylistFolderMap = async (bearerToken) => {
  console.log('📂 Fetching playlist folder structure (unofficial method)...');
  const map = new Map();
  
  // This is a recursive function to process the nested folder structure
  const parseItems = (items, currentPath) => {
    for (const item of items) {
      if (item.type === 'playlist') {
        map.set(item.uri, currentPath);
      } else if (item.type === 'folder') {
        // Recursively call for sub-folders
        const newPath = path.join(currentPath, sanitizeFilename(item.name));
        if (item.items) {
          parseItems(item.items, newPath);
        }
      }
    }
  };

  try {
    const response = await axios.get('https://spclient.wg.spotify.com/playlist/v2/rootlist', {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
      },
    });

    if (response.data && response.data.items) {
      parseItems(response.data.items, ''); // Start with an empty base path
      console.log('✅ Successfully built playlist folder map.');
      return map;
    }
  } catch (error) {
    console.error('❌ Error fetching rootlist. Your token might be expired or invalid.');
    console.error('Go to open.spotify.com, open DevTools -> Network, find the "rootlist" request, and copy the new "authorization" bearer token.');
    process.exit(1); // Exit if we can't get the folder structure
  }
  return map;
};
```

#### Step 3: Modify the `savePlaylists` Function

Now, we'll update `savePlaylists` to use the map we just created.

```javascript
/**
 * Fetches all of the user's playlists and saves them to the filesystem,
 * using the folder map to recreate the directory structure.
 * @param {Map<string, string>} folderMap - The map of playlist URIs to folder paths.
 */
const savePlaylists = async (folderMap) => {
  console.log('🎵 Fetching playlists...');
  const playlistsData = await fetchAllItems((options) => spotifyApi.getUserPlaylists(options));
  const basePlaylistsDir = path.join(outputDir, 'Playlists');
  await fs.mkdir(basePlaylistsDir, { recursive: true });

  console.log(`📂 Found ${playlistsData.length} playlists. Saving them now...`);

  for (const playlist of playlistsData) {
    // Look up the playlist's folder path from the map using its URI
    const folderPath = folderMap.get(playlist.uri) || '';
    const finalDirectory = path.join(basePlaylistsDir, folderPath);
    const playlistFileName = sanitizeFilename(playlist.name) + '.json';

    // Ensure the target directory exists
    await fs.mkdir(finalDirectory, { recursive: true });

    const playlistTracksResponse = await fetchAllItems((options) =>
      spotifyApi.getPlaylistTracks(playlist.id, options)
    );

    const playlistInfo = {
      name: playlist.name,
      description: playlist.description,
      owner: playlist.owner.display_name,
      id: playlist.id,
      uri: playlist.uri,
      tracks: playlistTracksResponse.map(item => ({
        name: item.track ? item.track.name : 'Unknown Track',
        artist: item.track ? item.track.artists.map(a => a.name).join(', ') : 'Unknown Artist',
        album: item.track && item.track.album ? item.track.album.name : 'Unknown Album',
        added_at: item.added_at,
        uri: item.track ? item.track.uri : null,
      })),
    };

    await fs.writeFile(
      path.join(finalDirectory, playlistFileName),
      JSON.stringify(playlistInfo, null, 2)
    );
  }
  console.log('✅ All playlists saved!');
};
```

#### Step 4: Update the Main Execution Logic

Finally, modify the main execution block inside the `/callback` route to use these new functions. You'll need to add a placeholder for the token you copied.

```javascript
app.get('/callback', async (req, res) => {
  const error = req.query.error;
  const code = req.query.code;

  if (error) {
    console.error('Callback Error:', error);
    if (!res.headersSent) res.send(`Callback Error: ${error}`);
    return;
  }

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const access_token = data.body['access_token'];
    const refresh_token = data.body['refresh_token'];

    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);

    console.log('🚀 Successfully authenticated with Spotify!');
    if (!res.headersSent) res.send('Authentication successful! You can close this tab. Check your console.');

    // --- PASTE YOUR UNOFFICIAL TOKEN HERE ---
    const unofficialBearerToken = 'PASTE_YOUR_TOKEN_FROM_THE_BROWSER_HERE';
    if (unofficialBearerToken === 'PASTE_YOUR_TOKEN_FROM_THE_BROWSER_HERE') {
        console.error('🛑 Please paste your bearer token into the script before running!');
        process.exit(1);
    }
    
    // --- Start the backup process ---
    await fs.mkdir(outputDir, { recursive: true });
    
    // 1. Get the folder structure first
    const playlistFolderMap = await getPlaylistFolderMap(unofficialBearerToken);

    // 2. Run the rest of the backup tasks
    await saveLikedSongs();
    await savePodcasts();
    await saveFollowedArtists();
    await saveAlbums();
    await savePlaylists(playlistFolderMap); // Pass the map to the function
    
    console.log('\n🎉 All done! Your complete Spotify library has been saved.');
    process.exit(0); // Exit the app once done

  } catch (err) {
    // ... (rest of the error handling code is unchanged)
    console.error('Error getting Tokens:', err);
    if (err.statusCode === 429) {
      console.error('Rate limited by Spotify. Retry after:', err.headers['retry-after'], 'seconds');
    }
    if (!res.headersSent) res.send('Error getting tokens. Check console.');
  }
});
```

Now, when you run the script, you'll need to paste in the fresh token you copied from your browser. The script will then fetch the folder structure first and use it to save your playlist files into the correct nested directories.