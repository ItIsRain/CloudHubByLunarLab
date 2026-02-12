import {
  User,
  Event,
  Hackathon,
  Team,
  Submission,
  Sponsor,
  Notification,
  BlogPost,
  PricingTier,
  Community,
  Speaker,
  Track,
  Prize,
  JudgingCriteria,
  Mentor,
  Certificate,
  Conversation,
  Message,
} from "./types";

// Helper function to generate dates
const addDays = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const subtractDays = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

// =====================================================
// Mock Users
// =====================================================
export const mockUsers: User[] = [
  {
    id: "user-1",
    email: "alex.chen@email.com",
    name: "Alex Chen",
    username: "alexchen",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
    bio: "Full-stack developer passionate about building products that matter. Love hackathons!",
    headline: "Senior Software Engineer @ TechCorp",
    location: "San Francisco, CA",
    website: "https://alexchen.dev",
    github: "alexchen",
    twitter: "alexchen_dev",
    linkedin: "alexchen",
    skills: ["React", "Node.js", "TypeScript", "Python", "AWS"],
    interests: ["AI/ML", "Web3", "DevTools"],
    roles: ["organizer", "attendee"],
    eventsAttended: 47,
    hackathonsParticipated: 12,
    projectsSubmitted: 8,
    wins: 3,
    createdAt: subtractDays(365),
    updatedAt: subtractDays(1),
  },
  {
    id: "user-2",
    email: "sarah.kim@email.com",
    name: "Sarah Kim",
    username: "sarahkim",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
    bio: "UX Designer and creative technologist. Making the web more beautiful, one pixel at a time.",
    headline: "Lead Product Designer @ DesignCo",
    location: "New York, NY",
    website: "https://sarahkim.design",
    twitter: "sarahkim_ux",
    linkedin: "sarahkimdesign",
    skills: ["Figma", "UI/UX", "Design Systems", "Prototyping", "User Research"],
    interests: ["Design", "Accessibility", "AI"],
    roles: ["attendee", "mentor"],
    eventsAttended: 32,
    hackathonsParticipated: 6,
    projectsSubmitted: 4,
    wins: 1,
    createdAt: subtractDays(200),
    updatedAt: subtractDays(2),
  },
  {
    id: "user-3",
    email: "marcus.johnson@email.com",
    name: "Marcus Johnson",
    username: "marcusj",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=marcus",
    bio: "AI researcher turned entrepreneur. Building the future of intelligent systems.",
    headline: "Founder & CEO @ AIStartup",
    location: "Austin, TX",
    github: "marcusjohnson",
    twitter: "marcus_ai",
    linkedin: "marcusjohnson",
    skills: ["Machine Learning", "Python", "TensorFlow", "PyTorch", "NLP"],
    interests: ["AI/ML", "Startups", "Research"],
    roles: ["organizer", "judge", "mentor"],
    eventsAttended: 89,
    hackathonsParticipated: 24,
    projectsSubmitted: 18,
    wins: 7,
    createdAt: subtractDays(500),
    updatedAt: subtractDays(0),
  },
  {
    id: "user-4",
    email: "emma.wilson@email.com",
    name: "Emma Wilson",
    username: "emmaw",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma",
    bio: "Blockchain enthusiast and smart contract developer. Building on Ethereum and Solana.",
    headline: "Web3 Engineer @ CryptoDAO",
    location: "Miami, FL",
    github: "emmawilson",
    twitter: "emma_web3",
    skills: ["Solidity", "Rust", "Web3.js", "Smart Contracts", "DeFi"],
    interests: ["Web3", "DeFi", "NFTs"],
    roles: ["attendee"],
    eventsAttended: 28,
    hackathonsParticipated: 15,
    projectsSubmitted: 12,
    wins: 4,
    createdAt: subtractDays(180),
    updatedAt: subtractDays(5),
  },
  {
    id: "user-5",
    email: "david.park@email.com",
    name: "David Park",
    username: "davidpark",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=david",
    bio: "DevOps engineer with a passion for automation and cloud infrastructure.",
    headline: "Staff DevOps Engineer @ CloudScale",
    location: "Seattle, WA",
    github: "davidpark",
    linkedin: "davidpark-devops",
    skills: ["Kubernetes", "Docker", "AWS", "Terraform", "CI/CD"],
    interests: ["DevOps", "Cloud", "Automation"],
    roles: ["attendee", "mentor"],
    eventsAttended: 41,
    hackathonsParticipated: 8,
    projectsSubmitted: 5,
    wins: 2,
    createdAt: subtractDays(300),
    updatedAt: subtractDays(3),
  },
];

// Generate more users
for (let i = 6; i <= 50; i++) {
  const names = [
    "James Smith", "Maria Garcia", "Robert Brown", "Linda Martinez", "Michael Davis",
    "Jennifer Anderson", "William Taylor", "Elizabeth Thomas", "Richard Jackson", "Susan White",
    "Joseph Harris", "Margaret Martin", "Charles Thompson", "Dorothy Moore", "Thomas Lee",
    "Nancy Clark", "Christopher Lewis", "Karen Robinson", "Daniel Walker", "Betty Hall",
    "Matthew Young", "Helen King", "Anthony Wright", "Sandra Scott", "Mark Green",
    "Ashley Adams", "Steven Baker", "Kimberly Nelson", "Paul Carter", "Emily Mitchell",
    "Andrew Perez", "Donna Roberts", "Joshua Turner", "Michelle Phillips", "Kenneth Campbell",
    "Carol Parker", "Kevin Evans", "Amanda Edwards", "Brian Collins", "Melissa Stewart",
    "George Sanchez", "Deborah Morris", "Edward Rogers", "Stephanie Reed", "Ronald Cook",
  ];
  const name = names[(i - 6) % names.length];
  const username = name.toLowerCase().replace(" ", "");

  mockUsers.push({
    id: `user-${i}`,
    email: `${username}@email.com`,
    name,
    username,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    bio: `Passionate developer and tech enthusiast. Love building great products.`,
    headline: `Software Engineer`,
    location: "Remote",
    skills: ["JavaScript", "React", "Node.js"],
    interests: ["Tech", "Startups"],
    roles: ["attendee"],
    eventsAttended: 5 + (i * 7) % 45,
    hackathonsParticipated: 1 + (i * 3) % 14,
    projectsSubmitted: (i * 2) % 10,
    wins: i % 3,
    createdAt: subtractDays(30 + (i * 17) % 335),
    updatedAt: subtractDays((i * 3) % 30),
  });
}

// =====================================================
// Mock Speakers
// =====================================================
export const mockSpeakers: Speaker[] = [
  {
    id: "speaker-1",
    name: "Dr. Sarah Mitchell",
    title: "Chief AI Officer",
    company: "TechGiant Inc.",
    bio: "Leading AI research for over 15 years. PhD from MIT. Author of 'AI for Everyone'.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=drsarah",
    twitter: "drsarahmitchell",
    linkedin: "sarahmitchell",
  },
  {
    id: "speaker-2",
    name: "James Rodriguez",
    title: "VP of Engineering",
    company: "Startupify",
    bio: "Building engineering teams from 5 to 500. Previously at Google and Meta.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=james",
    twitter: "jamesrod",
    linkedin: "jamesrodriguez",
  },
  {
    id: "speaker-3",
    name: "Lisa Wang",
    title: "Founder & CEO",
    company: "DesignFirst",
    bio: "Serial entrepreneur. Forbes 30 under 30. Passionate about design thinking.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=lisa",
    twitter: "lisawang",
    linkedin: "lisawangceo",
  },
  {
    id: "speaker-4",
    name: "Michael Torres",
    title: "Blockchain Architect",
    company: "Web3Labs",
    bio: "Core contributor to Ethereum. Building the decentralized future.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael",
    twitter: "michaeltorres",
  },
  {
    id: "speaker-5",
    name: "Emily Chen",
    title: "Product Lead",
    company: "MegaCorp",
    bio: "10+ years in product management. Expert in user-centered design.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emilyc",
    linkedin: "emilychenpm",
  },
];

