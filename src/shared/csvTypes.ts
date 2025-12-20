/**
 * CSV column definitions and type safety for CSV operations
 */

// Server CSV column constants
export const SERVER_COLUMNS = {
  NAME: 'Name',
  BUSINESS_AREA: 'Business Area',
  LOB: 'LOB',
  COMMENT: 'Comment',
  OWNER: 'Owner',
  IT_CONTACT: 'IT Contact',
  OS: 'OS'
} as const;

// Contact CSV column constants
export const CONTACT_COLUMNS = {
  NAME: 'Name',
  EMAIL: 'Email',
  PHONE: 'Phone',
  TITLE: 'Title'
} as const;

// On-Call CSV column constants
export const ONCALL_COLUMNS = {
  TEAM: 'Team',
  PRIMARY: 'Primary',
  BACKUP: 'Backup',
  LABEL: 'Label'
} as const;

// Standard headers for each CSV type
export const STD_SERVER_HEADERS = [
  SERVER_COLUMNS.NAME,
  SERVER_COLUMNS.BUSINESS_AREA,
  SERVER_COLUMNS.LOB,
  SERVER_COLUMNS.COMMENT,
  SERVER_COLUMNS.OWNER,
  SERVER_COLUMNS.IT_CONTACT,
  SERVER_COLUMNS.OS
] as const;

export const STD_CONTACT_HEADERS = [
  CONTACT_COLUMNS.NAME,
  CONTACT_COLUMNS.TITLE,
  CONTACT_COLUMNS.EMAIL,
  CONTACT_COLUMNS.PHONE
] as const;

export const STD_ONCALL_HEADERS = [
  ONCALL_COLUMNS.TEAM,
  ONCALL_COLUMNS.PRIMARY,
  ONCALL_COLUMNS.BACKUP,
  ONCALL_COLUMNS.LABEL
] as const;

// Column alias mappings for flexible header matching
export const SERVER_COLUMN_ALIASES = {
  name: ['name', 'vm-m', 'server name', 'vm name'],
  businessArea: ['business area', 'businessarea'],
  lob: ['lob', 'line of business'],
  comment: ['comment', 'comments', 'notes'],
  owner: ['owner', 'lob owner', 'lobowner'],
  contact: ['it contact', 'it tech support contact', 'it support', 'contact', 'tech support'],
  os: ['os type', 'server os', 'os']
} as const;

export const CONTACT_COLUMN_ALIASES = {
  name: ['name', 'full name'],
  email: ['email', 'e-mail'],
  phone: ['phone', 'phone number', 'mobile'],
  title: ['title', 'role', 'position', 'department', 'dept']
} as const;

// CSV parsing result types
export type CsvRow = string[];
export interface CsvData {
  headers: string[];
  rows: CsvRow[];
}

// Validation error types
export interface ValidationError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Import progress types
export interface ImportProgress {
  stage: 'reading' | 'validating' | 'processing' | 'writing' | 'complete';
  totalRows: number;
  processedRows: number;
  percentage: number;
  message: string;
}
