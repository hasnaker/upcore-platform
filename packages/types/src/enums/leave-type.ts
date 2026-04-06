import { z } from 'zod';

/**
 * Leave types (İzin türleri) per 4857 sayılı İş Kanunu.
 *
 *  YILLIK:    yıllık ücretli izin
 *  HASTALIK:  hastalık / sağlık izni
 *  MAZERET:   mazeret izni (ölüm, evlilik, taşınma, vb. dışında)
 *  DOGUM:     doğum izni (analık)
 *  BABALIK:   babalık izni (5 iş günü)
 *  EVLILIK:   evlilik izni (3 iş günü)
 *  OLUM:      ölüm izni (3 iş günü, 1. derece)
 *  UCRETSIZ:  ücretsiz izin
 */
export const LeaveType = {
  YILLIK: 'YILLIK',
  HASTALIK: 'HASTALIK',
  MAZERET: 'MAZERET',
  DOGUM: 'DOGUM',
  BABALIK: 'BABALIK',
  EVLILIK: 'EVLILIK',
  OLUM: 'OLUM',
  UCRETSIZ: 'UCRETSIZ',
} as const;
export type LeaveType = (typeof LeaveType)[keyof typeof LeaveType];

export const LeaveTypeSchema = z.enum([
  'YILLIK',
  'HASTALIK',
  'MAZERET',
  'DOGUM',
  'BABALIK',
  'EVLILIK',
  'OLUM',
  'UCRETSIZ',
]);

export const LeaveStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;
export type LeaveStatus = (typeof LeaveStatus)[keyof typeof LeaveStatus];
export const LeaveStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]);