// =====================================================
// Mock Sponsors
// =====================================================
export const mockSponsors: Sponsor[] = [
  {
    id: "sponsor-1",
    name: "TechGiant",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=techgiant",
    website: "https://techgiant.com",
    tier: "platinum",
    description: "Leading cloud infrastructure provider powering millions of applications worldwide.",
  },
  {
    id: "sponsor-2",
    name: "InnovateLabs",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=innovate",
    website: "https://innovatelabs.io",
    tier: "platinum",
    description: "AI-powered development tools for the modern developer.",
  },
  {
    id: "sponsor-3",
    name: "CloudScale",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=cloudscale",
    website: "https://cloudscale.dev",
    tier: "gold",
    description: "Enterprise-grade cloud solutions.",
  },
  {
    id: "sponsor-4",
    name: "DevTools Pro",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=devtools",
    website: "https://devtoolspro.com",
    tier: "gold",
    description: "Developer productivity tools and integrations.",
  },
  {
    id: "sponsor-5",
    name: "StartupHub",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=startuphub",
    website: "https://startuphub.co",
    tier: "silver",
    description: "Accelerating startups from idea to IPO.",
  },
  {
    id: "sponsor-6",
    name: "CodeCraft",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=codecraft",
    website: "https://codecraft.io",
    tier: "silver",
    description: "Open source tools and education.",
  },
  {
    id: "sponsor-7",
    name: "ByteStream",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=bytestream",
    website: "https://bytestream.tech",
    tier: "bronze",
    description: "Real-time data streaming platform.",
  },
  {
    id: "sponsor-8",
    name: "PixelPerfect",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=pixelperfect",
    website: "https://pixelperfect.design",
    tier: "bronze",
    description: "Design tools for creative professionals.",
  },
  {
    id: "sponsor-9",
    name: "CryptoDAO",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=cryptodao",
    website: "https://cryptodao.finance",
    tier: "community",
    description: "Decentralized finance for everyone.",
  },
  {
    id: "sponsor-10",
    name: "OpenSource Foundation",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=opensource",
    website: "https://opensourcefoundation.org",
    tier: "community",
    description: "Supporting open source development worldwide.",
  },
];

// =====================================================
// Mock Events
// =====================================================
export const mockEvents: Event[] = [
  {
    id: "event-1",
    slug: "ai-summit-2024",
    title: "AI Summit 2024",
    tagline: "The Future of Artificial Intelligence",
    description: `Join us for the most anticipated AI conference of the year! AI Summit 2024 brings together industry leaders, researchers, and innovators to explore the cutting edge of artificial intelligence.

## What to Expect

- **Keynote Sessions** from world-renowned AI researchers
- **Hands-on Workshops** covering the latest frameworks and tools
- **Networking Opportunities** with thousands of AI professionals
- **Demo Zone** showcasing breakthrough AI applications

Whether you're a seasoned AI practitioner or just starting your journey, this summit has something for everyone.`,
    coverImage: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=600&fit=crop",
    category: "ai-ml",
    tags: ["AI", "Machine Learning", "Deep Learning", "NLP", "Computer Vision"],
    type: "hybrid",
    status: "published",
    location: {
      type: "hybrid",
      address: "Moscone Center",
      city: "San Francisco",
      country: "USA",
      coordinates: { lat: 37.7849, lng: -122.4004 },
      platform: "Zoom",
      meetingUrl: "https://zoom.us/j/123456789",
    },
    startDate: addDays(30),
    endDate: addDays(32),
    timezone: "America/Los_Angeles",
    tickets: [
      {
        id: "ticket-1",
        name: "Early Bird",
        description: "Limited availability! Get your tickets at a discounted price.",
        price: 299,
        currency: "USD",
        quantity: 500,
        sold: 423,
        maxPerOrder: 5,
        salesEnd: addDays(15),
      },
      {
        id: "ticket-2",
        name: "General Admission",
        description: "Full access to all sessions and networking events.",
        price: 499,
        currency: "USD",
        quantity: 2000,
        sold: 847,
        maxPerOrder: 10,
      },
      {
        id: "ticket-3",
        name: "VIP Pass",
        description: "Premium experience with exclusive speaker meetups and priority seating.",
        price: 999,
        currency: "USD",
        quantity: 100,
        sold: 67,
        maxPerOrder: 2,
      },
    ],
    speakers: mockSpeakers.slice(0, 3),
    agenda: [
      {
        id: "session-1",
        title: "Opening Keynote: The State of AI",
        description: "An overview of the current AI landscape and where we're headed.",
        startTime: addDays(30) + "T09:00:00",
        endTime: addDays(30) + "T10:00:00",
        room: "Main Hall",
        speakers: [mockSpeakers[0]],
        type: "keynote",
      },
      {
        id: "session-2",
        title: "Coffee Break & Networking",
        startTime: addDays(30) + "T10:00:00",
        endTime: addDays(30) + "T10:30:00",
        type: "break",
        speakers: [],
      },
      {
        id: "session-3",
        title: "Building Production-Ready ML Systems",
        description: "Learn best practices for deploying ML models at scale.",
        startTime: addDays(30) + "T10:30:00",
        endTime: addDays(30) + "T12:00:00",
        room: "Workshop Room A",
        speakers: [mockSpeakers[1]],
        type: "workshop",
      },
    ],
    organizer: mockUsers[2],
    organizerId: mockUsers[2].id,
    capacity: 2600,
    registrationCount: 1337,
    isBookmarked: false,
    isFeatured: true,
    createdAt: subtractDays(60),
    updatedAt: subtractDays(1),
  },
  {
    id: "event-2",
    slug: "react-meetup-sf",
    title: "React Developers Meetup",
    tagline: "Monthly gathering of React enthusiasts",
    description: `Join fellow React developers for our monthly meetup! This month we're diving into React Server Components and the latest features in React 19.

## Agenda

1. **Lightning Talks** - 5-minute presentations from community members
2. **Deep Dive** - React Server Components in Production
3. **Q&A Panel** - Ask our expert panel anything
4. **Networking** - Pizza and drinks provided!

All skill levels welcome. Bring your questions and enthusiasm!`,
    coverImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=600&fit=crop",
    category: "tech",
    tags: ["React", "JavaScript", "Frontend", "Web Development"],
    type: "in-person",
    status: "published",
    location: {
      type: "in-person",
      address: "GitHub HQ",
      city: "San Francisco",
      country: "USA",
      coordinates: { lat: 37.7822, lng: -122.3912 },
    },
    startDate: addDays(7),
    endDate: addDays(7),
    timezone: "America/Los_Angeles",
    tickets: [
      {
        id: "ticket-4",
        name: "Free Registration",
        price: 0,
        currency: "USD",
        quantity: 150,
        sold: 98,
        maxPerOrder: 2,
      },
    ],
    speakers: mockSpeakers.slice(1, 3),
    agenda: [],
    organizer: mockUsers[0],
    organizerId: mockUsers[0].id,
    capacity: 150,
    registrationCount: 98,
    isBookmarked: true,
    isFeatured: false,
    createdAt: subtractDays(30),
    updatedAt: subtractDays(2),
  },
  {
    id: "event-3",
    slug: "web3-workshop",
    title: "Web3 Development Workshop",
    tagline: "Build your first dApp in 3 hours",
    description: `Ready to dive into Web3 development? This hands-on workshop will take you from zero to deploying your first decentralized application.

## What You'll Learn

- Solidity fundamentals
- Smart contract development
- Frontend integration with ethers.js
- Deployment to testnets

**Prerequisites:** Basic JavaScript knowledge required. No blockchain experience needed!

Laptops required. All software and tesnet ETH will be provided.`,
    coverImage: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200&h=600&fit=crop",
    category: "web3",
    tags: ["Web3", "Blockchain", "Ethereum", "Solidity", "dApps"],
    type: "online",
    status: "published",
    location: {
      type: "online",
      platform: "Discord",
      meetingUrl: "https://discord.gg/web3workshop",
    },
    startDate: addDays(14),
    endDate: addDays(14),
    timezone: "America/New_York",
    tickets: [
      {
        id: "ticket-5",
        name: "Workshop Pass",
        description: "Includes all materials and recording access.",
        price: 49,
        currency: "USD",
        quantity: 100,
        sold: 67,
        maxPerOrder: 1,
      },
    ],
    speakers: [mockSpeakers[3]],
    agenda: [],
    organizer: mockUsers[3],
    organizerId: mockUsers[3].id,
    capacity: 100,
    registrationCount: 67,
    isBookmarked: false,
    isFeatured: true,
    createdAt: subtractDays(20),
    updatedAt: subtractDays(3),
  },
  {
    id: "event-4",
    slug: "design-systems-conf",
    title: "Design Systems Conference",
    tagline: "Scale your design with systems thinking",
    description: `The premier conference for design systems practitioners. Join us for two days of talks, workshops, and networking focused on building and scaling design systems.

Featured topics include component libraries, design tokens, documentation, and cross-team collaboration.`,
    coverImage: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1200&h=600&fit=crop",
    category: "design",
    tags: ["Design Systems", "UI/UX", "Components", "Figma"],
    type: "in-person",
    status: "published",
    location: {
      type: "in-person",
      address: "The Design Center",
      city: "New York",
      country: "USA",
    },
    startDate: addDays(45),
    endDate: addDays(46),
    timezone: "America/New_York",
    tickets: [
      {
        id: "ticket-6",
        name: "Conference Pass",
        price: 399,
        currency: "USD",
        quantity: 400,
        sold: 289,
        maxPerOrder: 4,
      },
    ],
    speakers: mockSpeakers.slice(2, 5),
    agenda: [],
    organizer: mockUsers[1],
    organizerId: mockUsers[1].id,
    capacity: 400,
    registrationCount: 289,
    isFeatured: true,
    createdAt: subtractDays(90),
    updatedAt: subtractDays(5),
  },
  {
    id: "event-5",
    slug: "startup-pitch-night",
    title: "Startup Pitch Night",
    tagline: "10 startups. 3 minutes. $50K in prizes.",
    description: `Watch 10 pre-selected startups pitch their ideas to a panel of investors and industry experts. Network with founders, investors, and fellow entrepreneurs.

Top 3 startups will receive funding and mentorship opportunities.`,
    coverImage: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=600&fit=crop",
    category: "business",
    tags: ["Startups", "Pitching", "Investors", "Entrepreneurship"],
    type: "in-person",
    status: "published",
    location: {
      type: "in-person",
      address: "WeWork Embarcadero",
      city: "San Francisco",
      country: "USA",
    },
    startDate: addDays(10),
    endDate: addDays(10),
    timezone: "America/Los_Angeles",
    tickets: [
      {
        id: "ticket-7",
        name: "General Admission",
        price: 25,
        currency: "USD",
        quantity: 200,
        sold: 156,
        maxPerOrder: 3,
      },
    ],
    speakers: [],
    agenda: [],
    organizer: mockUsers[2],
    organizerId: mockUsers[2].id,
    capacity: 200,
    registrationCount: 156,
    isFeatured: false,
    createdAt: subtractDays(40),
    updatedAt: subtractDays(1),
  },
];

