/**
 * Test fixtures for @Directive decorated classes
 */
import { Directive } from '@angular/core';

@Directive({
  selector: '[appBasic]',
})
export class BasicDirective {
  constructor() {}
}

@Directive({
  selector: '[appAdvanced]',
  exportAs: 'advancedDirective',
})
export class AdvancedDirective {
  constructor() {}
}

// Different import patterns
import { Directive as DirectiveDecorator } from '@angular/core';

@DirectiveDecorator({
  selector: '[appAliased]',
})
export class AliasedDirective {
  constructor() {}
}

// Multi-line decorator
@Directive({
  selector: '[appMultiline]',
  host: {
    class: 'multiline-directive',
  },
})
export class MultiLineDirective {
  constructor() {}
}
