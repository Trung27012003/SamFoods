import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import { SiteSettingsStore } from '../shared/site-settings';
import { formatCurrency } from '../shared/common.config';

export interface InvoicePrintData {
	BillCode: string;
	BillDate: string | Date;
	CustomerName: string;
	PhoneNumber?: string;
	Address?: string;
	Note?: string;
	TotalAmount: number;
	ShippingType?: number;
	ShippingFee?: number;
	PickupTime?: string;
	InvoiceDetails: {
		ProductName: string;
		ProductCode?: string;
		UnitPrice: number;
		Quantity: number;
	}[];
}

@Injectable({ providedIn: 'root' })
export class InvoicePdfService {
	private siteSettings = inject(SiteSettingsStore);

	// Page config (80mm receipt paper)
	private readonly PAGE_WIDTH_MM = 80;
	private readonly MARGIN_LEFT = 5;
	private readonly MARGIN_RIGHT = 5;
	private readonly CONTENT_WIDTH: number = this.PAGE_WIDTH_MM - this.MARGIN_LEFT - this.MARGIN_RIGHT;
	private readonly LINE_HEIGHT = 4.5;
	private readonly FONT_SIZE_HEADER = 10;
	private readonly FONT_SIZE_TITLE = 12;
	private readonly FONT_SIZE_BODY = 9;
	private readonly FONT_SIZE_SMALL = 8;
	private readonly FONT_SIZE_FOOTER = 8;

	/**
	 * Generate PDF for multiple invoices (multi-page)
	 */
	generateMultiple(invoices: InvoicePrintData[]): void {
		if (!invoices || invoices.length === 0) return;

		const doc = this.createDoc(invoices[0]);

		for (let i = 0; i < invoices.length; i++) {
			if (i > 0) {
				doc.addPage([this.PAGE_WIDTH_MM, this.estimatePageHeight(invoices[i])]);
			}
			this.renderInvoice(doc, invoices[i]);
		}

		// Open in new tab for printing
		const pdfBlob = doc.output('blob');
		const url = URL.createObjectURL(pdfBlob);
		const printWindow = window.open(url, '_blank');
		if (printWindow) {
			printWindow.addEventListener('load', () => {
				setTimeout(() => printWindow.print(), 500);
			});
		}
	}

	/**
	 * Generate PDF for a single invoice
	 */
	generateSingle(invoice: InvoicePrintData): void {
		this.generateMultiple([invoice]);
	}

	private createDoc(firstInvoice: InvoicePrintData): jsPDF {
		const pageHeight = this.estimatePageHeight(firstInvoice);
		return new jsPDF({
			orientation: 'portrait',
			unit: 'mm',
			format: [this.PAGE_WIDTH_MM, pageHeight],
			putOnlyUsedFonts: true,
		});
	}

	private estimatePageHeight(invoice: InvoicePrintData): number {
		const detailRows = invoice.InvoiceDetails?.length || 0;
		// Header (store info) ~25mm + invoice info ~20mm + table header ~6mm
		// + each product ~10mm (name line + qty/price line) + footer ~25mm + padding
		return 25 + 20 + 6 + (detailRows * 10) + 25 + 15;
	}