// Generate more events
const eventTemplates = [
  { title: "DevOps Day", category: "tech" as const, type: "hybrid" as const },
  { title: "UX Research Bootcamp", category: "design" as const, type: "online" as const },
  { title: "Cloud Architecture Summit", category: "tech" as const, type: "in-person" as const },
  { title: "Product Management Masterclass", category: "business" as const, type: "online" as const },
  { title: "Data Science Workshop", category: "ai-ml" as const, type: "hybrid" as const },
  { title: "Mobile Dev Conference", category: "tech" as const, type: "in-person" as const },
  { title: "Cybersecurity Forum", category: "tech" as const, type: "hybrid" as const },
  { title: "Creative Coding Night", category: "design" as const, type: "in-person" as const },
  { title: "Open Source Summit", category: "tech" as const, type: "online" as const },
  { title: "FinTech Meetup", category: "business" as const, type: "in-person" as const },
  { title: "Healthcare Tech Conference", category: "health" as const, type: "hybrid" as const },
  { title: "Music & Code", category: "music" as const, type: "in-person" as const },
  { title: "Women in Tech Summit", category: "networking" as const, type: "hybrid" as const },
  { title: "API Design Workshop", category: "tech" as const, type: "online" as const },
  { title: "Startup Weekend", category: "business" as const, type: "in-person" as const },
];

for (let i = 6; i <= 20; i++) {
  const template = eventTemplates[(i - 6) % eventTemplates.length];
  mockEvents.push({
    id: `event-${i}`,
    slug: `${template.title.toLowerCase().replace(/\s+/g, "-")}-${i}`,
    title: template.title,
    tagline: `Join us for ${template.title}`,
    description: `Experience the best of ${template.title}. Network with peers, learn from experts, and level up your skills.`,
    coverImage: `https://images.unsplash.com/photo-${1540575467063 + i * 1000}-178a50c2df87?w=1200&h=600&fit=crop`,
    category: template.category,
    tags: [template.category, "networking", "learning"],
    type: template.type,
    status: "published",
    location: {
      type: template.type,
      city: ["San Francisco", "New York", "Austin", "Seattle", "Los Angeles"][i % 5],
      country: "USA",
    },
    startDate: addDays(i * 5),
    endDate: addDays(i * 5 + 1),
    timezone: "America/Los_Angeles",
    tickets: [
      {
        id: `ticket-${i}`,
        name: "General Admission",
        price: 50 + (i * 17) % 200,
        currency: "USD",
        quantity: 200,
        sold: 50 + (i * 13) % 100,
        maxPerOrder: 4,
      },
    ],
    speakers: [],
    agenda: [],
    organizer: mockUsers[i % 5],
    organizerId: mockUsers[i % 5].id,
    capacity: 200,
    registrationCount: 50 + (i * 11) % 100,
    isFeatured: i % 4 === 0,
    createdAt: subtractDays(i * 10),
    updatedAt: subtractDays(i),
  });
}

// =====================================================
// Mock Tracks & Prizes
// =====================================================
const createTracks = (): Track[] => [
  {
    id: "track-1",
    name: "AI/ML Innovation",
    description: "Build applications leveraging artificial intelligence and machine learning to solve real-world problems.",
    icon: "brain",
    sponsor: mockSponsors[0],
    prizes: [
      { id: "prize-t1-1", name: "Track Winner", place: 1, value: 5000, currency: "USD", type: "cash" },
      { id: "prize-t1-2", name: "Runner Up", place: 2, value: 2500, currency: "USD", type: "cash" },
    ],
    requirements: ["Must use at least one ML model", "Demo must include live predictions"],
    suggestedTech: ["TensorFlow", "PyTorch", "OpenAI API", "Hugging Face"],
  },
  {
    id: "track-2",
    name: "Web3 & Blockchain",
    description: "Create decentralized applications, smart contracts, or blockchain-based solutions.",
    icon: "link",
    sponsor: mockSponsors[1],
    prizes: [
      { id: "prize-t2-1", name: "Track Winner", place: 1, value: 5000, currency: "USD", type: "cash" },
      { id: "prize-t2-2", name: "Runner Up", place: 2, value: 2500, currency: "USD", type: "cash" },
    ],
    requirements: ["Must deploy to a testnet or mainnet", "Include transaction functionality"],
    suggestedTech: ["Solidity", "Ethereum", "Solana", "IPFS"],
  },
  {
    id: "track-3",
    name: "Developer Tools",
    description: "Build tools that make developers' lives easier - from CLI tools to IDE extensions.",
    icon: "wrench",
    sponsor: mockSponsors[2],
    prizes: [
      { id: "prize-t3-1", name: "Track Winner", place: 1, value: 3000, currency: "USD", type: "cash" },
      { id: "prize-t3-2", name: "Runner Up", place: 2, value: 1500, currency: "USD", type: "cash" },
    ],
    suggestedTech: ["VS Code API", "GitHub Actions", "npm/yarn", "Docker"],
  },
  {
    id: "track-4",
    name: "Social Impact",
    description: "Create solutions that address social challenges and make a positive impact on communities.",
    icon: "heart",
    prizes: [
      { id: "prize-t4-1", name: "Track Winner", place: 1, value: 3000, currency: "USD", type: "cash" },
    ],
    requirements: ["Must address a real social issue", "Include plan for sustainability"],
  },
];

const createJudgingCriteria = (): JudgingCriteria[] => [
  {
    id: "criteria-1",
    name: "Innovation",
    description: "How novel and creative is the solution?",
    weight: 25,
    maxScore: 10,
  },
  {
    id: "criteria-2",
    name: "Technical Execution",
    description: "Quality of code, architecture, and implementation.",
    weight: 25,
    maxScore: 10,
  },
  {
    id: "criteria-3",
    name: "Impact & Usefulness",
    description: "How well does it solve the problem? Is it useful?",
    weight: 25,
    maxScore: 10,
  },
  {
    id: "criteria-4",
    name: "Presentation & Demo",
    description: "Quality of pitch and demonstration.",
    weight: 15,
    maxScore: 10,
  },
  {
    id: "criteria-5",
    name: "Design & UX",
    description: "User interface and overall user experience.",
    weight: 10,
    maxScore: 10,
  },
];

