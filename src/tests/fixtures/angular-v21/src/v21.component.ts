import { Component, Injectable, InjectionToken, inject } from '@angular/core';
import { FormArrayDirective } from '@angular/forms';

export const V21_TOKEN = new InjectionToken<string>('v21.token');

@Injectable({ providedIn: 'root' })
export class V21Service {}

@Component({
  selector: 'app-v21',
  standalone: true,
  imports: [FormArrayDirective],
  template: '<div></div>',
})
export class V21Component {
  private readonly service = inject(V21Service);

  constructor(private readonly formArray: FormArrayDirective) {}
}

@Component({
  selector: 'app-v21-no-constructor',
  standalone: true,
  template: '<div></div>',
})
export class NoConstructorComponent {
  readonly service = inject(V21Service);
}

@Component({
  selector: 'app-v21-inject-options',
  standalone: true,
  template: '<div></div>',
})
export class InjectWithOptionsComponent {
  readonly optionalService = inject(V21Service, { optional: true });
}

@Component({
  selector: 'app-v21-inject-token',
  standalone: true,
  template: '<div></div>',
})
export class TokenInjectComponent {
  readonly tokenValue = inject(V21_TOKEN);
}