	private renderInvoice(doc: jsPDF, invoice: InvoicePrintData): void {
		let y = 5; // starting y position

		// ===== STORE HEADER =====
		const storeName = this.siteSettings.get('store_name', 'SamFoods');
		const storeAddress = this.siteSettings.get('contact_address', '');
		const storePhone = this.siteSettings.get('contact_phone_1', '');

		doc.setFontSize(this.FONT_SIZE_HEADER);
		doc.setFont('helvetica', 'bold');
		y = this.textCenter(doc, storeName, y);
		y += 1;

		if (storeAddress) {
			doc.setFontSize(this.FONT_SIZE_SMALL);
			doc.setFont('helvetica', 'normal');
			y = this.textCenterWrap(doc, storeAddress, y);
			y += 1;
		}

		// ===== TITLE =====
		y += 2;
		doc.setFontSize(this.FONT_SIZE_TITLE);
		doc.setFont('helvetica', 'bold');
		y = this.textCenter(doc, 'HOA DON BAN HANG', y);
		y += 3;

		// ===== INVOICE INFO =====
		doc.setFontSize(this.FONT_SIZE_BODY);
		doc.setFont('helvetica', 'normal');

		const billDate = this.formatDate(invoice.BillDate);
		doc.text(`So: ${invoice.BillCode || '-'}`, this.MARGIN_LEFT, y);
		doc.text(`Ngay: ${billDate}`, this.PAGE_WIDTH_MM - this.MARGIN_RIGHT, y, { align: 'right' });
		y += this.LINE_HEIGHT + 1;

		doc.text(`Khach hang: ${invoice.CustomerName || 'Khach Le'}`, this.MARGIN_LEFT, y);
		y += this.LINE_HEIGHT + 1;

		if (invoice.PhoneNumber) {
			doc.text(`SDT: ${invoice.PhoneNumber}`, this.MARGIN_LEFT, y);
			y += this.LINE_HEIGHT + 1;
		}

		if (invoice.Address) {
			const addressLines = doc.splitTextToSize(`Dia chi: ${invoice.Address}`, this.CONTENT_WIDTH);
			doc.text(addressLines, this.MARGIN_LEFT, y);
			y += addressLines.length * this.LINE_HEIGHT + 1;
		}

		// ===== SEPARATOR =====
		y += 1;
		this.drawDashedLine(doc, y);
		y += 3;

		// ===== TABLE HEADER =====
		doc.setFontSize(this.FONT_SIZE_SMALL);
		doc.setFont('helvetica', 'bold');

		const colSL = this.MARGIN_LEFT;
		const colPrice = this.MARGIN_LEFT + 22;
		const colTotal = this.PAGE_WIDTH_MM - this.MARGIN_RIGHT;

		doc.text('SL', colSL, y);
		doc.text('Don gia', colPrice, y);
		doc.text('Thanh tien', colTotal, y, { align: 'right' });
		y += this.LINE_HEIGHT + 1;

		// ===== PRODUCT ROWS =====
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(this.FONT_SIZE_SMALL);

		for (const item of invoice.InvoiceDetails || []) {
			// Product name (full width)
			const productName = this.removeVietnameseDiacritics(item.ProductName || item.ProductCode || '-');
			const nameLines = doc.splitTextToSize(productName, this.CONTENT_WIDTH);
			doc.text(nameLines, this.MARGIN_LEFT, y);
			y += nameLines.length * this.LINE_HEIGHT;

			// Quantity | Unit Price | SubTotal
			const subTotal = (item.Quantity || 0) * (item.UnitPrice || 0);
			doc.text(`${item.Quantity}`, colSL, y);
			doc.text(this.formatNumber(item.UnitPrice), colPrice, y);
			doc.text(this.formatNumber(subTotal), colTotal, y, { align: 'right' });
			y += this.LINE_HEIGHT + 2;
		}

		// ===== SEPARATOR =====
		this.drawDashedLine(doc, y);
		y += 4;

		// ===== TOTAL =====
		doc.setFontSize(this.FONT_SIZE_BODY);
		
		// Subtotal
		doc.setFont('helvetica', 'normal');
		const subTotal = (invoice.TotalAmount ?? 0) - (invoice.ShippingFee ?? 0);
		doc.text('Cong tien hang', this.MARGIN_LEFT, y);
		doc.text(this.formatNumber(subTotal), colTotal, y, { align: 'right' });
		y += this.LINE_HEIGHT + 1.5;

		// Shipping / Pickup details
		if (invoice.ShippingType === 2) {
			doc.text('Nhan tai cua hang', this.MARGIN_LEFT, y);
			doc.text('0', colTotal, y, { align: 'right' });
			y += this.LINE_HEIGHT + 1.5;
			if (invoice.PickupTime) {
				doc.setFontSize(this.FONT_SIZE_SMALL);
				const pickupTimeClean = this.removeVietnameseDiacritics(invoice.PickupTime);
				doc.text(`Hen lay: ${pickupTimeClean}`, this.MARGIN_LEFT, y);
				y += this.LINE_HEIGHT + 1.5;
				doc.setFontSize(this.FONT_SIZE_BODY);
			}
		} else {
			if ((invoice.ShippingFee ?? 0) > 0) {
				doc.text('Phi van chuyen', this.MARGIN_LEFT, y);
				doc.text(this.formatNumber(invoice.ShippingFee), colTotal, y, { align: 'right' });
				y += this.LINE_HEIGHT + 1.5;
			}
		}

		// Divider before final total
		this.drawDashedLine(doc, y);
		y += 3;

		// Final total
		doc.setFont('helvetica', 'bold');
		doc.text('Tong thanh toan', this.MARGIN_LEFT, y);
		doc.text(this.formatNumber(invoice.TotalAmount), colTotal, y, { align: 'right' });
		y += this.LINE_HEIGHT + 3;

		// ===== FOOTER =====
		y += 2;
		doc.setFontSize(this.FONT_SIZE_FOOTER);
		doc.setFont('helvetica', 'italic');
		y = this.textCenter(doc, 'CAM ON QUY KHACH VA HEN GAP LAI', y);
		y += 2;

		if (storePhone) {
			doc.setFont('helvetica', 'normal');
			y = this.textCenter(doc, `Hotline: ${storePhone}`, y);
		}
	}

	// ===== HELPER METHODS =====

	private textCenter(doc: jsPDF, text: string, y: number): number {
		const center = this.PAGE_WIDTH_MM / 2;
		doc.text(text, center, y, { align: 'center' });
		return y + this.LINE_HEIGHT;
	}

	private textCenterWrap(doc: jsPDF, text: string, y: number): number {
		const lines = doc.splitTextToSize(text, this.CONTENT_WIDTH);
		const center = this.PAGE_WIDTH_MM / 2;
		for (const line of lines) {
			doc.text(line, center, y, { align: 'center' });
			y += this.LINE_HEIGHT;
		}
		return y;
	}

	private drawDashedLine(doc: jsPDF, y: number): void {
		const dashLength = 1.5;
		const gapLength = 1;
		let x = this.MARGIN_LEFT;
		const endX = this.PAGE_WIDTH_MM - this.MARGIN_RIGHT;
		doc.setLineWidth(0.2);
		while (x < endX) {
			const dashEnd = Math.min(x + dashLength, endX);
			doc.line(x, y, dashEnd, y);
			x = dashEnd + gapLength;
		}
	}

	private formatDate(date: string | Date | null | undefined): string {
		if (!date) return '-';
		const d = new Date(date);
		if (isNaN(d.getTime())) return '-';
		return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
	}

	private formatNumber(value: number | null | undefined): string {
		if (value == null || isNaN(value)) return '0';
		return new Intl.NumberFormat('vi-VN').format(value);
	}

	/**
	 * Remove Vietnamese diacritics for PDF rendering
	 * (jsPDF default fonts don't support Vietnamese characters)
	 */
	private removeVietnameseDiacritics(str: string): string {
		if (!str) return '';
		return str
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/đ/g, 'd')
			.replace(/Đ/g, 'D');
	}
}
