import { Component } from "@angular/core";
import { Inject } from "@angular/core";
import {
  MatDialog,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from "@angular/material/dialog";

export interface DialogData {
  mapOptions: any;
  marker: any;
}
@Component({
  selector: "app-map_dialog",
  templateUrl: "./map_dialog.component.html",
  styleUrls: ["./map_dialog.component.css"],
})
export class MapDialog {
  constructor(
    public dialogRef: MatDialogRef<MapDialog>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    console.log(this.data);
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
