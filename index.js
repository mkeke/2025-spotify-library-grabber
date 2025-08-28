// index.js

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');

// --- Configuration ---
const port = 8888;
const outputDir = path.join(__dirname, 'Spotify Library');

// Scopes define the permissions our app is asking for.
const scopes = [
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
];

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI,
});

// --- Helper Functions ---

/**
 * Sanitizes a string to be used as a valid filename.
 * Replaces invalid characters with an underscore.
 * @param {string} filename - The original filename.
 * @returns {string} The sanitized filename.
 */
const sanitizeFilename = (filename) => {
  return filename.replace(/[\\/:*?"<>|]/g, '_');
};

/**
 * A generic function to fetch all items from a paginated Spotify API endpoint.
 * @param {Function} apiCall - The Spotify API function to call (e.g., spotifyApi.getUserPlaylists).
 * @returns {Array} A list of all fetched items.
 */
const fetchAllItems = async (apiCall) => {
  let items = [];
  let offset = 0;
  const limit = 50; // Max limit is 50
  let response;

  do {
    response = await apiCall({ limit, offset });
    items = items.concat(response.body.items);
    offset += limit;
  } while (response.body.next);

  return items;
};

// --- Main Logic Functions ---

/**
 * Fetches all of the user's saved albums and saves them to the filesystem.
 */
const saveAlbums = async () => {
  console.log('🎵 Fetching saved albums...');
  const albumsData = await fetchAllItems((options) => spotifyApi.getMySavedAlbums(options));
  const albumsDir = path.join(outputDir, 'Albums');
  await fs.mkdir(albumsDir, { recursive: true });

  console.log(`📂 Found ${albumsData.length} albums. Saving them now...`);

  for (const item of albumsData) {
    const album = item.album;
    const artistName = album.artists.map(a => a.name).join(', ');
    const albumTitle = album.name;
    const albumFolderName = sanitizeFilename(`${artistName} - ${albumTitle}`);
    const fullAlbumPath = path.join(albumsDir, albumFolderName);

    await fs.mkdir(fullAlbumPath, { recursive: true });

    const albumInfo = {
      name: album.name,
      artist: artistName,
      id: album.id,
      uri: album.uri,
      release_date: album.release_date,
      total_tracks: album.total_tracks,
      tracks: album.tracks.items.map(track => ({
        track_number: track.track_number,
        name: track.name,
        duration_ms: track.duration_ms,
        uri: track.uri,
      })),
    };

    await fs.writeFile(
      path.join(fullAlbumPath, 'album_info.json'),
      JSON.stringify(albumInfo, null, 2)
    );
  }
  console.log('✅ All albums saved!');
};

/**
 * Fetches all of the user's playlists and saves them to the filesystem.
 */
const savePlaylists = async () => {
  console.log('🎵 Fetching playlists...');
  const playlistsData = await fetchAllItems((options) => spotifyApi.getUserPlaylists(options));
  const playlistsDir = path.join(outputDir, 'Playlists');
  await fs.mkdir(playlistsDir, { recursive: true });

  console.log(`📂 Found ${playlistsData.length} playlists. Saving them now...`);

  for (const playlist of playlistsData) {
    const playlistName = sanitizeFilename(playlist.name);
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
        name: item.track.name,
        artist: item.track.artists.map(a => a.name).join(', '),
        album: item.track.album.name,
        added_at: item.added_at,
        uri: item.track.uri,
      })),
    };

    await fs.writeFile(
      path.join(playlistsDir, `${playlistName}.json`),
      JSON.stringify(playlistInfo, null, 2)
    );
  }
  console.log('✅ All playlists saved!');
};


// --- Authentication Server ---
const app = express();

app.get('/login', (req, res) => {
  res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

app.get('/callback', async (req, res) => {
  const error = req.query.error;
  const code = req.query.code;

  if (error) {
    console.error('Callback Error:', error);
    res.send(`Callback Error: ${error}`);
    return;
  }

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const access_token = data.body['access_token'];
    const refresh_token = data.body['refresh_token'];

    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);

    console.log('🚀 Successfully authenticated with Spotify!');
    res.send('Authentication successful! You can close this tab. Check your console.');

    // --- Start the backup process ---
    await fs.mkdir(outputDir, { recursive: true });
    await saveAlbums();
    await savePlaylists();
    console.log('\n🎉 All done! Your Spotify library has been saved.');
    process.exit(0); // Exit the app once done

  } catch (err) {
    console.error('Error getting Tokens:', err);
    res.send('Error getting tokens. Check console.');
  }
});

app.listen(port, () => {
  console.log('----------------------------------------------------');
  console.log(`➡️  Step 1: Open your browser and go to this URL:`);
  console.log(`➡️  http://localhost:${port}/login`);
  console.log('----------------------------------------------------');
  console.log('Waiting for you to authorize the application...');
});