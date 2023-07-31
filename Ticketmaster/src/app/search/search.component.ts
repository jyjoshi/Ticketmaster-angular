import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  ViewChild,
  ViewEncapsulation,
} from "@angular/core";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";

import { HttpClient, HttpParams } from "@angular/common/http";
import { encodeBase32 } from "geohashing";
import { DOCUMENT } from "@angular/common";
import { Observable, startWith } from "rxjs";
import { FormControl } from "@angular/forms";
import { MapDialog } from "../map_dialog/favorites/map_dialog.component";
import {
  debounceTime,
  distinctUntilChanged,
  map,
  switchMap,
} from "rxjs/operators";
import { MatSort, Sort } from "@angular/material/sort";

const MAP_HASH_URL: string =
  "https://maps.googleapis.com/maps/api/geocode/json?key=AIzaSyAQb5xT6gDIRGuhXOvTcnU_E2lvQaS5GuU";
const IPKey: string = "158f827e48dd95";
// const BACKEND_URL: string = "https://ticketmaster-angular.wl.r.appspot.com";
const BACKEND_URL: string = "http://localhost:3000";

interface LEvent {
  id: string;
  datetime: string;
  iconSrc: string;
  iconAlt: string;
  eventName: string;
  genre: string;
  venue: string;
}

@Component({
  selector: "app-search",
  templateUrl: "./search.component.html",
  styleUrls: ["./search.component.css"],
  encapsulation: ViewEncapsulation.None,
})
export class SearchComponent implements AfterViewInit {
  keyword!: string;
  distance: number = 10;
  location!: string;
  autoLocation: boolean = false;
  category: string = "Default";

  @ViewChild("empTbSort") empTbSort = new MatSort();

  myControl = new FormControl();
  options = [];
  filteredOptions!: Observable<string[]>;
  favoriteEvents: any[] = [];

  geoHash!: string;
  selectedTab: string = "EVENT";
  isEventsLoading = false;
  isEventsLoaded = false;
  events: LEvent[] = [];
  selectedEvent!: any;
  selectedVenue!: any;
  artistDetails!: any;
  displayedColumns: string[] = [
    "datetime",
    "iconSrc",
    "eventName",
    "genre",
    "venue",
  ];

  noEvent = false;

  constructor(
    private http: HttpClient,
    public matDialog: MatDialog,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.filteredOptions = this.myControl.valueChanges.pipe(
      debounceTime(30),
      distinctUntilChanged(),
      switchMap((value) => this.getNames(value as string))
    );
    this.favoriteEvents = JSON.parse(
      localStorage.getItem("favoriteEvents") || "[]"
    );
  }

  isFavorite() {
    return this.favoriteEvents.find((e: any) => e.id === this.selectedEvent.id);
  }

  toggleFavorite() {
    if (this.isFavorite()) {
      window.alert("Event Removed from favorites!");
      this.favoriteEvents = this.favoriteEvents.filter(
        (e: any) => e.id !== this.selectedEvent.id
      );
    } else {
      window.alert("Event Added to favorites!");
      this.favoriteEvents.push(this.selectedEvent);
    }
    console.log(this.favoriteEvents);
    localStorage.setItem("favoriteEvents", JSON.stringify(this.favoriteEvents));
  }

  openGoogleMap() {
    console.log("Opening google map");
    console.log("Lat: " + this.selectedVenue.venue_lat);
    console.log("Lng: " + this.selectedVenue.venue_lng);
    let lat = parseFloat(this.selectedVenue.venue_lat);
    let lng = parseFloat(this.selectedVenue.venue_lng);
    const mapOptions: google.maps.MapOptions = {
      center: { lat, lng },
      zoom: 14,
    };
    const marker = {
      position: { lat, lng },
    };

    this.matDialog.open(MapDialog, {
      data: {
        mapOptions,
        marker,
      },
    });
  }

  onSubmit() {
    this.events = [];
    this.resetPage();
    if (!this.autoLocation) {
      this.http
        .get(MAP_HASH_URL + "&address=" + encodeURIComponent(this.location))
        .subscribe((response: any) => {
          const lat = response.results[0].geometry.location.lat;
          const long = response.results[0].geometry.location.lng;
          this.geoHash = encodeBase32(lat, long, 7);
          this.onSubmitAPIReq();
        });
    } else {
      this.onSubmitAPIReq();
    }
  }

