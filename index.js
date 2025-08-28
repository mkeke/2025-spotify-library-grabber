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
  'user-follow-read',
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

/**
 * Fetches all of the user's "Liked Songs" (saved tracks) and saves them.
 */
const saveLikedSongs = async () => {
  console.log('🎵 Fetching Liked Songs...');
  // The endpoint for saved tracks is getMySavedTracks
  const savedTracksData = await fetchAllItems((options) => spotifyApi.getMySavedTracks(options));
  const playlistsDir = path.join(outputDir, 'Playlists');
  await fs.mkdir(playlistsDir, { recursive: true }); // Ensure directory exists

  console.log(`📂 Found ${savedTracksData.length} liked songs. Saving them now...`);

  // Structure the data to resemble a playlist object for consistency
  const likedSongsPlaylist = {
    name: 'Liked Songs',
    description: 'Your collection of liked songs from Spotify.',
    owner: 'You',
    tracks: savedTracksData.map(item => ({
      name: item.track.name,
      artist: item.track.artists.map(a => a.name).join(', '),
      album: item.track.album.name,
      added_at: item.added_at,
      uri: item.track.uri,
    })),
  };

  await fs.writeFile(
    path.join(playlistsDir, 'Liked Songs.json'),
    JSON.stringify(likedSongsPlaylist, null, 2)
  );
  console.log('✅ Liked Songs saved!');
};

/**
 * Fetches all of the user's saved podcasts (shows) and saves them.
 */
const savePodcasts = async () => {
  console.log('🎵 Fetching saved podcasts...');
  const podcastsData = await fetchAllItems((options) => spotifyApi.getMySavedShows(options));
  const podcastsDir = path.join(outputDir, 'Podcasts');
  await fs.mkdir(podcastsDir, { recursive: true });

  console.log(`📂 Found ${podcastsData.length} podcasts. Saving them now...`);

  for (const item of podcastsData) {
    const show = item.show;
    const showFolderName = sanitizeFilename(show.name);
    const fullShowPath = path.join(podcastsDir, showFolderName);
    await fs.mkdir(fullShowPath, { recursive: true });

    const showInfo = {
      name: show.name,
      publisher: show.publisher,
      description: show.description,
      total_episodes: show.total_episodes,
      uri: show.uri,
    };

    await fs.writeFile(
      path.join(fullShowPath, 'show_info.json'),
      JSON.stringify(showInfo, null, 2)
    );
  }
  console.log('✅ All podcasts saved!');
};


/**
 * Fetches all of the user's followed artists and saves them.
 * NOTE: This uses cursor-based pagination, which is different from other endpoints.
 */
const saveFollowedArtists = async () => {
  console.log('🎵 Fetching followed artists...');
  const artistsDir = path.join(outputDir, 'Artists');
  await fs.mkdir(artistsDir, { recursive: true });

  let artists = [];
  let after = null; // The cursor for the next page
  let response;

  // Loop until there are no more pages
  do {
    response = await spotifyApi.getFollowedArtists({ limit: 50, after });
    const newArtists = response.body.artists.items;
    artists = artists.concat(newArtists);
    after = response.body.artists.cursors.after;
  } while (after);

  console.log(`📂 Found ${artists.length} followed artists. Saving them now...`);

  for (const artist of artists) {
    const artistName = sanitizeFilename(artist.name);
    const artistInfo = {
      name: artist.name,
      genres: artist.genres,
      popularity: artist.popularity,
      followers: artist.followers.total,
      uri: artist.uri,
    };
    await fs.writeFile(
      path.join(artistsDir, `${artistName}.json`),
      JSON.stringify(artistInfo, null, 2)
    );
  }
  console.log('✅ All followed artists saved!');
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

    // --- Start the backup process ---
    await fs.mkdir(outputDir, { recursive: true });
    await saveLikedSongs();
    await savePodcasts();
    await saveFollowedArtists();
    await saveAlbums();
    await savePlaylists();
    console.log('\n🎉 All done! Your complete Spotify library has been saved.');
    process.exit(0); // Exit the app once done

  } catch (err) {
    // Log the error details
    console.error('Error getting Tokens:', err);
    if (err.statusCode === 429) {
      console.error('Rate limited by Spotify. Retry after:', err.headers['retry-after'], 'seconds');
    }
    if (!res.headersSent) res.send('Error getting tokens. Check console.');
  }
});

app.listen(port, () => {
  console.log('----------------------------------------------------');
  console.log(`➡️  Step 1: Open your browser and go to this URL:`);
  console.log(`➡️  http://localhost:${port}/login`);
  console.log('----------------------------------------------------');
  console.log('Waiting for you to authorize the application...');
});