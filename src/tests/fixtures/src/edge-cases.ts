/**
 * Test fixtures for edge cases in decorator detection
 */
import { Injectable, Component, Directive } from '@angular/core';

// Multiple decorators - should be detected as the primary Angular decorator
@Injectable()
@Deprecated()
export class MultipleDecoratorsService {
  constructor() {}
}

// Custom decorator that's not Angular - should be ignored
function CustomDecorator() {
  return function(target: any) {};
}

@CustomDecorator()
export class CustomDecoratedClass {
  constructor() {}
}

// Class with both Angular and custom decorators
@Injectable()
@CustomDecorator()
export class MixedDecoratorsService {
  constructor() {}
}

// Different spacing patterns
@Injectable( )
export class SpacedDecoratorService {
  constructor() {}
}

@Component( {
  selector: 'app-spaced',
  template: '<div>Spaced</div>'
} )
export class SpacedDecoratorComponent {
  constructor() {}
}

// Decorator from different imports
import { Injectable as MyInjectable } from '@angular/core';
import { Component as MyComponent } from '@angular/core';

@MyInjectable()
export class ImportAliasService {
  constructor() {}
}

@MyComponent({
  selector: 'app-alias',
  template: '<div>Alias</div>'
})
export class ImportAliasComponent {
  constructor() {}
}

// Helper function to create decorator (not a real class)
function Deprecated() {
  return function(target: any) {};
}