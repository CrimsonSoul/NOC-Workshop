import * as XLSX from 'xlsx';
import { join } from 'path';

const contacts = [
    { name: 'John Doe', email: 'john.doe@agency.net', phone: '+15550101', department: 'Ops' },
    { name: 'Jane Smith', email: 'jane.smith@agency.net', phone: '+15550102', department: 'Intel' },
    { name: 'Bob Jones', email: 'bob.jones@agency.net', phone: '+15550103', department: 'Logistics' }
];

const groups = [
    ['Alpha Team', 'Beta Team'],
    ['john.doe@agency.net', 'bob.jones@agency.net'],
    ['jane.smith@agency.net', '']
];

try {
    console.log('Generating Contacts...');
    const wbContacts = XLSX.utils.book_new();
    const wsContacts = XLSX.utils.json_to_sheet(contacts);
    XLSX.utils.book_append_sheet(wbContacts, wsContacts, 'Contacts');
    XLSX.writeFile(wbContacts, 'contacts.xlsx');
    console.log('Contacts generated.');

    console.log('Generating Groups...');
    const wbGroups = XLSX.utils.book_new();
    const wsGroups = XLSX.utils.aoa_to_sheet(groups);
    XLSX.utils.book_append_sheet(wbGroups, wsGroups, 'Groups');
    XLSX.writeFile(wbGroups, 'groups.xlsx');
    console.log('Groups generated.');

    console.log('Dummy files generated successfully.');
} catch (error) {
    console.error('Error generating files:', error);
}
