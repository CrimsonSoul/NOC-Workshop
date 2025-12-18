import { AppData, Contact } from '@shared/ipc';

const DUMMY_CONTACTS: Contact[] = [
    {
        name: "Sarah Connors",
        email: "sarah.connors@example.com",
        phone: "+1 (555) 123-4567",
        title: "Senior Director",
        _searchString: "sarah connors senior director",
        raw: {}
    },
    {
        name: "John Smith",
        email: "john.smith@example.com",
        phone: "+1 (555) 987-6543",
        title: "Product Manager",
        _searchString: "john smith product manager",
        raw: {}
    },
    {
        name: "Emily Davis",
        email: "emily.davis@example.com",
        phone: "+1 (555) 456-7890",
        title: "Developer",
        _searchString: "emily davis developer",
        raw: {}
    },
    {
        name: "Michael Brown",
        email: "michael.brown@example.com",
        phone: "+1 (555) 789-0123",
        title: "Designer",
        _searchString: "michael brown designer",
        raw: {}
    },
    {
        name: "Information Technology",
        email: "it.support@example.com",
        phone: "+1 (800) 555-0000",
        title: "Department",
        _searchString: "information technology department",
        raw: {}
    },
    {
        name: "Executive Team",
        email: "execs@example.com",
        phone: "",
        title: "Distribution List",
        _searchString: "executive team distribution list",
        raw: {}
    },
    {
        name: "Operations Central",
        email: "ops@example.com",
        phone: "+1 (555) 222-3333",
        title: "Ops Center",
        _searchString: "operations central ops center",
        raw: {}
    },
    {
        name: "Legal Department",
        email: "legal@example.com",
        phone: "+1 (555) 444-5555",
        title: "Legal",
        _searchString: "legal department",
        raw: {}
    },
    {
        name: "Dr. Alice Vance",
        email: "alice.vance@research.labs",
        phone: "+1 (555) 333-7777",
        title: "Lead Scientist",
        _searchString: "dr alice vance lead scientist",
        raw: {}
    },
    {
        name: "Barney Calhoun",
        email: "b.calhoun@security.mesa",
        phone: "+1 (555) 222-8888",
        title: "Security Officer",
        _searchString: "barney calhoun security officer",
        raw: {}
    },
    {
        name: "Gordon Freeman",
        email: "g.freeman@anomalous.materials",
        phone: "",
        title: "Research Associate",
        _searchString: "gordon freeman research associate",
        raw: {}
    }
];

export const DUMMY_DATA: AppData = {
    groups: {
        "Executive Leadership": [
            "sarah.connors@example.com",
            "john.smith@example.com"
        ],
        "Product Team": [
            "john.smith@example.com",
            "emily.davis@example.com",
            "michael.brown@example.com"
        ],
        "Engineering": [
            "emily.davis@example.com",
            "it.support@example.com",
            "alice.vance@research.labs",
            "g.freeman@anomalous.materials"
        ],
        "Design": [
            "michael.brown@example.com"
        ],
        "Security": [
            "b.calhoun@security.mesa"
        ],
        "All Hands": [
            "sarah.connors@example.com",
            "john.smith@example.com",
            "emily.davis@example.com",
            "michael.brown@example.com",
            "it.support@example.com",
            "execs@example.com",
            "ops@example.com",
            "legal@example.com",
            "alice.vance@research.labs",
            "b.calhoun@security.mesa",
            "g.freeman@anomalous.materials"
        ],
        "Urgent Response": [
            "ops@example.com",
            "b.calhoun@security.mesa"
        ]
    },
    contacts: DUMMY_CONTACTS,
    servers: [],
    lastUpdated: Date.now()
};