// =====================================================
// Mock Hackathons
// =====================================================
export const mockHackathons: Hackathon[] = [
  {
    id: "hack-1",
    slug: "buildai-2024",
    name: "BuildAI 2024",
    tagline: "48 hours to build the future of AI",
    description: `BuildAI is the premier AI hackathon bringing together developers, designers, and innovators from around the world. Over 48 intense hours, teams will compete to build groundbreaking AI applications.

## Why Participate?

- **$50,000+ in prizes** across multiple tracks
- **World-class mentors** from top tech companies
- **Networking** with fellow builders and investors
- **Workshops** on cutting-edge AI technologies
- **Job opportunities** with our sponsor companies

Whether you're an AI expert or just getting started, BuildAI welcomes all skill levels. Form a team or join as an individual and we'll help you find teammates!`,
    coverImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=600&fit=crop",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=buildai",
    category: "ai-ml",
    tags: ["AI", "Machine Learning", "LLM", "Computer Vision", "NLP"],
    status: "registration-open",
    type: "hybrid",
    location: {
      type: "hybrid",
      address: "Tech Hub SF",
      city: "San Francisco",
      country: "USA",
      platform: "Discord",
    },
    registrationStart: subtractDays(30),
    registrationEnd: addDays(14),
    hackingStart: addDays(21),
    hackingEnd: addDays(23),
    submissionDeadline: addDays(23),
    judgingStart: addDays(24),
    judgingEnd: addDays(26),
    winnersAnnouncement: addDays(28),
    tracks: createTracks(),
    prizes: [
      { id: "prize-1", name: "Grand Prize", place: 1, value: 15000, currency: "USD", type: "cash", description: "The best overall project" },
      { id: "prize-2", name: "2nd Place", place: 2, value: 10000, currency: "USD", type: "cash" },
      { id: "prize-3", name: "3rd Place", place: 3, value: 5000, currency: "USD", type: "cash" },
      { id: "prize-4", name: "Best UI/UX", place: "special", value: 2500, currency: "USD", type: "cash" },
      { id: "prize-5", name: "Most Innovative", place: "special", value: 2500, currency: "USD", type: "cash" },
      { id: "prize-6", name: "Community Choice", place: "special", value: 1000, currency: "USD", type: "cash" },
    ],
    sponsors: mockSponsors.slice(0, 6),
    mentors: [
      {
        id: "mentor-1",
        user: mockUsers[2],
        expertise: ["Machine Learning", "Python", "TensorFlow"],
        availability: [
          { id: "slot-1", date: addDays(21), startTime: "10:00", endTime: "11:00", isBooked: false },
          { id: "slot-2", date: addDays(21), startTime: "14:00", endTime: "15:00", isBooked: true, bookedBy: "user-1" },
          { id: "slot-3", date: addDays(22), startTime: "10:00", endTime: "11:00", isBooked: false },
        ],
        bio: "AI researcher with 15+ years of experience. Happy to help with ML architecture and model optimization.",
      },
      {
        id: "mentor-2",
        user: mockUsers[1],
        expertise: ["UI/UX", "Design Systems", "Figma"],
        availability: [
          { id: "slot-4", date: addDays(21), startTime: "11:00", endTime: "12:00", isBooked: false },
          { id: "slot-5", date: addDays(22), startTime: "13:00", endTime: "14:00", isBooked: false },
        ],
        bio: "Lead designer helping teams create polished, user-friendly interfaces.",
      },
      {
        id: "mentor-3",
        user: mockUsers[4],
        expertise: ["DevOps", "Cloud", "Docker", "Kubernetes"],
        availability: [
          { id: "slot-6", date: addDays(22), startTime: "09:00", endTime: "10:00", isBooked: false },
          { id: "slot-7", date: addDays(22), startTime: "15:00", endTime: "16:00", isBooked: true, bookedBy: "user-3" },
        ],
        bio: "DevOps engineer who can help you deploy and scale your hackathon project.",
      },
    ],
    judges: mockUsers.slice(2, 5),
    judgingCriteria: createJudgingCriteria(),
    rules: `# Rules

1. Teams must consist of 1-4 members
2. All code must be written during the hackathon
3. You may use open source libraries and APIs
4. Projects must be original work
5. You must submit before the deadline
6. Be respectful to all participants and mentors`,
    eligibility: [
      "Must be 18 years or older",
      "Open to all skill levels",
      "No prior hackathon experience required",
    ],
    minTeamSize: 1,
    maxTeamSize: 4,
    allowSolo: true,
    organizer: mockUsers[2],
    organizerId: mockUsers[2].id,
    participantCount: 847,
    teamCount: 234,
    submissionCount: 0,
    totalPrizePool: 50000,
    isBookmarked: true,
    isFeatured: true,
    createdAt: subtractDays(60),
    updatedAt: subtractDays(1),
  },
  {
    id: "hack-2",
    slug: "ethglobal-sf",
    name: "ETHGlobal San Francisco",
    tagline: "Build the future of Web3",
    description: `The world's largest Ethereum hackathon comes to San Francisco! Join 2000+ hackers for a weekend of building, learning, and shipping.

Over $100,000 in prizes from leading Web3 protocols. Free food, swag, and workshops included.`,
    coverImage: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200&h=600&fit=crop",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=ethglobal",
    category: "web3",
    tags: ["Ethereum", "Web3", "DeFi", "NFT", "Smart Contracts"],
    status: "hacking",
    type: "in-person",
    location: {
      type: "in-person",
      address: "Pier 48",
      city: "San Francisco",
      country: "USA",
    },
    registrationStart: subtractDays(60),
    registrationEnd: subtractDays(7),
    hackingStart: subtractDays(1),
    hackingEnd: addDays(1),
    submissionDeadline: addDays(1),
    judgingStart: addDays(2),
    judgingEnd: addDays(3),
    winnersAnnouncement: addDays(3),
    tracks: createTracks().slice(1, 3),
    prizes: [
      { id: "eth-prize-1", name: "Grand Prize", place: 1, value: 25000, currency: "USD", type: "cash" },
      { id: "eth-prize-2", name: "2nd Place", place: 2, value: 15000, currency: "USD", type: "cash" },
      { id: "eth-prize-3", name: "3rd Place", place: 3, value: 10000, currency: "USD", type: "cash" },
    ],
    sponsors: mockSponsors.filter(s => s.tier === "platinum" || s.tier === "gold"),
    mentors: [
      {
        id: "mentor-4",
        user: mockUsers[3],
        expertise: ["Solidity", "Web3", "Smart Contracts", "DeFi"],
        availability: [
          { id: "slot-8", date: addDays(0), startTime: "10:00", endTime: "11:00", isBooked: false },
          { id: "slot-9", date: addDays(0), startTime: "16:00", endTime: "17:00", isBooked: false },
        ],
        bio: "Web3 engineer with deep expertise in Solidity and smart contract security.",
      },
      {
        id: "mentor-5",
        user: mockUsers[0],
        expertise: ["React", "TypeScript", "Full-Stack"],
        availability: [
          { id: "slot-10", date: addDays(0), startTime: "11:00", endTime: "12:00", isBooked: true, bookedBy: "user-4" },
          { id: "slot-11", date: addDays(1), startTime: "09:00", endTime: "10:00", isBooked: false },
        ],
        bio: "Full-stack developer helping teams build polished frontends for their dApps.",
      },
      {
        id: "mentor-6",
        user: mockUsers[4],
        expertise: ["DevOps", "AWS", "Infrastructure"],
        availability: [
          { id: "slot-12", date: addDays(1), startTime: "14:00", endTime: "15:00", isBooked: false },
        ],
        bio: "Infrastructure specialist for deploying and scaling Web3 projects.",
      },
    ],
    judges: mockUsers.slice(3, 6),
    judgingCriteria: createJudgingCriteria(),
    rules: "Standard ETHGlobal rules apply. Check website for full details.",
    eligibility: ["Must be 18+", "Open worldwide"],
    minTeamSize: 1,
    maxTeamSize: 5,
    allowSolo: true,
    organizer: mockUsers[3],
    organizerId: mockUsers[3].id,
    participantCount: 1847,
    teamCount: 412,
    submissionCount: 156,
    totalPrizePool: 100000,
    isFeatured: true,
    createdAt: subtractDays(90),
    updatedAt: subtractDays(0),
  },
  {
    id: "hack-3",
    slug: "climate-hack",
    name: "Climate Hack 2024",
    tagline: "Code for a sustainable future",
    description: `Use technology to tackle climate change. Build solutions for carbon tracking, renewable energy, sustainable agriculture, or environmental monitoring.

Open to developers, designers, scientists, and activists. $25,000 in prizes plus incubation opportunities for winning teams.`,
    coverImage: "https://images.unsplash.com/photo-1569163139599-0f4517e36f31?w=1200&h=600&fit=crop",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=climatehack",
    category: "tech",
    tags: ["Climate", "Sustainability", "GreenTech", "Environment"],
    status: "completed",
    type: "online",
    location: {
      type: "online",
      platform: "Gather.town",
    },
    registrationStart: subtractDays(120),
    registrationEnd: subtractDays(60),
    hackingStart: subtractDays(50),
    hackingEnd: subtractDays(48),
    submissionDeadline: subtractDays(48),
    judgingStart: subtractDays(45),
    judgingEnd: subtractDays(40),
    winnersAnnouncement: subtractDays(35),
    tracks: [createTracks()[3]],
    prizes: [
      { id: "climate-prize-1", name: "Grand Prize", place: 1, value: 10000, currency: "USD", type: "cash" },
      { id: "climate-prize-2", name: "2nd Place", place: 2, value: 7500, currency: "USD", type: "cash" },
      { id: "climate-prize-3", name: "3rd Place", place: 3, value: 5000, currency: "USD", type: "cash" },
      { id: "climate-prize-4", name: "Incubation", place: "special", value: 0, currency: "USD", type: "incubation", description: "3-month incubation program" },
    ],
    sponsors: mockSponsors.slice(4, 8),
    mentors: [],
    judges: mockUsers.slice(1, 4),
    judgingCriteria: createJudgingCriteria(),
    rules: "Focus on environmental impact. Open source encouraged.",
    eligibility: ["Open to all", "Teams or individuals"],
    minTeamSize: 1,
    maxTeamSize: 6,
    allowSolo: true,
    organizer: mockUsers[0],
    organizerId: mockUsers[0].id,
    participantCount: 523,
    teamCount: 134,
    submissionCount: 89,
    totalPrizePool: 25000,
    isFeatured: false,
    createdAt: subtractDays(150),
    updatedAt: subtractDays(35),
  },
];

