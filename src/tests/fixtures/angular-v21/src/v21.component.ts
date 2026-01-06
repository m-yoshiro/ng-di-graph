import { Component } from '@angular/core';
import { FormArrayDirective } from '@angular/forms';

@Component({
  selector: 'app-v21',
  standalone: true,
  imports: [FormArrayDirective],
  template: '<div></div>',
})
export class V21Component {
  constructor(private readonly formArray: FormArrayDirective) {}
}
