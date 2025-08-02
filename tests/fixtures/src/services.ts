/**
 * Test fixtures for @Injectable decorated services
 */
import { Injectable } from '@angular/core';

@Injectable()
export class BasicService {
  constructor() {}
}

@Injectable({ providedIn: 'root' })
export class RootProvidedService {
  constructor() {}
}

@Injectable({
  providedIn: 'root'
})
export class MultiLineDecoratorService {
  constructor() {}
}

// Different import patterns
import { Injectable as InjectableDecorator } from '@angular/core';

@InjectableDecorator()
export class AliasedDecoratorService {
  constructor() {}
}

// Class without decorator - should be ignored
export class UndecoratedService {
  constructor() {}
}

// Anonymous class - should be warned about and skipped
export const AnonymousService = Injectable()(class {
  constructor() {}
});