// Generate more hackathons
const hackTemplates = [
  { name: "DeFi Builders", category: "web3" as const, status: "registration-open" as const },
  { name: "Health Tech Challenge", category: "health" as const, status: "judging" as const },
  { name: "EdTech Innovation", category: "tech" as const, status: "registration-open" as const },
  { name: "Open Source Fest", category: "tech" as const, status: "submission" as const },
  { name: "Gaming & Metaverse", category: "tech" as const, status: "registration-open" as const },
  { name: "FinTech Sprint", category: "business" as const, status: "completed" as const },
  { name: "AI for Good", category: "ai-ml" as const, status: "hacking" as const },
];

for (let i = 4; i <= 10; i++) {
  const template = hackTemplates[(i - 4) % hackTemplates.length];
  mockHackathons.push({
    id: `hack-${i}`,
    slug: `${template.name.toLowerCase().replace(/\s+/g, "-")}-${i}`,
    name: template.name,
    tagline: `Join the ${template.name} hackathon`,
    description: `An exciting hackathon focused on ${template.name}. Build, learn, and win prizes!`,
    coverImage: `https://images.unsplash.com/photo-${1677442136019 + i * 100000}-21780ecad995?w=1200&h=600&fit=crop`,
    logo: `https://api.dicebear.com/7.x/shapes/svg?seed=${template.name}`,
    category: template.category,
    tags: [template.category, "hackathon", "coding"],
    status: template.status,
    type: "online",
    registrationStart: subtractDays(30 + i * 10),
    registrationEnd: addDays(i * 5),
    hackingStart: addDays(i * 5 + 7),
    hackingEnd: addDays(i * 5 + 9),
    submissionDeadline: addDays(i * 5 + 9),
    judgingStart: addDays(i * 5 + 10),
    judgingEnd: addDays(i * 5 + 12),
    winnersAnnouncement: addDays(i * 5 + 14),
    tracks: createTracks().slice(0, 2),
    prizes: [
      { id: `hack${i}-prize-1`, name: "1st Place", place: 1, value: 5000, currency: "USD", type: "cash" },
      { id: `hack${i}-prize-2`, name: "2nd Place", place: 2, value: 3000, currency: "USD", type: "cash" },
      { id: `hack${i}-prize-3`, name: "3rd Place", place: 3, value: 1500, currency: "USD", type: "cash" },
    ],
    sponsors: mockSponsors.slice(i % 5, (i % 5) + 3),
    mentors: [],
    judges: mockUsers.slice(i % 3, (i % 3) + 3),
    judgingCriteria: createJudgingCriteria(),
    rules: "Standard hackathon rules apply.",
    eligibility: ["Open to all"],
    minTeamSize: 1,
    maxTeamSize: 4,
    allowSolo: true,
    organizer: mockUsers[i % 5],
    organizerId: mockUsers[i % 5].id,
    participantCount: 100 + (i * 47) % 400,
    teamCount: 30 + (i * 17) % 120,
    submissionCount: template.status === "completed" ? 20 + (i * 11) % 60 : 0,
    totalPrizePool: 10000,
    isFeatured: i % 3 === 0,
    createdAt: subtractDays(60 + i * 10),
    updatedAt: subtractDays(i),
  });
}

// =====================================================
// Mock Teams
// =====================================================
export const mockTeams: Team[] = [
  {
    id: "team-1",
    name: "AI Pioneers",
    description: "Building the next generation of AI-powered productivity tools.",
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=aipioneers",
    hackathonId: "hack-1",
    track: createTracks()[0],
    members: [
      { id: "tm-1", user: mockUsers[0], role: "Full Stack Developer", isLeader: true, joinedAt: subtractDays(10) },
      { id: "tm-2", user: mockUsers[1], role: "UI/UX Designer", isLeader: false, joinedAt: subtractDays(9) },
      { id: "tm-3", user: mockUsers[4], role: "ML Engineer", isLeader: false, joinedAt: subtractDays(8) },
    ],
    lookingForRoles: ["Backend Developer"],
    maxSize: 4,
    status: "forming",
    createdAt: subtractDays(10),
    updatedAt: subtractDays(1),
  },
  {
    id: "team-2",
    name: "Web3 Wizards",
    description: "Decentralizing everything, one smart contract at a time.",
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=web3wizards",
    hackathonId: "hack-2",
    track: createTracks()[1],
    members: [
      { id: "tm-4", user: mockUsers[3], role: "Smart Contract Dev", isLeader: true, joinedAt: subtractDays(15) },
      { id: "tm-5", user: mockUsers[2], role: "Frontend Developer", isLeader: false, joinedAt: subtractDays(14) },
    ],
    maxSize: 5,
    status: "complete",
    createdAt: subtractDays(15),
    updatedAt: subtractDays(2),
  },
];

