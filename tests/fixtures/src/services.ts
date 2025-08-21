/**
 * Test fixtures for @Injectable decorated services
 */
import { Injectable, Inject, Optional, Self, SkipSelf, Host } from '@angular/core';

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

// Services for parameter decorator testing (FR-04)

// Optional dependency
@Injectable()
export class OptionalService {
  constructor() {}
}

@Injectable()
export class ServiceWithOptionalDep {
  constructor(@Optional() private optionalService: OptionalService) {}
}

// Self dependency
@Injectable()
export class SelfService {
  constructor() {}
}

@Injectable()
export class ServiceWithSelfDep {
  constructor(@Self() private selfService: SelfService) {}
}

// SkipSelf dependency
@Injectable()
export class SkipSelfService {
  constructor() {}
}

@Injectable()
export class ServiceWithSkipSelfDep {
  constructor(@SkipSelf() private skipSelfService: SkipSelfService) {}
}

// Host dependency
@Injectable()
export class HostService {
  constructor() {}
}

@Injectable()
export class ServiceWithHostDep {
  constructor(@Host() private hostService: HostService) {}
}

// Multiple decorators on same parameter
@Injectable()
export class MultiDecoratedService {
  constructor() {}
}

@Injectable()
export class ServiceWithMultiDecorators {
  constructor(@Optional() @Self() private multiDecoratedService: MultiDecoratedService) {}
}

// @Inject with parameter decorators
@Injectable()
export class ServiceWithInjectAndDecorators {
  constructor(@Inject(API_TOKEN) @Optional() private apiToken: string) {}
}

// Mixed decorators and regular parameters
@Injectable()
export class RegularService {
  constructor() {}
}

@Injectable()
export class ServiceWithMixedDecorators {
  constructor(
    private regularService: RegularService,
    @Optional() private optionalService: OptionalService,
    @Host() private hostService: HostService
  ) {}
}

// Modern Angular inject() function patterns for TDD Cycle 2.1

import { inject } from '@angular/core';

// Basic inject() with optional flag
@Injectable()
export class ServiceWithInjectOptional {
  private dependency = inject(BasicService, { optional: true });
  constructor() {}
}

// inject() with self flag
@Injectable()
export class ServiceWithInjectSelf {
  private dependency = inject(SelfService, { self: true });
  constructor() {}
}

// inject() with skipSelf flag
@Injectable()
export class ServiceWithInjectSkipSelf {
  private dependency = inject(SkipSelfService, { skipSelf: true });
  constructor() {}
}

// inject() with host flag
@Injectable()
export class ServiceWithInjectHost {
  private dependency = inject(HostService, { host: true });
  constructor() {}
}

// inject() with multiple options
@Injectable()
export class ServiceWithInjectMultipleOptions {
  private dependency = inject(OptionalService, { optional: true, self: true });
  constructor() {}
}

// Mixed legacy decorators and modern inject()
@Injectable()
export class ServiceWithMixedLegacyAndInject {
  private injectDependency = inject(BasicService, { optional: true });
  constructor(@Self() private legacyDependency: SelfService) {}
}

// Multiple inject() calls with different options
@Injectable()
export class ServiceWithMultipleInjects {
  private optionalDep = inject(OptionalService, { optional: true });
  private selfDep = inject(SelfService, { self: true });
  private hostDep = inject(HostService, { host: true });
  constructor() {}
}

// inject() without options (should have empty flags)
@Injectable()
export class ServiceWithBasicInject {
  private dependency = inject(BasicService);
  constructor() {}
}

// inject() with token reference
@Injectable()
export class ServiceWithInjectToken {
  private config = inject(API_CONFIG, { optional: true });
  constructor() {}
}