  resetPage() {
    this.events = [];
    this.selectedEvent = null;
    this.selectedVenue = null;
    this.artistDetails = null;
    this.isEventsLoaded = false;
    this.isEventsLoading = false;
    this.noEvent = false;
  }

  eventSorter(key: string, order: string) {
    return function (a: any, b: any) {
      if (a[key] > b[key]) return order === "asc" ? 1 : -1;
      else if (a[key] < b[key]) return order === "asc" ? -1 : 1;
      return 0;
    };
  }

  onSubmitAPIReq() {
    this.resetPage();
    this.http
      .get(
        BACKEND_URL +
          `/events?radius=${this.distance}&category=${this.category}&keyword=${this.keyword}&geoPoint=${this.geoHash}`
      )
      .subscribe((response: any) => {
        if ("error" in response) {
          this.noEvent = true;
        } else {
          this.events = response
            .map((r: any) => {
              const images = r["images"];
              let imageUrl = "";
              let imageAlt = "";
              if (images && images.length > 0) {
                imageUrl = images[0]["url"];
                imageAlt = images[0]["alt"];
              }
              console.log("Creating event object");
              return {
                id: r["id"],
                datetime:
                  r["dates"]["start"]["localDate"] +
                  "\n" +
                  r["dates"]["start"]["localTime"],
                iconSrc: imageUrl,
                iconAlt: imageAlt,
                eventName: r["name"],
                genre: r["classifications"][0]["segment"]["name"],
                venue: r["_embedded"]["venues"][0]["name"],
              } as LEvent;
            })
            .sort(this.eventSorter("datetime", "asc"));
        }

        this.isEventsLoaded = true;
        this.isEventsLoading = false;
      });
  }

  onEventTabClick(event: any) {
    this.selectedTab = "EVENT";
  }

  onArtistTabClick(event: any) {
    this.selectedTab = "ARTIST";
  }

  onVenueTabClick(event: any) {
    this.selectedTab = "VENUE";
  }

  onRowClick(event: LEvent) {
    this.sendEventDetailApiRequest(event.id);
  }

  getNames(val: string): Observable<string[]> {
    return this.http.get<any>(BACKEND_URL + "/suggestions?keyword=" + val);
  }

  goBack() {
    this.selectedEvent = null;
    this.artistDetails = null;
  }

  onClearClick() {
    this.distance = 10;
    this.category = "Default";
    this.autoLocation = false;
    this.events = [];
    this.keyword = "";
    this.location = "";
    this.noEvent = false;
    this.resetPage();
  }

  onCheckboxChange(event: any) {
    if (event.target.checked) {
      this.location = "";
      this.http
        .get("https://ipinfo.io/json?token=" + IPKey)
        .subscribe((response: any) => {
          // [lat, lng] = response.split(",");
          const locat = response["loc"] as string;
          const st = locat.split(",");
          const lat = +st[0];
          const long = +st[1];
          this.geoHash = encodeBase32(lat, long, 7);
        });
    }
  }

