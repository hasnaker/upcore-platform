/**
 * Re-exports of Turkish-specific validators for use inside schema files.
 *
 * This module exists so `schemas/*` can import from a local path and keep
 * the dependency direction clean.
 */
export {
  TcknSchema,
  type Tckn,
  isValidTckn,
} from '../validators/tckn';
export {
  VknSchema,
  type Vkn,
  isValidVkn,
} from '../validators/vkn';
export {
  IbanTrSchema,
  type IbanTr,
  isValidTurkishIban,
} from '../validators/iban';
export {
  TurkishPhoneSchema,
  TurkishPostcodeSchema,
  type TurkishPhone,
  type TurkishPostcode,
  normalizeTurkishPhone,
  isValidTurkishPhone,
} from '../validators/phone';
