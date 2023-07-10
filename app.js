const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();
const SpotifyWebApi = require("spotify-web-api-node");
const { response } = require("express");

var path = require("path");
const { log } = require("console");

app.use(cors());

app.set("trust proxy", true);
app.use(express.static(path.join(__dirname, "dist/ticketmaster")));

const API_KEY = "a2gMxrvXE4w05sgZaGuNmTYzEGWpUJ6o";
const API_ENDPOINT = "https://app.ticketmaster.com/discovery/v2";

// credentials are optional
var spotifyApi = new SpotifyWebApi({
  clientId: "3b269e060fd346adb69777ba80840f7d",
  clientSecret: "d935ff42ae854996a538343adfe1fc1c",
  // redirectUri: "http://www.example.com/callback",
});

app.get("/events", async (req, res) => {
  try {
    const { radius, geoPoint, category, keyword } = req.query;
    console.log("Query received: ", req.query);

    if (category == "music") {
      segmentId = "KZFzniwnSyZfZ7v7nJ";
    } else if (category == "sports") {
      segmentId = "KZFzniwnSyZfZ7v7nE";
    } else if (category == "arts") {
      segmentId = "KZFzniwnSyZfZ7v7na";
    } else if (category == "film") {
      segmentId = "KZFzniwnSyZfZ7v7nn";
    } else if (category == "misc") {
      segmentId = "KZFzniwnSyZfZ7v7n1";
    } else if (category == "Default") {
      segmentId = "";
    }

    const params = {
      apikey: API_KEY,
      unit: "miles",
      segmentId,
      keyword,
      radius,
      geoPoint,
    };

    const response = await axios.get(`${API_ENDPOINT}/events.json`, { params });

    if (response.status == 200) {
      const data = response.data;
      if (data._embedded && data._embedded.events) {
        const event_data = data._embedded.events;
        // console.log(event_data);
        res.json(event_data);
      } else {
        console.log("No Records Found");
        res.json({ error: "No Records Found" });
      }
    } else {
      console.log("Unable to retrieve events");
      res.status(response.status).json({ error: "Unable to retrieve events" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

app.get("/event/:event_id", async (req, res) => {
  try {
    const { event_id } = req.params;
    const url = `https://app.ticketmaster.com/discovery/v2/events/${event_id}?apikey=${API_KEY}`;
    const response = await axios.get(url);

    if (response.status == 200 && response.data) {
      const event_data = response.data;
      // console.log(event_data);
      res.json(event_data);
    } else {
      console.log("Event not found");
      res.status(404).json({ message: "Event not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

app.get("/venues/:venue_name", async (req, res) => {
  const venueName = req.params.venue_name;
  try {
    const response = await axios.get(
      `https://app.ticketmaster.com/discovery/v2/venues?apikey=${API_KEY}&keyword=${venueName}`
    );
    const venueData = response.data._embedded.venues[0];
    console.log(venueData);
    res.json(venueData);
  } catch (error) {
    console.log("Venue not found");
    res.status(404).json({ message: "Venue not found" });
  }
});

app.get("/suggestions", async (req, res) => {
  const keyword = req.query.keyword;
  const suggestions = await getTicketmasterSuggestions(keyword);
  if (suggestions?._embedded?.attractions) {
    const data = suggestions._embedded.attractions;
    const suggestionsData = data.map((item) => item.name);
    // console.log(suggestionsData);
    res.json(suggestionsData);
  } else {
    res.json({});
  }
});

// Artist Detail API
app.get("/api/artist-detail", async (req, res) => {
  let performers = req.query["performers"];
  if (!performers) {
    return res.status(500).json({ message: "performers is required." });
  }
  if (typeof performers == "string") {
    performers = [performers];
  }
  try {
    const authResponse = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(authResponse.body["access_token"]);

    var response = [];
    counter = 0;
    performers.forEach(async (performer) => {
      resp = await spotifyApi.searchArtists(performer);
      for (i in resp.body.artists.items) {
        let artist = resp.body.artists.items[i];
        if (
          artist.name.toLowerCase().trim() == performer.toLowerCase().trim()
        ) {
          let albums = await spotifyApi.getArtistAlbums(artist.id, {
            limit: 3,
          });
          response.push({ ...artist, albums: albums.body.items });
          break;
        }
      }
      counter += 1;
      if (counter === performers.length) {
        console.log(response);
        return res.json(response);
      }
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: e });
    // .json({ message: "Unable to fetch artists detail from spotify." });
  }
});

async function getTicketmasterSuggestions(keyword) {
  const apiUrl = API_ENDPOINT + "/suggest";

  const params = {
    apikey: API_KEY,
    keyword: keyword,
  };
  const response = await axios.get(apiUrl, { params });
  // console.log(response.data);
  return response.data;
}

app.get("*", (req, res) => {
  res.sendFile(__dirname, "dist/ticketmaster/index.html");
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
server.timeout = 1000;
