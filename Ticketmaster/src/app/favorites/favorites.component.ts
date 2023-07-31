import { Component, ViewEncapsulation } from "@angular/core";

@Component({
  selector: "app-favorites",
  templateUrl: "./favorites.component.html",
  styleUrls: ["./favorites.component.css"],
  encapsulation: ViewEncapsulation.None,
})
export class FavoritesComponent {
  columndefs = ["#", "date", "event", "category", "venue", "favorite"];
  favoriteEvents: any[] = [];
  ngOnInit() {
    this.favoriteEvents = JSON.parse(
      localStorage.getItem("favoriteEvents") || "[]"
    );
    console.log(this.favoriteEvents);
  }

  removeFavorite(favorite: any) {
    window.alert("Removed from favorites!");
    this.favoriteEvents = this.favoriteEvents.filter(
      (item) => item.id !== favorite.id
    );
    localStorage.setItem("favoriteEvents", JSON.stringify(this.favoriteEvents));
  }
}