  sendEventDetailApiRequest(row: any) {
    this.http
      .get(BACKEND_URL + "/event/" + row.id)
      .subscribe((response: any) => {
        console.log("Response is :", response);

        const seatMapImgUrl = response.seatmap && response.seatmap.staticUrl;
        const date = response.dates.start.localDate;
        const time = response.dates.start.localTime;
        const artists =
          response._embedded?.attractions?.map((attraction: any) => {
            return { name: attraction.name, url: attraction.url };
          }) || [];

        const venue = response._embedded?.venues[0].name || "";
        const genres = [];
        let category = "";
        if (response.classifications) {
          const classifications = response.classifications[0];
          category = classifications.segment.name;
          if (
            classifications.segment &&
            classifications.segment.name != "Undefined"
          ) {
            genres.push(classifications.segment.name);
          }
          if (
            classifications.genre &&
            classifications.genre.name != "Undefined"
          ) {
            genres.push(classifications.genre.name);
          }
          if (
            classifications.subGenre &&
            classifications.subGenre.name != "Undefined"
          ) {
            genres.push(classifications.subGenre.name);
          }
          if (
            classifications.subType &&
            classifications.subType.name != "Undefined"
          ) {
            genres.push(classifications.subType.name);
          }
          if (
            classifications.type &&
            classifications.type.name != "Undefined"
          ) {
            genres.push(classifications.type.name);
          }
        }
        const genresString = genres.join(", ");
        const genresPipe = genres.join(" | ");
        const priceRange = response.priceRanges?.[0] || null;
        const minPrice = priceRange?.min || null;
        const maxPrice = priceRange?.max || null;
        const priceString = minPrice + " - " + maxPrice + " USD";

        let ticketStatus = {
          color: "",
          textContent: "",
        };

        switch (response?.dates?.status?.code) {
          case "onsale": {
            ticketStatus.color = "green";
            ticketStatus.textContent = "On Sale";
            break;
          }
          case "offsale": {
            ticketStatus.color = "red";
            ticketStatus.textContent = "Off Sale";
            break;
          }
          case "cancelled": {
            ticketStatus.color = "black";
            ticketStatus.textContent = "Cancelled";
            break;
          }
          case "postponed": {
            ticketStatus.color = "orange";
            ticketStatus.textContent = "Postponed";
            break;
          }

          case "rescheduled": {
            ticketStatus.color = "orange";
            ticketStatus.textContent = "Rescheduled";
            break;
          }
        }

        const eventUrl = response?.url;
        const name = response?.name;

        const facebook_href = encodeURI(
          "https://www.facebook.com/sharer/sharer.php?u=" + eventUrl
        );
        this.selectedEvent = {
          id: response.id,
          seatMapImgUrl,
          date,
          time,
          artists,
          venue,
          genresString,
          genresPipe,
          priceString,
          ticketStatus,
          eventUrl,
          name,
          facebook_href,
        };

        const venueDetails = response._embedded?.venues[0];

        const venueName = venueDetails?.name;
        const venueAddress = venueDetails?.address?.line1;
        const venueCity = venueDetails?.city?.name;
        const venueState = venueDetails?.state?.name;
        const fullAddress = venueAddress + ", " + venueCity + ", " + venueState;
        const phoneNumber = venueDetails?.boxOfficeInfo?.phoneNumberDetail;
        const openHours = venueDetails?.boxOfficeInfo?.openHoursDetail;
        const generalRule = venueDetails?.generalInfo?.generalRule;
        const childRule = venueDetails?.generalInfo?.childRule;
        const venue_lat = venueDetails?.location.latitude;
        const venue_lng = venueDetails?.location.longitude;

        console.log("Venue Data is ", response._embedded?.venues[0]);
        console.log("Venue Latitude is ", venue_lat);
        console.log("Venue Longitude is ", venue_lng);

        var paragraphs = [];
        if (openHours) {
          var data = {
            id: 1,
            title: "Open Hours",
            content: openHours,
            visible: false,
          };
          paragraphs.push(data);
        }

        if (generalRule) {
          var data = {
            id: 2,
            title: "General Rule",
            content: generalRule,
            visible: false,
          };
          paragraphs.push(data);
        }

        if (childRule) {
          var data = {
            id: 3,
            title: "Child Rule",
            content: childRule,
            visible: false,
          };
          paragraphs.push(data);
        }

        this.selectedVenue = {
          venueName,
          fullAddress,
          phoneNumber,
          openHours,
          generalRule,
          childRule,
          paragraphs,
          venue_lat,
          venue_lng,
        };
        console.log("Open Hours", openHours);
        console.log("Child Rule", childRule);
        console.log("General Rule", generalRule);

        console.log("paragraphs", paragraphs);

        if (category == "Music" && artists.length > 0) {
          this.http
            .get(BACKEND_URL + "/api/artist-detail", {
              params: {
                performers: artists.map((artist: any) => artist.name),
              },
            })
            .subscribe((response: any) => {
              const details = response.map((detail: any) => {
                console.log(detail);
                console.log("Popularity is :", detail.popularity);
                return {
                  id: detail.id,
                  name: detail.name,
                  followers: detail.followers.total.toLocaleString(),
                  popularity: detail.popularity,
                  spotifyLink: detail.external_urls.spotify,
                  imageUrl: detail.images[2].url,
                  albums: detail.albums.map((album: any) => {
                    return {
                      imageUrl: album.images[1].url,
                      spotifyLink: album.external_urls.spotify,
                    };
                  }),
                };
              });
              this.artistDetails = details;
              console.log("Artist Details are ", this.artistDetails);
            });
        }
      });
  }

  ngAfterViewInit(): void {}
}
