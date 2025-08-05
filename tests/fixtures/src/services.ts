/**
 * Test fixtures for @Injectable decorated services
 */
import { Injectable, Inject } from '@angular/core';

// Test tokens for @Inject patterns
export const API_CONFIG = 'API_CONFIG';
export const API_TOKEN = 'API_TOKEN';

@Injectable()
export class BasicService {
  constructor() {}
}

// Service with type annotation dependency
@Injectable()
export class TestService {
  constructor(private basicService: BasicService) {}
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

// Service with @Inject decorator
@Injectable()
export class InjectService {
  constructor(@Inject(API_CONFIG) private config: any) {}
}

// Service with multiple dependencies
@Injectable()
export class MultiDependencyService {
  constructor(
    private basicService: BasicService,
    private testService: TestService,
    @Inject(API_TOKEN) private apiToken: string
  ) {}
}

// Service with any/unknown types (should be skipped)
@Injectable()
export class ServiceWithAnyTypes {
  constructor(private anyParam: any, private unknownParam: unknown) {}
}

// Service with primitive types (should be skipped)
@Injectable()
export class ServiceWithPrimitives {
  constructor(private stringParam: string, private numberParam: number) {}
}

// Additional services for testing
@Injectable()
export class ServiceA {
  constructor() {}
}

@Injectable()
export class ServiceB {
  constructor() {}
}