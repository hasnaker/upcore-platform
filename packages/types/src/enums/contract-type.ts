import { z } from 'zod';

/** Turkish labor contract types. */
export const ContractType = {
  BELIRLI_SURELI: 'BELIRLI_SURELI',
  BELIRSIZ_SURELI: 'BELIRSIZ_SURELI',
  PART_TIME: 'PART_TIME',
  STAJYER: 'STAJYER',
  DANISMAN: 'DANISMAN',
  SOZLESMELI: 'SOZLESMELI',
} as const;
export type ContractType = (typeof ContractType)[keyof typeof ContractType];

export const ContractTypeSchema = z.enum([
  'BELIRLI_SURELI',
  'BELIRSIZ_SURELI',
  'PART_TIME',
  'STAJYER',
  'DANISMAN',
  'SOZLESMELI',
]);
