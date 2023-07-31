import { Component } from '@angular/core';
import { Searchquery } from '../searchquery.model';

@Component({
  selector: 'app-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.css'],
})
export class FormComponent {
  categories = ['Music', 'Sports', 'Arts & Theatre', 'Film', 'Miscellaneous'];

  model = new Searchquery(10, '', '', [0, 0]);
  submitted = false;
  onSubmit() {
    // Validation Code here
    this.submitted = true;
  }
  onReset() {
    // Reset Code here
    this.submitted = false;
    this.model = new Searchquery(10, '', '', [0, 0]);
  }
}