// Generate more teams
for (let i = 3; i <= 15; i++) {
  const teamNames = [
    "Code Crusaders", "Byte Builders", "Hack Heroes", "Digital Dragons",
    "Tech Titans", "Innovation Inc", "Future Founders", "Debug Squad",
    "Algorithm Aces", "Stack Overflow", "Git Gurus", "Cloud Chasers",
    "API Avengers",
  ];

  mockTeams.push({
    id: `team-${i}`,
    name: teamNames[(i - 3) % teamNames.length],
    description: `Team ${teamNames[(i - 3) % teamNames.length]} ready to build something amazing!`,
    avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=team${i}`,
    hackathonId: `hack-${(i % 3) + 1}`,
    members: [
      { id: `tm-${i}-1`, user: mockUsers[(i * 2) % 50], role: "Developer", isLeader: true, joinedAt: subtractDays(i) },
      { id: `tm-${i}-2`, user: mockUsers[(i * 2 + 1) % 50], role: "Developer", isLeader: false, joinedAt: subtractDays(i - 1) },
    ],
    maxSize: 4,
    status: ["forming", "complete", "submitted"][i % 3] as Team["status"],
    createdAt: subtractDays(i * 2),
    updatedAt: subtractDays(i % 5),
  });
}

// =====================================================
// Mock Submissions
// =====================================================
export const mockSubmissions: Submission[] = [
  {
    id: "sub-1",
    hackathonId: "hack-3",
    teamId: "team-1",
    team: mockTeams[0],
    track: createTracks()[0],
    projectName: "EcoTrack AI",
    tagline: "AI-powered carbon footprint tracking for everyday life",
    description: `EcoTrack AI uses machine learning to automatically track and reduce your carbon footprint. Simply connect your daily activities and let our AI suggest personalized ways to live more sustainably.

## Features

- **Automatic Tracking** - Connect your apps and services for seamless tracking
- **AI Insights** - Get personalized recommendations based on your habits
- **Community Challenges** - Compete with friends to reduce emissions
- **Impact Dashboard** - Visualize your environmental impact over time

Built with React Native, TensorFlow, and lots of love for the planet.`,
    coverImage: "https://images.unsplash.com/photo-1569163139599-0f4517e36f31?w=800&h=400&fit=crop",
    screenshots: [
      "https://images.unsplash.com/photo-1569163139599-0f4517e36f31?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1569163139599-0f4517e36f31?w=400&h=300&fit=crop",
    ],
    githubUrl: "https://github.com/team/ecotrack-ai",
    demoUrl: "https://ecotrack-ai.demo.com",
    techStack: ["React Native", "TensorFlow", "Python", "Firebase", "Node.js"],
    status: "winner",
    scores: [],
    averageScore: 8.7,
    rank: 1,
    upvotes: 234,
    submittedAt: subtractDays(48),
    createdAt: subtractDays(50),
    updatedAt: subtractDays(35),
  },
  {
    id: "sub-2",
    hackathonId: "hack-3",
    teamId: "team-2",
    team: mockTeams[1],
    track: createTracks()[1],
    projectName: "GreenChain",
    tagline: "Blockchain-verified carbon credits marketplace",
    description: `GreenChain is a decentralized marketplace for trading verified carbon credits. Using blockchain technology, we ensure transparent, tamper-proof tracking of carbon offset projects.

Every credit on GreenChain is verified through our network of environmental auditors and recorded on-chain for complete transparency.`,
    coverImage: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=400&fit=crop",
    screenshots: [],
    githubUrl: "https://github.com/team/greenchain",
    techStack: ["Solidity", "React", "IPFS", "The Graph", "Hardhat"],
    status: "scored",
    scores: [],
    averageScore: 8.2,
    rank: 2,
    upvotes: 187,
    submittedAt: subtractDays(48),
    createdAt: subtractDays(49),
    updatedAt: subtractDays(40),
  },
];

// Generate more submissions
for (let i = 3; i <= 30; i++) {
  const projectNames = [
    "SmartBudget", "HealthPal", "LearnFlow", "TaskMaster", "CodeReview AI",
    "FitTrack", "MindfulApp", "DevDocs", "TeamSync", "DataViz Pro",
    "ChatBot X", "PhotoEdit", "MusicMix", "GameHub", "ShopSmart",
    "NewsAggregator", "WeatherPlus", "TravelBuddy", "RecipeBook", "PetCare",
    "EventPlanner", "StudyBuddy", "FinanceTracker", "SocialConnect", "WorkoutPro",
    "MeditateNow", "LanguageLearn", "ArtGallery",
  ];

  mockSubmissions.push({
    id: `sub-${i}`,
    hackathonId: `hack-${(i % 3) + 1}`,
    teamId: `team-${i % 15 + 1}`,
    team: mockTeams[(i % 15)],
    track: createTracks()[i % 4],
    projectName: projectNames[(i - 3) % projectNames.length],
    tagline: `${projectNames[(i - 3) % projectNames.length]} - making life easier`,
    description: `An innovative project that showcases creativity and technical excellence.`,
    coverImage: `https://images.unsplash.com/photo-${1569163139599 + i * 100}-0f4517e36f31?w=800&h=400&fit=crop`,
    screenshots: [],
    githubUrl: `https://github.com/team/${projectNames[(i - 3) % projectNames.length].toLowerCase()}`,
    techStack: ["React", "Node.js", "PostgreSQL"],
    status: ["submitted", "under-review", "scored"][i % 3] as Submission["status"],
    scores: [],
    upvotes: 10 + (i * 23) % 140,
    submittedAt: subtractDays(i + 30),
    createdAt: subtractDays(i + 35),
    updatedAt: subtractDays(i + 25),
  });
}

// =====================================================
// Mock Notifications
// =====================================================
export const mockNotifications: Notification[] = [
  {
    id: "notif-1",
    type: "hackathon-update",
    title: "BuildAI 2024 Registration Open",
    message: "Registration is now open for BuildAI 2024! Sign up early for the best swag.",
    link: "/hackathons/buildai-2024",
    isRead: false,
    createdAt: subtractDays(1),
  },
  {
    id: "notif-2",
    type: "team-invite",
    title: "Team Invite from AI Pioneers",
    message: "Alex Chen has invited you to join the team 'AI Pioneers' for BuildAI 2024.",
    link: "/dashboard/team/team-1",
    isRead: false,
    createdAt: subtractDays(2),
  },
  {
    id: "notif-3",
    type: "event-reminder",
    title: "React Meetup Tomorrow",
    message: "Don't forget! React Developers Meetup starts tomorrow at 6:00 PM.",
    link: "/events/react-meetup-sf",
    isRead: true,
    createdAt: subtractDays(3),
  },
  {
    id: "notif-4",
    type: "submission-feedback",
    title: "Feedback on EcoTrack AI",
    message: "A judge has left feedback on your Climate Hack submission.",
    link: "/dashboard/submissions/sub-1",
    isRead: true,
    createdAt: subtractDays(35),
  },
  {
    id: "notif-5",
    type: "winner-announcement",
    title: "Congratulations! You Won!",
    message: "Your team won 1st place at Climate Hack 2024!",
    link: "/hackathons/climate-hack",
    isRead: true,
    createdAt: subtractDays(35),
  },
];

// Generate more notifications
for (let i = 6; i <= 20; i++) {
  mockNotifications.push({
    id: `notif-${i}`,
    type: ["event-reminder", "hackathon-update", "team-message", "system"][i % 4] as Notification["type"],
    title: `Notification ${i}`,
    message: `This is notification message number ${i}.`,
    isRead: i > 10,
    createdAt: subtractDays(i),
  });
}

// =====================================================
// Mock Blog Posts
// =====================================================
export const mockBlogPosts: BlogPost[] = [
  {
    id: "blog-1",
    slug: "10-tips-for-winning-hackathons",
    title: "10 Tips for Winning Your Next Hackathon",
    excerpt: "Learn from past winners about what it takes to stand out and win at hackathons.",
    content: `# 10 Tips for Winning Your Next Hackathon

Winning a hackathon isn't just about coding skills—it's about strategy, teamwork, and presentation. Here are 10 tips from past winners...

## 1. Start with the Problem

Don't jump into coding immediately. Spend time understanding the problem and your users.

## 2. Build a MVP

Focus on core functionality. A working demo beats a half-finished ambitious project.

## 3. Practice Your Pitch

Your demo is crucial. Practice it multiple times before presenting.

...`,
    coverImage: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&h=600&fit=crop",
    author: mockUsers[2],
    category: "Tips",
    tags: ["hackathon", "tips", "winning"],
    readTime: 8,
    publishedAt: subtractDays(10),
    createdAt: subtractDays(15),
  },
  {
    id: "blog-2",
    slug: "the-rise-of-ai-hackathons",
    title: "The Rise of AI Hackathons in 2024",
    excerpt: "AI-focused hackathons have exploded in popularity. Here's why and what's next.",
    content: `# The Rise of AI Hackathons

2024 has been the year of AI hackathons. With tools like ChatGPT, Claude, and open-source models becoming more accessible, builders are creating amazing AI-powered applications in just 48 hours...`,
    coverImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=600&fit=crop",
    author: mockUsers[0],
    category: "Trends",
    tags: ["AI", "hackathon", "trends", "2024"],
    readTime: 6,
    publishedAt: subtractDays(5),
    createdAt: subtractDays(7),
  },
  {
    id: "blog-3",
    slug: "building-winning-teams",
    title: "Building Winning Hackathon Teams",
    excerpt: "The secret to hackathon success often lies in team composition. Learn how to build the perfect team.",
    content: `# Building Winning Hackathon Teams

A great idea with a mediocre team will lose to a good idea with a great team. Here's how to build a team that can execute under pressure...`,
    coverImage: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=600&fit=crop",
    author: mockUsers[1],
    category: "Teams",
    tags: ["teams", "collaboration", "hackathon"],
    readTime: 5,
    publishedAt: subtractDays(20),
    createdAt: subtractDays(22),
  },
];

