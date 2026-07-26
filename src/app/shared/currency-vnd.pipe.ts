import { Pipe, PipeTransform } from '@angular/core';
import { formatCurrency } from './common.config';

@Pipe({ name: 'currencyVnd', standalone: true, pure: true })
export class CurrencyVndPipe implements PipeTransform {
	transform(value: number | null | undefined): string {
		if (value == null) return formatCurrency(0);
		return formatCurrency(value);
	}
}
