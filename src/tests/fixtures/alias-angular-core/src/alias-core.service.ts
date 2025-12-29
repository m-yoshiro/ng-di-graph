import { Injectable } from '@angular/core';
import { ElementRef } from '@alias/angular-core';

@Injectable()
export class AliasCoreService {
  constructor(private elementRef: ElementRef) {}
}