// Generate more blog posts
for (let i = 4; i <= 10; i++) {
  const titles = [
    "How to Choose the Right Hackathon",
    "Post-Hackathon: What's Next?",
    "Sponsor Spotlight: TechGiant",
    "Community Stories: From Hackathon to Startup",
    "The Future of Virtual Hackathons",
    "Design Tips for Hackathon Projects",
    "API Integration Best Practices",
  ];

  mockBlogPosts.push({
    id: `blog-${i}`,
    slug: titles[(i - 4) % titles.length].toLowerCase().replace(/\s+/g, "-"),
    title: titles[(i - 4) % titles.length],
    excerpt: `Learn about ${titles[(i - 4) % titles.length].toLowerCase()} in this comprehensive guide.`,
    content: `# ${titles[(i - 4) % titles.length]}\n\nContent coming soon...`,
    coverImage: `https://images.unsplash.com/photo-${1504384308090 + i * 100000}-c894fdcc538d?w=1200&h=600&fit=crop`,
    author: mockUsers[i % 5],
    category: ["Tips", "Trends", "Stories", "Guides"][i % 4],
    tags: ["hackathon", "guide"],
    readTime: 3 + (i * 2) % 10,
    publishedAt: subtractDays(i * 5),
    createdAt: subtractDays(i * 5 + 2),
  });
}

// =====================================================
// Mock Pricing Tiers
// =====================================================
export const mockPricingTiers: PricingTier[] = [
  {
    id: "tier-free",
    name: "Free",
    price: 0,
    currency: "USD",
    interval: "monthly",
    features: [
      "Host 1 event per month",
      "Up to 50 attendees",
      "Basic event page",
      "Email notifications",
      "Community support",
    ],
    limits: {
      eventsPerMonth: 1,
      attendeesPerEvent: 50,
      customBranding: false,
      analytics: false,
      apiAccess: false,
      prioritySupport: false,
    },
    isPopular: false,
  },
  {
    id: "tier-pro",
    name: "Pro",
    price: 29,
    currency: "USD",
    interval: "monthly",
    features: [
      "Unlimited events",
      "Up to 500 attendees per event",
      "Custom branding",
      "Advanced analytics",
      "Priority email support",
      "Custom registration forms",
      "Promo codes & discounts",
      "Attendee management tools",
    ],
    limits: {
      eventsPerMonth: -1,
      attendeesPerEvent: 500,
      customBranding: true,
      analytics: true,
      apiAccess: false,
      prioritySupport: true,
    },
    isPopular: true,
  },
  {
    id: "tier-enterprise",
    name: "Enterprise",
    price: 99,
    currency: "USD",
    interval: "monthly",
    features: [
      "Everything in Pro",
      "Unlimited attendees",
      "API access",
      "SSO integration",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "White-label options",
      "Advanced security features",
    ],
    limits: {
      eventsPerMonth: -1,
      attendeesPerEvent: -1,
      customBranding: true,
      analytics: true,
      apiAccess: true,
      prioritySupport: true,
    },
    isPopular: false,
  },
];

// =====================================================
// Mock Communities
// =====================================================
export const mockCommunities: Community[] = [
  {
    id: "community-1",
    slug: "sf-tech-community",
    name: "SF Tech Community",
    description: "The largest tech community in San Francisco. Weekly events, networking, and learning.",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=sftech",
    coverImage: "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=1200&h=400&fit=crop",
    website: "https://sftechcommunity.com",
    memberCount: 5420,
    eventCount: 156,
    organizer: mockUsers[0],
    createdAt: subtractDays(365),
  },
  {
    id: "community-2",
    slug: "ai-builders",
    name: "AI Builders",
    description: "A community of AI enthusiasts building the future together.",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=aibuilders",
    memberCount: 3200,
    eventCount: 89,
    organizer: mockUsers[2],
    createdAt: subtractDays(200),
  },
  {
    id: "community-3",
    slug: "design-collective",
    name: "Design Collective",
    description: "Designers helping designers. Critiques, workshops, and portfolio reviews.",
    logo: "https://api.dicebear.com/7.x/shapes/svg?seed=designcollective",
    memberCount: 2100,
    eventCount: 67,
    organizer: mockUsers[1],
    createdAt: subtractDays(180),
  },
];

// =====================================================
// Categories & Tags
// =====================================================
export const categories = [
  { value: "tech", label: "Technology", icon: "laptop" },
  { value: "ai-ml", label: "AI / Machine Learning", icon: "brain" },
  { value: "web3", label: "Web3 / Blockchain", icon: "link" },
  { value: "design", label: "Design", icon: "palette" },
  { value: "business", label: "Business", icon: "briefcase" },
  { value: "health", label: "Health", icon: "heart" },
  { value: "music", label: "Music", icon: "music" },
  { value: "social", label: "Social", icon: "users" },
  { value: "workshop", label: "Workshop", icon: "wrench" },
  { value: "conference", label: "Conference", icon: "mic" },
  { value: "meetup", label: "Meetup", icon: "coffee" },
  { value: "networking", label: "Networking", icon: "globe" },
];

export const popularTags = [
  "React", "TypeScript", "Node.js", "Python", "AI", "Machine Learning",
  "Web3", "Blockchain", "Ethereum", "Design", "UX", "Startup",
  "DevOps", "Cloud", "AWS", "Kubernetes", "Docker", "GraphQL",
  "Next.js", "TensorFlow", "OpenAI", "LLM", "NLP", "Computer Vision",
];

// =====================================================
// Helper function to get featured content
// =====================================================
export const getFeaturedEvents = () => mockEvents.filter(e => e.isFeatured).slice(0, 4);
export const getFeaturedHackathons = () => mockHackathons.filter(h => h.isFeatured).slice(0, 3);
export const getUpcomingEvents = () => mockEvents.filter(e => new Date(e.startDate) > new Date()).slice(0, 6);
export const getActiveHackathons = () => mockHackathons.filter(h => h.status !== "completed").slice(0, 4);
export const getRecentSubmissions = () => mockSubmissions.slice(0, 8);
export const getTopSponsors = () => mockSponsors.filter(s => s.tier === "platinum" || s.tier === "gold");

// =====================================================
// Mock Certificates
// =====================================================
export const mockCertificates: Certificate[] = [
  {
    id: "cert-1",
    userId: "user-1",
    hackathonId: "hack-3",
    type: "winner",
    title: "1st Place — Climate Hack 2024",
    description: "Awarded for winning 1st place with the EcoTrack AI project at Climate Hack 2024.",
    issuedAt: subtractDays(35),
    verificationCode: "CH24-WIN-001",
  },
  {
    id: "cert-2",
    userId: "user-1",
    hackathonId: "hack-1",
    type: "participation",
    title: "BuildAI 2024 Participant",
    description: "Certificate of participation in BuildAI 2024 hackathon.",
    issuedAt: subtractDays(10),
    verificationCode: "BA24-PAR-047",
  },
  {
    id: "cert-3",
    userId: "user-1",
    eventId: "event-1",
    type: "participation",
    title: "AI Summit 2024 Attendee",
    description: "Attended the AI Summit 2024 conference in San Francisco.",
    issuedAt: subtractDays(60),
    verificationCode: "AIS24-ATT-123",
  },
  {
    id: "cert-4",
    userId: "user-2",
    hackathonId: "hack-3",
    type: "mentor",
    title: "Climate Hack 2024 Mentor",
    description: "Recognized for mentoring participants at Climate Hack 2024.",
    issuedAt: subtractDays(35),
    verificationCode: "CH24-MEN-008",
  },
  {
    id: "cert-5",
    userId: "user-3",
    hackathonId: "hack-3",
    type: "judge",
    title: "Climate Hack 2024 Judge",
    description: "Served as a judge for the Climate Hack 2024 hackathon.",
    issuedAt: subtractDays(35),
    verificationCode: "CH24-JDG-003",
  },
  {
    id: "cert-6",
    userId: "user-1",
    hackathonId: "hack-2",
    type: "participation",
    title: "ETHGlobal SF Participant",
    description: "Certificate of participation in ETHGlobal San Francisco hackathon.",
    issuedAt: subtractDays(5),
    verificationCode: "ETH24-PAR-234",
  },
  {
    id: "cert-7",
    userId: "user-3",
    hackathonId: "hack-1",
    type: "organizer",
    title: "BuildAI 2024 Organizer",
    description: "Lead organizer of the BuildAI 2024 hackathon.",
    issuedAt: subtractDays(1),
    verificationCode: "BA24-ORG-001",
  },
  {
    id: "cert-8",
    userId: "user-4",
    hackathonId: "hack-2",
    type: "winner",
    title: "2nd Place — ETHGlobal SF",
    description: "Awarded 2nd place at ETHGlobal San Francisco with the GreenChain project.",
    issuedAt: subtractDays(3),
    verificationCode: "ETH24-WIN-002",
  },
];

