import * as XLSX from 'xlsx';
import fs from 'fs';
import { join } from 'path';

type Contact = {
  name: string;
  email: string;
  phone: string;
  department: string;
};

const CONTACT_COUNT = 100;
const GROUP_COUNT = 10;
const MIN_GROUP_SIZE = 2;
const MAX_GROUP_SIZE = 20;
const OUTPUT_DIRS = ['.', 'resources'];

const firstNames = [
  'Avery', 'Jordan', 'Taylor', 'Morgan', 'Dakota', 'Skyler', 'Riley', 'Sawyer', 'Elliot', 'Parker',
  'Sydney', 'Casey', 'Reese', 'Cameron', 'Rowan', 'Finley', 'Hayden', 'Kendall', 'Logan', 'Marley'
];

const lastNames = [
  'Reeves', 'Quinn', 'Harper', 'Bishop', 'Sloan', 'Mercer', 'Dalton', 'Kerr', 'Porter', 'Harrington',
  'Langley', 'Keaton', 'Forrester', 'Ellison', 'Granger', 'Hale', 'Kensington', 'Lennox', 'Monroe', 'Sinclair'
];

const departments = ['Operations', 'Intelligence', 'Logistics', 'Engineering', 'Analysis', 'Communications'];

const groupNames = [
  'Alpha Team',
  'Bravo Team',
  'Charlie Team',
  'Delta Team',
  'Echo Team',
  'Foxtrot Team',
  'Sierra Team',
  'Tango Team',
  'Vanguard',
  'Watchtower'
];

const randomItem = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const buildContacts = (): Contact[] => {
  const contacts: Contact[] = [];

  for (let i = 0; i < CONTACT_COUNT; i++) {
    const first = randomItem(firstNames);
    const last = randomItem(lastNames);
    const name = `${first} ${last}`;
    const email = `${first.toLowerCase()}.${last.toLowerCase()}${100 + i}@agency.net`;
    const phone = `+1-555-${String(1000 + i).padStart(4, '0')}`;
    const department = randomItem(departments);

    contacts.push({ name, email, phone, department });
  }

  return contacts;
};

const buildGroups = (emails: string[]): string[][] => {
  const groups: string[][] = [];
  const maxRows = MAX_GROUP_SIZE;

  // First row headers
  groups.push([...groupNames]);

  // Initialize rows for member placement
  for (let i = 0; i < maxRows; i++) {
    groups.push(new Array(groupNames.length).fill(''));
  }

  groupNames.forEach((groupName, colIndex) => {
    const memberCount = Math.floor(Math.random() * (MAX_GROUP_SIZE - MIN_GROUP_SIZE + 1)) + MIN_GROUP_SIZE;
    const selected = new Set<string>();

    while (selected.size < memberCount) {
      const email = randomItem(emails);
      selected.add(email);
    }

    Array.from(selected).forEach((email, rowIndex) => {
      groups[rowIndex + 1][colIndex] = email;
    });
  });

  return trimEmptyRows(groups);
};

const trimEmptyRows = (matrix: string[][]): string[][] => {
  let lastNonEmptyRow = 0;

  for (let row = 1; row < matrix.length; row++) {
    if (matrix[row].some(cell => cell && cell.trim())) {
      lastNonEmptyRow = row;
    }
  }

  return matrix.slice(0, lastNonEmptyRow + 1);
};

const writeContacts = (contacts: Contact[]) => {
  console.log('Generating Contacts...');
  const headers: (keyof Contact)[] = ['name', 'email', 'phone', 'department'];
  const worksheet = XLSX.utils.json_to_sheet(contacts, { header: headers });
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');

  OUTPUT_DIRS.forEach(dir => {
    fs.mkdirSync(dir, { recursive: true });
    const outputPath = join(dir, 'contacts.csv');
    XLSX.writeFile(workbook, outputPath, { bookType: 'csv' });
    console.log(`Contacts CSV written to ${outputPath}`);
  });
};

const writeGroups = (groupMatrix: string[][]) => {
  console.log('Generating Groups...');
  const worksheet = XLSX.utils.aoa_to_sheet(groupMatrix);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Groups');

  OUTPUT_DIRS.forEach(dir => {
    fs.mkdirSync(dir, { recursive: true });
    const outputPath = join(dir, 'groups.csv');
    XLSX.writeFile(workbook, outputPath, { bookType: 'csv' });
    console.log(`Groups CSV written to ${outputPath}`);
  });
};

const main = () => {
  try {
    if (groupNames.length !== GROUP_COUNT) {
      throw new Error(`Configured group count (${GROUP_COUNT}) does not match provided names (${groupNames.length}).`);
    }

    const contacts = buildContacts();
    const groupMatrix = buildGroups(contacts.map(contact => contact.email));

    writeContacts(contacts);
    writeGroups(groupMatrix);

    console.log('Dummy files generated successfully.');
  } catch (error) {
    console.error('Error generating files:', error);
  }
};

main();
