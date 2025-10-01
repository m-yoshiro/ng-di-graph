/**
 * Test fixtures for @Component decorated classes
 */
import { Component, Inject } from '@angular/core';
import { API_CONFIG, API_TOKEN, BasicService, type ServiceA, type ServiceB, type TestService } from './services';

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

// Component with type annotation dependency
@Component({
  selector: 'app-test',
  template: '<div>Test</div>'
})
export class TestComponent {
  constructor(private testService: TestService) {}
}

// Component with @Inject decorator
@Component({
  selector: 'app-inject',
  template: '<div>Inject</div>'
})
export class InjectComponent {
  constructor(@Inject(API_CONFIG) private config: any) {}
}

// Component with multiple constructor parameters
@Component({
  selector: 'app-multi',
  template: '<div>Multi</div>'
})
export class MultiDependencyComponent {
  constructor(
    private serviceA: ServiceA,
    private serviceB: ServiceB,
    @Inject(API_TOKEN) private apiToken: string
  ) {}
}

// Component with any/unknown types (should be skipped)
@Component({
  selector: 'app-any',
  template: '<div>Any</div>'
})
export class ComponentWithAny {
  constructor(private anyParam: any, private unknownParam: unknown) {}
}