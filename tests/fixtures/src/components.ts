/**
 * Test fixtures for @Component decorated classes
 */
import { Component } from '@angular/core';

@Component({
  selector: 'app-basic',
  template: '<div>Basic Component</div>'
})
export class BasicComponent {
  constructor() {}
}

@Component({
  selector: 'app-complex',
  templateUrl: './complex.component.html',
  styleUrls: ['./complex.component.css']
})
export class ComplexComponent {
  constructor() {}
}

// Different import patterns
import { Component as ComponentDecorator } from '@angular/core';

@ComponentDecorator({
  selector: 'app-aliased',
  template: '<div>Aliased</div>'
})
export class AliasedComponent {
  constructor() {}
}

// Multi-line decorator
@Component({
  selector: 'app-multiline',
  template: `
    <div>
      Multi-line template
    </div>
  `
})
export class MultiLineComponent {
  constructor() {}
}

// Undecorated class - should be ignored
export class UndecoratedComponent {
  constructor() {}
}