// =====================================================
// Mock Conversations & Messages
// =====================================================
export const mockMessages: Message[] = [
  // Conversation 1 — Alex & Sarah
  { id: "msg-1", conversationId: "conv-1", senderId: "user-1", sender: mockUsers[0], content: "Hey Sarah! Are you joining BuildAI 2024? We need a designer on our team.", isRead: true, createdAt: subtractDays(3) + "T10:00:00" },
  { id: "msg-2", conversationId: "conv-1", senderId: "user-2", sender: mockUsers[1], content: "Hi Alex! Yes, I'm definitely interested. What track are you targeting?", isRead: true, createdAt: subtractDays(3) + "T10:15:00" },
  { id: "msg-3", conversationId: "conv-1", senderId: "user-1", sender: mockUsers[0], content: "AI/ML Innovation track. We have a great idea for an AI-powered productivity tool.", isRead: true, createdAt: subtractDays(3) + "T10:20:00" },
  { id: "msg-4", conversationId: "conv-1", senderId: "user-2", sender: mockUsers[1], content: "That sounds awesome! I'd love to handle the design and UX.", isRead: true, createdAt: subtractDays(3) + "T10:25:00" },
  { id: "msg-5", conversationId: "conv-1", senderId: "user-1", sender: mockUsers[0], content: "Perfect! I'll send you the team invite. Welcome aboard! 🎉", isRead: false, createdAt: subtractDays(2) + "T09:00:00" },
  // Conversation 2 — Alex & Marcus
  { id: "msg-6", conversationId: "conv-2", senderId: "user-3", sender: mockUsers[2], content: "Hey Alex, just reviewed your Climate Hack submission. Amazing work on EcoTrack AI!", isRead: true, createdAt: subtractDays(40) + "T14:00:00" },
  { id: "msg-7", conversationId: "conv-2", senderId: "user-1", sender: mockUsers[0], content: "Thanks Marcus! Your feedback during mentoring really helped us refine the ML model.", isRead: true, createdAt: subtractDays(40) + "T14:30:00" },
  { id: "msg-8", conversationId: "conv-2", senderId: "user-3", sender: mockUsers[2], content: "Happy to help! Have you thought about turning it into a real product? I know some investors who might be interested.", isRead: true, createdAt: subtractDays(39) + "T10:00:00" },
  { id: "msg-9", conversationId: "conv-2", senderId: "user-1", sender: mockUsers[0], content: "Absolutely! We've been discussing that as a team. Would love an intro.", isRead: true, createdAt: subtractDays(39) + "T11:00:00" },
  { id: "msg-10", conversationId: "conv-2", senderId: "user-3", sender: mockUsers[2], content: "I'll set up a meeting next week. Let me know your availability.", isRead: false, createdAt: subtractDays(1) + "T16:00:00" },
  // Conversation 3 — Alex & Emma
  { id: "msg-11", conversationId: "conv-3", senderId: "user-4", sender: mockUsers[3], content: "Hey! Are you coming to ETHGlobal SF? I heard you're interested in Web3.", isRead: true, createdAt: subtractDays(10) + "T09:00:00" },
  { id: "msg-12", conversationId: "conv-3", senderId: "user-1", sender: mockUsers[0], content: "Hi Emma! Yes, I registered yesterday. Still looking for a team though.", isRead: true, createdAt: subtractDays(10) + "T09:30:00" },
  { id: "msg-13", conversationId: "conv-3", senderId: "user-4", sender: mockUsers[3], content: "We could team up! I'm working on a DeFi project and need a frontend dev.", isRead: true, createdAt: subtractDays(10) + "T09:45:00" },
  { id: "msg-14", conversationId: "conv-3", senderId: "user-1", sender: mockUsers[0], content: "Sounds great! Let's chat more about it over coffee before the event.", isRead: true, createdAt: subtractDays(10) + "T10:00:00" },
  // Conversation 4 — Alex & David
  { id: "msg-15", conversationId: "conv-4", senderId: "user-5", sender: mockUsers[4], content: "Alex, can you help me set up the CI/CD pipeline for our hackathon project?", isRead: true, createdAt: subtractDays(5) + "T13:00:00" },
  { id: "msg-16", conversationId: "conv-4", senderId: "user-1", sender: mockUsers[0], content: "Sure David! I'll push the GitHub Actions config tonight.", isRead: true, createdAt: subtractDays(5) + "T13:30:00" },
  { id: "msg-17", conversationId: "conv-4", senderId: "user-5", sender: mockUsers[4], content: "Thanks! Also, do we need to containerize the ML model or can we use serverless?", isRead: true, createdAt: subtractDays(5) + "T14:00:00" },
  { id: "msg-18", conversationId: "conv-4", senderId: "user-1", sender: mockUsers[0], content: "Let's go with serverless for the hackathon. Faster to deploy and cheaper.", isRead: true, createdAt: subtractDays(5) + "T14:15:00" },
  { id: "msg-19", conversationId: "conv-4", senderId: "user-5", sender: mockUsers[4], content: "Good call. I'll set up the Lambda functions.", isRead: false, createdAt: subtractDays(4) + "T09:00:00" },
  // Conversation 5 — Alex & James (user-6)
  { id: "msg-20", conversationId: "conv-5", senderId: "user-6", sender: mockUsers[5], content: "Hi Alex! I saw your profile and I'm impressed by your hackathon record. Any tips for a first-timer?", isRead: true, createdAt: subtractDays(7) + "T11:00:00" },
  { id: "msg-21", conversationId: "conv-5", senderId: "user-1", sender: mockUsers[0], content: "Hey James! My biggest tip: focus on a working demo over a perfect codebase. Judges want to see impact.", isRead: true, createdAt: subtractDays(7) + "T11:30:00" },
  { id: "msg-22", conversationId: "conv-5", senderId: "user-6", sender: mockUsers[5], content: "That makes sense. Should I go solo or find a team?", isRead: true, createdAt: subtractDays(7) + "T12:00:00" },
  { id: "msg-23", conversationId: "conv-5", senderId: "user-1", sender: mockUsers[0], content: "Definitely find a team! Diverse skills win hackathons. Check the Teams page to find open teams.", isRead: true, createdAt: subtractDays(7) + "T12:15:00" },
];

export const mockConversations: Conversation[] = [
  {
    id: "conv-1",
    participants: [mockUsers[0], mockUsers[1]],
    lastMessage: mockMessages[4],
    unreadCount: 1,
    updatedAt: subtractDays(2) + "T09:00:00",
  },
  {
    id: "conv-2",
    participants: [mockUsers[0], mockUsers[2]],
    lastMessage: mockMessages[9],
    unreadCount: 1,
    updatedAt: subtractDays(1) + "T16:00:00",
  },
  {
    id: "conv-3",
    participants: [mockUsers[0], mockUsers[3]],
    lastMessage: mockMessages[13],
    unreadCount: 0,
    updatedAt: subtractDays(10) + "T10:00:00",
  },
  {
    id: "conv-4",
    participants: [mockUsers[0], mockUsers[4]],
    lastMessage: mockMessages[18],
    unreadCount: 1,
    updatedAt: subtractDays(4) + "T09:00:00",
  },
  {
    id: "conv-5",
    participants: [mockUsers[0], mockUsers[5]],
    lastMessage: mockMessages[23],
    unreadCount: 0,
    updatedAt: subtractDays(7) + "T12:15:00",
  },
];

// =====================================================
// Additional Helpers
// =====================================================
export const getCertificatesForUser = (userId: string) =>
  mockCertificates.filter((c) => c.userId === userId);

export const getConversationsForUser = (_userId: string) =>
  mockConversations;

export const getMessagesForConversation = (conversationId: string) =>
  mockMessages.filter((m) => m.conversationId === conversationId);

export const getBookmarkedEvents = () =>
  mockEvents.filter((e) => e.isBookmarked);

export const getBookmarkedHackathons = () =>
  mockHackathons.filter((h) => h.isBookmarked);

export const getSubmissionsForUser = (_userId: string) =>
  mockSubmissions.filter((_, i) => i < 5);

export const getTeamsForUser = (_userId: string) =>
  mockTeams.filter((_, i) => i < 4);
